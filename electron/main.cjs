const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const {TexService}=require('./tex-service.cjs');
const {templateFiles,prepareTemplate}=require('./native-templates.cjs');
let win,service,library,core,latex,saveQueue=Promise.resolve(),allowClose=false;
if(process.env.TEXSUITE_TEST_DATA)app.setPath('userData',path.resolve(process.env.TEXSUITE_TEST_DATA));
const safeName=s=>String(s||'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,100);
const projectPath=id=>{
  if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new Error('Invalid project ID.');
  return path.join(library,`${id}.texsuite`);
};
const checkSender=e=>{
  const url=e.senderFrame?.url||'';
  if(!(url.startsWith(pathToFileURL(path.join(__dirname,'../dist/index.html')).href)||(process.env.TEXSUITE_DEV==='1'&&url.startsWith('http://127.0.0.1:5173/'))))throw new Error('Untrusted window.');
};
function handle(channel, fn) {ipcMain.handle(channel,async(e,...args)=>{checkSender(e);return fn(...args);});}
async function writeAssets(project,dir) {
  await fs.mkdir(path.join(dir,'assets'),{recursive:true});
  for(const a of latex.extractAssets(project)) await fs.writeFile(path.join(dir,'assets',a.name),Buffer.from(a.data,'base64'));
}
app.whenReady().then(async()=>{
  core=await import(pathToFileURL(path.join(__dirname,'../src/core/model.mjs')).href);
  latex=await import(pathToFileURL(path.join(__dirname,'../src/core/latex.mjs')).href);
  library=path.join(app.getPath('userData'),'projects');await fs.mkdir(library,{recursive:true});
  service=new TexService(app.getPath('userData'));
  win=new BrowserWindow({width:1500,height:980,minWidth:1050,minHeight:700,backgroundColor:'#F5F4F0',title:'TeX Suite',show:false,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.on('close',event=>{
    if(allowClose||win.webContents.isDestroyed())return;
    event.preventDefault();
    win.webContents.send('progress',{action:'close'});
  });
  win.webContents.on('will-navigate',(e,url)=>{if(url!==win.webContents.getURL())e.preventDefault();});
  service.on('progress',p=>{if(!win.isDestroyed())win.webContents.send('progress',p);});
  handle('system',()=>({platform:process.platform,version:app.getVersion(),appData:app.getPath('userData'),editor:process.argv.includes('--beamer')?'beamer':process.argv.includes('--manuscript')?'manuscript':null}));
  handle('compiler:detect',()=>{service.cancelled=false;return service.detect();});
  handle('compiler:install',()=>service.install());
  handle('extensions:list',check=>service.extensions(check === true));
  handle('extensions:install',id=>service.installExtension(id));
  handle('template:prepare',id=>prepareTemplate(id,app.getPath('userData'),m=>service.progress(m)));
  handle('template:export',async id=>{
    const item=await prepareTemplate(id,app.getPath('userData'),m=>service.progress(m));
    if(!item.archive)return null;
    const r=await dialog.showSaveDialog(win,{defaultPath:`${safeName(item.name)}-official-template.zip`,filters:[{name:'Original template archive',extensions:['zip']}]});
    if(r.canceled)return null;
    await fs.copyFile(item.archive,r.filePath);return r.filePath;
  });
  handle('cancel',()=>service.cancel());
  handle('reference:open',async id=>{
    const {publishers,universities}=await import(pathToFileURL(path.join(__dirname,'../src/core/catalog.mjs')).href);
    const item=[...publishers,...universities].find(p=>p.id===id);
    if(!item)throw new Error('Unknown template reference.');
    await shell.openExternal(item.url);
  });
  handle('app:close-ready',()=>{allowClose=true;win.close();});
  handle('library:list',async()=>{
    const names=await fs.readdir(library);
    const values=await Promise.all(names.filter(n=>n.endsWith('.texsuite')).map(async n=>{try{return core.validateProject(JSON.parse(await fs.readFile(path.join(library,n),'utf8')));}catch{return null;}}));
    return values.filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt);
  });
  handle('library:save',async value=>{
    const project=core.validateProject(value),dest=projectPath(project.id),tmp=dest+'.tmp';
    const operation=saveQueue.catch(()=>{}).then(async()=>{await fs.writeFile(tmp,JSON.stringify(project),'utf8');await fs.rename(tmp,dest);return {saved:true};});
    saveQueue=operation;return operation;
  });
  handle('project:location',id=>projectPath(id));
  handle('project:reveal',async id=>{
    const file=projectPath(id);
    await fs.access(file);
    shell.showItemInFolder(file);
    return file;
  });
  handle('project:open',async()=>{
    const r=await dialog.showOpenDialog(win,{title:'Open a project',filters:[{name:'TeX Suite project',extensions:['texsuite']},{name:'LaTeX source',extensions:['tex']}],properties:['openFile']});
    if(r.canceled)return null;
    const file=r.filePaths[0];
    if((await fs.stat(file)).size>70_000_000)throw new Error('This file exceeds the 70 MB project limit.');
    const data=await fs.readFile(file,'utf8');
    if(file.endsWith('.texsuite'))return core.validateProject(JSON.parse(data));
    const p=core.createProject(/\\documentclass.*beamer/.test(data)?'beamer':'manuscript');
    p.title=path.basename(file,'.tex');p.sourceOverride=data;p.pages=[{...p.pages[0],title:'Imported LaTeX'}];return p;
  });
  handle('project:export',async value=>{
    const project=core.validateProject(value);
    const r=await dialog.showSaveDialog(win,{defaultPath:`${safeName(project.title)}.texsuite`,filters:[{name:'TeX Suite project',extensions:['texsuite']}]});
    if(r.canceled)return null;await fs.writeFile(r.filePath,JSON.stringify(project,null,2));return r.filePath;
  });
  handle('tex:export',async(value,source)=>{
    const project=core.validateProject(value);
    if(typeof source!=='string'||source.length>2_000_000)throw new Error('Invalid source.');
    const r=await dialog.showSaveDialog(win,{defaultPath:`${safeName(project.title)}.tex`,filters:[{name:'LaTeX source',extensions:['tex']}]});
    if(r.canceled)return null;
    const files=await templateFiles(project,app.getPath('userData'),m=>service.progress(m));
    for(const file of files){const dest=path.join(path.dirname(r.filePath),file.name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,file.data);}
    await writeAssets(project,path.dirname(r.filePath));await fs.writeFile(r.filePath,source);return r.filePath;
  });
  handle('compile',async(value,source)=>{
    const project=core.validateProject(value);
    try{
      const files=await templateFiles(project,app.getPath('userData'),m=>service.progress(m));
      return await service.compile(source,latex.extractAssets(project),{engine:project.flow||project.nativeTheme==='saintpetersburg'?'pdflatex':project.nativeTheme==='tudarmstadt'?'lualatex':'xelatex',files});
    }catch(e){return {ok:false,message:e.message,log:`Template preparation failed: ${e.message}`};}
  });
  handle('pdf:export',async()=>{
    if(!service.lastPdf)throw new Error('Compile the document before exporting a PDF.');
    const r=await dialog.showSaveDialog(win,{defaultPath:'Document.pdf',filters:[{name:'PDF',extensions:['pdf']}]});
    if(r.canceled)return null;await fs.writeFile(r.filePath,service.lastPdf.data);return r.filePath;
  });
  handle('word:export',async(name,data)=>{
    if(!(data instanceof Uint8Array)||data.length>70000000||data[0]!==80||data[1]!==75)throw new Error('Invalid Word document.');
    const r=await dialog.showSaveDialog(win,{defaultPath:`${safeName(name)}.docx`,filters:[{name:'Word document',extensions:['docx']}]});
    if(r.canceled)return null;await fs.writeFile(r.filePath,data);return r.filePath;
  });
  const template=[{label:'File',submenu:[{label:'Open project…',accelerator:'CmdOrCtrl+O',click:()=>win.webContents.send('progress',{action:'open'})},{label:'Save project',accelerator:'CmdOrCtrl+S',click:()=>win.webContents.send('progress',{action:'save'})},{type:'separator'}, {role:process.platform==='darwin'?'close':'quit'}]},
    {role:'editMenu'},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'},...(app.isPackaged?[]:[{role:'toggleDevTools'}])]}];
  if(process.platform==='darwin')template.unshift({role:'appMenu'});
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  win.once('ready-to-show',()=>win.show());
  if(process.env.TEXSUITE_DEV==='1')await win.loadURL('http://127.0.0.1:5173');
  else await win.loadFile(path.join(__dirname,'../dist/index.html'));
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(win&&!win.isDestroyed())win.show();else app.relaunch(),app.exit(0);});
app.on('before-quit',()=>service?.cancel());

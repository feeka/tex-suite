const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel, ...args) => ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('texSuite',{
  platform:process.platform,
  system:()=>invoke('system'),
  detectCompiler:()=>invoke('compiler:detect'),
  installCompiler:()=>invoke('compiler:install'),
  extensions:(check=false)=>invoke('extensions:list',check),
  installExtension:id=>invoke('extensions:install',id),
  prepareTemplate:id=>invoke('template:prepare',id),
  exportTemplate:id=>invoke('template:export',id),
  compile:(project,source)=>invoke('compile',project,source),
  cancel:()=>invoke('cancel'),
  closeReady:()=>invoke('app:close-ready'),
  library:()=>invoke('library:list'),
  saveProject:project=>invoke('library:save',project),
  projectLocation:id=>invoke('project:location',id),
  revealProject:id=>invoke('project:reveal',id),
  openProject:()=>invoke('project:open'),
  openReference:id=>invoke('reference:open',id),
  exportProject:project=>invoke('project:export',project),
  exportTex:(project,source)=>invoke('tex:export',project,source),
  exportPdf:()=>invoke('pdf:export'),
  exportWord:(name,data)=>invoke('word:export',name,data),
  onProgress:callback=>{
    const handler=(_event,data)=>callback(data);ipcRenderer.on('progress',handler);
    return ()=>ipcRenderer.removeListener('progress',handler);
  },
});

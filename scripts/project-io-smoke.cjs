const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');

(async()=>{
  const root=path.resolve(`.cache/project-io-${Date.now()}`);
  await fs.mkdir(root,{recursive:true});
  const env={...process.env,TEXSUITE_TEST_DATA:root};
  delete env.ELECTRON_RUN_AS_NODE;
  const launch=process.env.TEXSUITE_PACKAGED
    ?{executablePath:path.resolve(process.env.TEXSUITE_PACKAGED),args:[],env}
    :{args:['.'],env};
  const app=await electron.launch(launch);
  try{
    const page=await app.firstWindow(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await expect(page.locator('.compiler-status')).toContainText('LaTeX is ready',{timeout:30000});
    await page.locator('.create-card').filter({hasText:'texBeamer'}).click();
    const title=`IO proof ${Date.now()}`;
    await page.getByRole('textbox',{name:'Document title',exact:true}).fill(title);
    await page.getByRole('button',{name:'Select slide 2'}).click();
    await page.getByRole('button',{name:'∑ Formula'}).click();
    await page.getByLabel('Formula LaTeX').fill('F=ma');
    await page.getByLabel('Equation label').fill('eq:io');
    await expect.poll(async()=>JSON.stringify((await page.evaluate(()=>window.texSuite.library())).find(p=>p.title===title)||{}).includes('eq:io')).toBe(true);
    const projectPath=path.join(root,'roundtrip.texsuite');
    await app.evaluate(({dialog},dest)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:dest});},projectPath);
    await page.getByRole('button',{name:'Export',exact:true}).click();
    await page.getByRole('button',{name:/TeX Suite project/}).click();
    await expect.poll(async()=>fs.stat(projectPath).then(s=>s.size).catch(()=>0)).toBeGreaterThan(1000);
    const saved=JSON.parse(await fs.readFile(projectPath,'utf8'));
    if(saved.title!==title||!JSON.stringify(saved).includes('eq:io'))throw Error('Project export lost title or equation label');
    const texPath=path.join(root,'roundtrip.tex');
    await app.evaluate(({dialog},dest)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:dest});},texPath);
    await page.getByRole('button',{name:/LaTeX source/}).click();
    await expect.poll(async()=>fs.readFile(texPath,'utf8').then(t=>t.includes('\\label{eq:io}')).catch(()=>false)).toBe(true);
    await page.getByRole('button',{name:'Close dialog'}).click();
    await page.getByRole('button',{name:'Compile PDF',exact:true}).click();
    await expect(page.getByTitle('Compiled PDF')).toBeVisible({timeout:90000});
    const pdfPath=path.join(root,'roundtrip.pdf');
    await app.evaluate(({dialog},dest)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:dest});},pdfPath);
    await page.getByRole('button',{name:'Export',exact:true}).click();
    await page.getByRole('button',{name:/PDF document/}).click();
    await expect.poll(async()=>fs.stat(pdfPath).then(s=>s.size).catch(()=>0)).toBeGreaterThan(1000);
    await page.getByRole('button',{name:'Close dialog'}).click();
    await page.getByRole('button',{name:'TeX Suite home',exact:true}).click();
    await app.evaluate(({dialog},dest)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[dest]});},projectPath);
    await page.getByRole('button',{name:'Open a project'}).first().click();
    await expect(page.getByRole('textbox',{name:'Document title',exact:true})).toHaveValue(title);
    await page.getByRole('button',{name:'Select slide 2'}).click();
    await page.getByTestId('page-canvas').locator('.canvas-formula').click();
    await expect(page.getByLabel('Equation label')).toHaveValue('eq:io');
    await page.getByRole('button',{name:'TeX Suite home',exact:true}).click();
    await app.evaluate(({dialog},dest)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[dest]});},texPath);
    await page.getByRole('button',{name:'Open a project'}).first().click();
    const code=page.locator('.cm-content');
    await expect(code).toBeVisible();
    await expect.poll(async()=>{
      const projects=await page.evaluate(()=>window.texSuite.library());
      return projects.find(p=>p.title==='roundtrip')?.sourceOverride?.includes('\\label{eq:io}')||false;
    }).toBe(true);
    await page.getByRole('button',{name:'Compile PDF',exact:true}).click();
    await expect(page.getByTitle('Compiled PDF')).toBeVisible({timeout:90000});
    if(errors.length)throw Error(errors.join('\n'));
    console.log('PASS fresh project export/import, LaTeX export/import, label persistence, PDF export and imported-source compilation');
  }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

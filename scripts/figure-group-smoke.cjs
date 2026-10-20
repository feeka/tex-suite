const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');

(async()=>{
  const root=path.resolve('.cache/figure-group-smoke');await fs.mkdir(root,{recursive:true});
  const env={...process.env,TEXSUITE_TEST_DATA:root,TEXSUITE_XELATEX:'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe'};delete env.ELECTRON_RUN_AS_NODE;
  const launch=process.env.TEXSUITE_PACKAGED?{executablePath:path.resolve(process.env.TEXSUITE_PACKAGED),args:[],env}:{args:['.'],env};
  const app=await electron.launch(launch);
  try{
    const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await expect(page.locator('.compiler-status')).toContainText('LaTeX is ready',{timeout:30000});
    await page.locator('.create-card').filter({hasText:'texManuscript'}).click();
    const title=`Figure group smoke ${Date.now()}`;await page.getByLabel('Manuscript title').fill(title);
    await page.getByLabel('Publisher format').selectOption('springer');
    await expect(page.locator('.template-download')).toContainText('Original template downloaded',{timeout:90000});
    const images=await page.evaluate(()=>['#328bc6','#923b62','#408c6b'].map((color,index)=>{const c=document.createElement('canvas');c.width=600;c.height=360;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,600,360);g.fillStyle='white';g.font='bold 190px Arial';g.fillText(String.fromCharCode(65+index),230,250);return c.toDataURL('image/png').split(',')[1];}));
    const singleChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Image',exact:true}).click();await(await singleChooser).setFiles({name:'single.png',mimeType:'image/png',buffer:Buffer.from(images[0],'base64')});
    const single=page.locator('.manuscript-image');await expect(single).toBeVisible();
    await single.getByLabel('Image width').click();await single.getByLabel('Image width').press('ControlOrMeta+A');await single.getByLabel('Image width').pressSequentially('27');
    await expect.poll(async()=>single.evaluate(el=>el.getBoundingClientRect().width/el.parentElement.getBoundingClientRect().width)).toBeLessThan(.30);
    await single.getByLabel('Image wrapping').selectOption('left');await expect(single).toHaveCSS('float','left');
    await single.getByLabel('Image width').click();await single.getByLabel('Image width').press('ControlOrMeta+A');await single.getByLabel('Image width').pressSequentially('50');
    await expect.poll(async()=>single.evaluate(el=>el.getBoundingClientRect().width/el.parentElement.getBoundingClientRect().width)).toBeGreaterThan(.48);
    await expect.poll(async()=>(await page.evaluate(()=>window.texSuite.library())).some(p=>p.title===title&&p.flow.doc.content.some(n=>n.type==='image'&&n.attrs.width===330)),{timeout:10000}).toBe(true);
    const singleLibrary=await page.evaluate(()=>window.texSuite.library());
    const singleProject=singleLibrary.find(p=>p.title===title);
    if(!singleProject)throw Error(`Saved project was not found: ${title}; recent=${singleLibrary.slice(0,3).map(p=>p.title).join('|')}`);
    const savedSingle=singleProject.flow.doc.content.find(n=>n.type==='image');
    if(savedSingle?.attrs.width!==330||savedSingle.attrs.wrap!=='left')throw Error(`Single image manual width was not saved: ${JSON.stringify(savedSingle?.attrs)}`);
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Figure group',exact:true}).click();await(await chooser).setFiles(images.map((buffer,index)=>({name:`panel-${index+1}.png`,mimeType:'image/png',buffer:Buffer.from(buffer,'base64')})));
    const group=page.locator('.figure-group');await expect(group).toBeVisible();await expect(group.locator('.figure-panel')).toHaveCount(3);
    for(let i=0;i<3;i++)await group.getByLabel(`Panel ${i+1} caption`).fill(`Panel ${String.fromCharCode(65+i)} result`);
    const firstPanel=group.locator('.figure-panel-image').first(),beforeWidth=await firstPanel.evaluate(el=>el.getBoundingClientRect().width);
    await group.getByLabel('Panel 1 width',{exact:true}).click();await group.getByLabel('Panel 1 width',{exact:true}).press('ControlOrMeta+A');await group.getByLabel('Panel 1 width',{exact:true}).pressSequentially('60');
    await expect(group.getByLabel('Panel 1 width',{exact:true})).toHaveValue('60');
    await expect.poll(async()=>firstPanel.evaluate(el=>el.getBoundingClientRect().width),{timeout:3000}).toBeLessThan(beforeWidth*.7);
    const afterWidth=await firstPanel.evaluate(el=>el.getBoundingClientRect().width);
    if(!(afterWidth<beforeWidth*.7))throw Error(`Manual panel width did not change visibly: ${beforeWidth} -> ${afterWidth}; ${JSON.stringify(await firstPanel.evaluate(el=>({style:el.getAttribute('style'),computed:getComputedStyle(el).width,parent:getComputedStyle(el.parentElement).width})))}`);
    await group.getByLabel('Shared figure caption').fill('Three experimental results');
    await group.getByLabel('Figure span').selectOption('full');
    await page.getByRole('button',{name:'Split',exact:true}).click();
    const outputs=[];
    for(const layout of ['row','column','grid']){
      const before=await page.getByTitle('Compiled PDF').count()?await page.getByTitle('Compiled PDF').getAttribute('src'):null;
      await group.getByLabel('Figure arrangement').selectOption(layout);
      await expect(page.getByTitle('Compiled PDF')).toBeVisible({timeout:180000});if(before)await expect(page.getByTitle('Compiled PDF')).not.toHaveAttribute('src',before,{timeout:180000});
      await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
      const project=(await page.evaluate(()=>window.texSuite.library())).find(p=>p.title===title);
      const {projectToLatex}=await import('../src/core/latex.mjs');const source=projectToLatex(project);
      if(!source.includes('width=0.600\\linewidth'))throw Error(`${layout} panel sizing was not preserved in LaTeX.`);
      if(!source.includes('{0.5\\linewidth}'))throw Error(`Single image manual width was not preserved in LaTeX: ${source.match(/\\begin\{wrapfigure\}[^\n]*/)?.[0]}`);
      const result=await page.evaluate(([p,s])=>window.texSuite.compile(p,s),[project,source]);
      if(!result.ok)throw Error(`${layout} failed: ${result.message}\n${result.log}`);
      await fs.writeFile(path.join(root,`${layout}.pdf`),Buffer.from(result.pdf,'base64'));outputs.push({layout,bytes:result.bytes});
    }
    const grip=group.getByLabel('Drag panel 1'),target=group.locator('.figure-panel').nth(2);await grip.dispatchEvent('mousedown',{button:0,buttons:1});await target.dispatchEvent('mousemove',{buttons:1});await target.dispatchEvent('mouseup',{button:0,buttons:0});await page.waitForTimeout(700);
    const reordered=(await page.evaluate(()=>window.texSuite.library())).find(p=>p.title===title).flow.doc.content.find(n=>n.type==='figureGroup').attrs.panels.map(p=>p.caption);
    if(reordered.join('|')!=='Panel B result|Panel C result|Panel A result')throw Error(`Panel drag order was not saved: ${reordered.join('|')}`);
    await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
    await page.screenshot({path:path.join(root,'figure-group.png')});
    await page.reload();await page.locator('.recent-card').filter({hasText:title}).click();
    await expect(page.locator('.manuscript-image').getByLabel('Image width')).toHaveValue('50');
    await expect(page.locator('.figure-group').getByLabel('Panel 3 width',{exact:true})).toHaveValue('60');
    await expect(page.locator('.figure-panel-image').nth(2)).toHaveAttribute('style',/width: 60%/);
    if(errors.length)throw Error(errors.join('\n'));
    await fs.writeFile(path.join(root,'results.json'),JSON.stringify({passed:true,outputs,reordered},null,2));
    console.log(`PASS figure group: ${outputs.map(x=>`${x.layout} ${x.bytes} bytes`).join(', ')}; drag reorder saved`);
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});


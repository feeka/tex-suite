const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
  const root=path.resolve('.cache/journal-ui');
  await fs.mkdir(root,{recursive:true});
  const env={...process.env,TEXSUITE_TEST_DATA:root};
  delete env.ELECTRON_RUN_AS_NODE;
  env.TEXSUITE_XELATEX='C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe';
  const app=await electron.launch({...(process.env.TEXSUITE_PACKAGED?{executablePath:path.resolve(process.env.TEXSUITE_PACKAGED),args:[]}:{args:['.']}),env,timeout:60000});
  const results=[],errors=[];
  try{
    const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.compiler-status')).toContainText('LaTeX is ready',{timeout:30000});
    await page.locator('.create-card').filter({hasText:'texManuscript'}).click();
    await page.getByRole('button',{name:'Split',exact:true}).click();
    await expect(page.getByRole('button',{name:'Preview journal layout',exact:true})).toHaveCount(0);
    const {publishers}=await import('../src/core/catalog.mjs');
    for(const p of publishers.filter(p=>p.id!=='article')){
      const previous=await page.getByTitle('Compiled PDF').count()?await page.getByTitle('Compiled PDF').getAttribute('src'):null;
      await expect(page.getByLabel('Publisher format')).toBeEnabled({timeout:180000});
      await page.getByLabel('Publisher format').selectOption(p.id);
      await expect(page.locator('.template-download')).toContainText('Original template downloaded',{timeout:90000});
      await expect(page.getByTitle('Compiled PDF')).toBeVisible({timeout:180000});
      await expect(page.getByTitle('Compiled PDF')).not.toHaveAttribute('src',previous||'',{timeout:180000});
      await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
      const saved=await page.evaluate(()=>window.texSuite.library());
      if(!saved.some(d=>d.flow?.publisherId===p.id))throw Error('Template selection was not saved: '+p.id);
      if(['ieee','oup','springer'].includes(p.id)){await page.waitForTimeout(2000);await page.screenshot({path:path.join(root,p.id+'.png')});}
      results.push({id:p.id,ok:true,automatic:true});console.log('PASS automatic download + typeset:',p.id);
      await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));
    }
    const before=await page.getByTitle('Compiled PDF').getAttribute('src');
    await page.getByRole('textbox',{name:'Manuscript text'}).click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This change must appear in the typeset journal document automatically.');
    await expect(page.getByTitle('Compiled PDF')).not.toHaveAttribute('src',before,{timeout:180000});
    await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
    if(errors.length)throw Error(errors.join('\n'));
    console.log(`${results.length}/${results.length} journal selections passed. Automatic editing refresh passed.`);
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

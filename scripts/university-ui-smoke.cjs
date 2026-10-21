const {_electron:electron,expect}=require('@playwright/test');
const path=require('node:path');

(async()=>{
  const env={...process.env,TEXSUITE_TEST_DATA:path.resolve(`.cache/university-ui-${Date.now()}`)};
  delete env.ELECTRON_RUN_AS_NODE;
  const launch=process.env.TEXSUITE_PACKAGED
    ?{executablePath:path.resolve(process.env.TEXSUITE_PACKAGED),args:[],env}
    :{args:['.'],env};
  const app=await electron.launch(launch);
  try{
    const page=await app.firstWindow(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await expect(page.locator('.compiler-status')).toContainText('LaTeX is ready',{timeout:30000});
    for(const name of ['TU Darmstadt','Saint Petersburg']){
      await page.getByRole('button',{name:'Templates'}).first().click();
      await page.locator('.native-card').filter({hasText:name}).click();
      await expect(page.locator('.code-pane .cm-content')).toBeVisible();
      await page.locator('.cm-content').click();await page.keyboard.press('Control+End');
      await page.keyboard.type(`\n% Source edited in ${name}`);
      await expect(page.locator('.cm-content')).toContainText(`Source edited in ${name}`);
      await page.getByRole('button',{name:'Compile PDF',exact:true}).click();
      await expect(page.getByTitle('Compiled PDF')).toBeVisible({timeout:120000});
      const project=(await page.evaluate(()=>window.texSuite.library())).find(p=>p.nativeTheme);
      if(!project?.sourceOverride?.includes(`Source edited in ${name}`))throw Error(`${name} source edit was not saved`);
      console.log(`PASS native university template: ${name} source edit, save, compile`);
      await page.getByRole('button',{name:'TeX Suite home',exact:true}).click();
    }
    if(errors.length)throw Error(errors.join('\n'));
  }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

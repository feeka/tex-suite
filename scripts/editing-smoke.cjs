const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');

(async()=>{
  const root=path.resolve('.cache/editing-smoke');
  await fs.mkdir(root,{recursive:true});
  const env={...process.env,TEXSUITE_TEST_DATA:root,TEXSUITE_XELATEX:'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\xelatex.exe'};
  delete env.ELECTRON_RUN_AS_NODE;
  const launch=()=>electron.launch(process.env.TEXSUITE_PACKAGED?{executablePath:path.resolve(process.env.TEXSUITE_PACKAGED),args:[],env}:{args:['.'],env});
  let app=await launch();
  try{
    const page=await app.firstWindow(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await expect(page.locator('.compiler-status')).toContainText('LaTeX is ready',{timeout:30000});
    await page.locator('.create-card').filter({hasText:'texManuscript'}).click();
    await page.getByLabel('Publisher format').selectOption('springer');
    await page.getByRole('button',{name:'Split',exact:true}).click();
    await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
    await page.getByRole('textbox',{name:'Manuscript title'}).fill('Editable research title');
    await page.getByRole('textbox',{name:'Manuscript authors'}).fill('A. Researcher');
    await page.getByRole('textbox',{name:'Manuscript affiliation'}).fill('Institute of Biology');
    await page.getByRole('textbox',{name:'Manuscript abstract'}).fill('A complete abstract with editable text.');
    const editor=page.getByRole('textbox',{name:'Manuscript text'});
    await editor.getByText('Good work begins',{exact:false}).click({clickCount:3});
    await page.keyboard.type('This replaces the starter paragraph directly.');
    await expect(editor).not.toContainText('Good work begins');
    await editor.click();await page.keyboard.press('Control+End');await page.keyboard.press('Enter');
    const sentence='Typing stays in the manuscript even while the journal PDF updates automatically.';
    await page.keyboard.type(sentence,{delay:55});
    await expect(editor).toContainText(sentence);
    await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
    await page.waitForTimeout(650);
    const current=(await page.evaluate(()=>window.texSuite.library())).find(p=>p.title==='Editable research title');
    const {projectToLatex}=await import('../src/core/latex.mjs');
    const compiled=await page.evaluate(([project,source])=>window.texSuite.compile(project,source),[current,projectToLatex(current)]);
    if(!compiled.ok)throw Error(`Edited manuscript did not compile: ${compiled.message}`);
    await fs.writeFile(path.join(root,'edited-document.pdf'),Buffer.from(compiled.pdf,'base64'));
    await page.getByRole('button',{name:'Create PDF'}).click();
    await expect(page.getByRole('textbox',{name:'Manuscript text'})).toBeVisible({timeout:180000});
    await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
    await page.getByRole('button',{name:'PDF',exact:true}).click();
    await expect(editor).toHaveCount(0);
    await page.getByRole('button',{name:'Edit text',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Manuscript text'})).toContainText(sentence);
    await expect(page.getByTitle('Compiled PDF')).toHaveCount(0);
    await page.getByRole('textbox',{name:'Manuscript text'}).getByText('Describe your approach.').click({clickCount:3});
    await page.keyboard.type('Our methods are editable in Write mode.');
    await expect(page.getByRole('textbox',{name:'Manuscript text'})).not.toContainText('Describe your approach.');
    await page.getByRole('button',{name:'Split',exact:true}).click();
    await expect(page.locator('.flow-document header')).toContainText('Up to date',{timeout:180000});
    await page.waitForTimeout(1300);
    const saved=await page.evaluate(()=>window.texSuite.library());
    if(!saved.some(p=>p.title==='Editable research title'&&p.flow.authors==='A. Researcher'&&p.flow.abstract==='A complete abstract with editable text.'&&JSON.stringify(p.flow.doc).includes(sentence)&&JSON.stringify(p.flow.doc).includes('This replaces the starter paragraph directly.')))throw Error('Editable fields were not saved');
    await page.screenshot({path:path.join(root,'editing.png')});
    if(errors.length)throw Error(errors.join('\n'));
  }finally{await app.close();}
  app=await launch();
  try{
    const page=await app.firstWindow();
    await page.locator('.recent-card').filter({hasText:'Editable research title'}).first().click();
    await expect(page.getByRole('textbox',{name:'Manuscript title'})).toHaveValue('Editable research title');
    await expect(page.getByRole('textbox',{name:'Manuscript authors'})).toHaveValue('A. Researcher');
    await expect(page.getByRole('textbox',{name:'Manuscript text'})).toContainText('Typing stays in the manuscript');
    console.log('PASS editable title, authors, affiliation, abstract, body, manual compile, PDF/Write switch, autosave, reopen');
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

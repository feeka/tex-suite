import {test,expect} from '@playwright/test';
import {projectToLatex} from '../../src/core/latex.mjs';

async function savedSource(page,fragment){
  await expect.poll(()=>page.evaluate(fragment=>JSON.stringify(JSON.parse(localStorage.getItem('texsuite-projects')||'[]')[0]||{}).includes(fragment),fragment)).toBe(true);
  const project=await page.evaluate(()=>JSON.parse(localStorage.getItem('texsuite-projects'))[0]);
  return projectToLatex(project);
}

test('manuscript equation and reference remain editable and generate matching LaTeX',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('.create-card').filter({hasText:'texManuscript'}).click();
  await page.getByRole('textbox',{name:'Manuscript text'}).locator('h1').first().click();
  await page.getByLabel('Heading label').fill('sec:introduction');
  await page.getByRole('button',{name:'Equation',exact:true}).click();
  await page.getByLabel('Display formula LaTeX').fill('F=ma');
  await page.getByLabel('Equation label').fill('eq:force');
  await expect(page.getByLabel('Insert reference')).toContainText('eq:force');
  await page.getByLabel('Insert reference').selectOption('eq:force');
  await expect(page.getByLabel('Reference label')).toHaveValue('eq:force');
  await page.getByRole('button',{name:'LaTeX',exact:true}).click();
  const source=page.locator('.cm-content');
  await expect(source).toContainText('\\begin{equation}');
  await expect(source).toContainText('\\label{sec:introduction}');
  await expect(source).toContainText('F=ma');
  await expect(source).toContainText('\\label{eq:force}');
  await expect(source).toContainText('\\ref{eq:force}');
  expect(errors).toEqual([]);
});

test('Beamer formula and references to a slide and equation survive source view',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('.create-card').filter({hasText:'texBeamer'}).click();
  await page.getByRole('button',{name:'Select slide 2'}).click();
  await page.getByLabel('Slide label').fill('slide:methods');
  await page.getByRole('button',{name:'∑ Formula'}).click();
  await page.getByLabel('Formula LaTeX').fill('x^2+y^2=z^2');
  await page.getByLabel('Equation label').fill('eq:geometry');
  await page.getByRole('button',{name:'↗ Reference'}).click();
  await page.getByLabel('Reference target').selectOption('eq:geometry');
  await page.getByRole('button',{name:'LaTeX',exact:true}).click();
  const source=page.locator('.cm-content');
  await expect(source).toContainText('\\label{slide:methods}');
  await expect(source).toContainText('\\label{eq:geometry}');
  await expect(source).toContainText('\\ref{eq:geometry}');
  await expect(source).toContainText('x^2+y^2=z^2');
  expect(errors).toEqual([]);
});

test('scientific controls and source mode remain reachable at laptop width',async({page})=>{
  await page.setViewportSize({width:1200,height:800});
  await page.goto('/');await page.locator('.create-card').filter({hasText:'texBeamer'}).click();
  await expect(page.getByRole('button',{name:'∑ Formula'})).toBeInViewport();
  await expect(page.getByRole('button',{name:'↗ Reference'})).toBeInViewport();
  await expect(page.getByRole('button',{name:'LaTeX',exact:true})).toBeInViewport();
});

test('Beamer formula changes round-trip between LaTeX and visual controls',async({page})=>{
  await page.goto('/');await page.locator('.create-card').filter({hasText:'texBeamer'}).click();
  await page.getByRole('button',{name:'Select slide 2'}).click();
  await page.getByRole('button',{name:'∑ Formula'}).click();
  await page.getByLabel('Formula LaTeX').fill('E=mc^2');
  await page.getByRole('button',{name:'LaTeX',exact:true}).click();
  const code=page.locator('.cm-content');
  const original=await savedSource(page,'E=mc^2');
  expect(original).toContain('\\displaystyle E=mc^2');
  await code.click();await page.keyboard.press('Control+A');
  await page.keyboard.insertText(original.replace('\\displaystyle E=mc^2','\\displaystyle F=ma'));
  await expect(code).toContainText('\\displaystyle F=ma');
  await code.click();await page.keyboard.press('Control+f');
  await page.locator('.cm-search input').first().fill('F=ma');
  await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  const position=await page.evaluate(()=>{
    const line=[...document.querySelectorAll('.cm-line')].find(el=>el.textContent.includes('F=ma'));
    if(!line)throw new Error('Formula line not visible');
    const walker=document.createTreeWalker(line,NodeFilter.SHOW_TEXT),target=line.textContent.indexOf('F=ma');let seen=0;
    for(let node;node=walker.nextNode();){const length=node.textContent.length;if(seen+length<=target){seen+=length;continue;}const at=target-seen,range=document.createRange();range.setStart(node,at);range.setEnd(node,at+1);const rect=range.getBoundingClientRect();return{x:rect.left+1,y:rect.top+rect.height/2};}
    throw new Error('Formula text node not visible');
  });
  await page.mouse.click(position.x,position.y);
  for(let i=0;i<4;i++)await page.keyboard.press('Delete');
  await page.keyboard.type('G=ma');
  await page.getByRole('button',{name:'Visual',exact:true}).click();
  await page.getByTestId('page-canvas').locator('.canvas-formula').click();
  await expect(page.getByLabel('Formula LaTeX')).toHaveValue('G=ma');
  await expect(page.locator('.source-banner')).toHaveCount(0);
  await page.getByLabel('Formula LaTeX').fill('a^2+b^2=c^2');
  await page.getByRole('button',{name:'LaTeX',exact:true}).click();
  await expect(code).toContainText('\\displaystyle a^2+b^2=c^2');
});

test('manuscript equation changes round-trip between LaTeX and visual controls',async({page})=>{
  await page.goto('/');await page.locator('.create-card').filter({hasText:'texManuscript'}).click();
  await page.getByRole('button',{name:'Equation',exact:true}).click();
  await page.getByLabel('Display formula LaTeX').fill('E=mc^2');
  await page.getByRole('button',{name:'LaTeX',exact:true}).click();
  const code=page.locator('.cm-content');
  const original=await savedSource(page,'E=mc^2');
  expect(original).toContain('\\begin{equation}\nE=mc^2');
  await code.click();await page.keyboard.press('Control+A');
  await page.keyboard.insertText(original.replace('\\begin{equation}\nE=mc^2','\\begin{equation}\nF=ma'));
  await expect(code).toContainText('F=ma');
  await page.getByRole('button',{name:'Write',exact:true}).click();
  await expect(page.getByLabel('Display formula LaTeX')).toHaveValue('F=ma');
  await expect(page.locator('.source-banner')).toHaveCount(0);
  await page.getByLabel('Display formula LaTeX').fill('x^2+y^2');
  await page.getByRole('button',{name:'LaTeX',exact:true}).click();
  await expect(code).toContainText('x^2+y^2');
});

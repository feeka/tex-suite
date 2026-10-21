import {test,expect} from '@playwright/test';

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

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject,addElement} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';
import {syncFormulaSource} from '../src/core/formula-sync.mjs';

test('Beamer source formula edit updates the visual project without custom-source mode',()=>{
  const project=createProject('beamer');
  const formula=addElement('formula','beamer',project.palette);
  project.pages[1].elements.push(formula);
  const source=projectToLatex(project);
  const edited=source.replace('\\displaystyle E=mc^2','\\displaystyle F=ma');
  const synced=syncFormulaSource(project,edited);
  assert.equal(synced.pages[1].elements.at(-1).latex,'F=ma');
  assert.equal(synced.sourceOverride,null);
  assert.equal(projectToLatex(synced),edited);
  assert.equal(syncFormulaSource(project,source+'\n% unrelated edit'),null);
});

test('manuscript inline and display formula edits update the document model',()=>{
  const project=createProject('manuscript');
  project.flow.doc.content.push({type:'paragraph',content:[{type:'inlineMath',attrs:{latex:'x^2'}}]});
  project.flow.doc.content.push({type:'displayMath',attrs:{latex:'E=mc^2',label:'eq:energy'}});
  const source=projectToLatex(project);
  const edited=source.replace('\\(x^2\\)','\\(y^2\\)').replace('\\begin{equation}\nE=mc^2','\\begin{equation}\nF=ma');
  const synced=syncFormulaSource(project,edited);
  assert.equal(synced.flow.doc.content.at(-2).content[0].attrs.latex,'y^2');
  assert.equal(synced.flow.doc.content.at(-1).attrs.latex,'F=ma');
  assert.equal(projectToLatex(synced),edited);
});

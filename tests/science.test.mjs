import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject,addElement,validateProject} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';
import {exportDocx} from '../src/core/word.mjs';
import AdmZip from 'adm-zip';

test('manuscript equations, heading and figure labels, and references produce LaTeX',()=>{
  const p=createProject('manuscript');
  p.flow.doc.content[0].attrs.label='sec:intro';
  p.flow.doc.content.push({type:'paragraph',content:[{type:'text',text:'See equation '},{type:'crossReference',attrs:{target:'eq:energy'}},{type:'text',text:' and '},{type:'inlineMath',attrs:{latex:'x^2'}}]});
  p.flow.doc.content.push({type:'displayMath',attrs:{latex:'E=mc^2',label:'eq:energy'}});
  p.flow.doc.content.push({type:'figureGroup',attrs:{layout:'row',width:'column',caption:'Observation',label:'fig:observation',panels:[{src:'data:image/png;base64,YQ==',alt:'plot.png',caption:'',width:100}]}});
  const source=projectToLatex(p);
  assert.match(source,/\\section\{Introduction\}\\label\{sec:intro\}/);
  assert.match(source,/See equation \\ref\{eq:energy\} and \\\(x\^2\\\)/);
  assert.match(source,/\\begin\{equation\}\s*E=mc\^2\s*\\label\{eq:energy\}\s*\\end\{equation\}/);
  assert.match(source,/\\caption\{Observation\}\s*\\label\{fig:observation\}/);
  p.flow.doc.content.at(-2).attrs.label='bad label';
  assert.throws(()=>validateProject(p),/Invalid label/);
});

test('Beamer formulas and slide references are editable project elements',()=>{
  const p=createProject('beamer');
  p.pages[1].label='slide:methods';
  const formula=addElement('formula','beamer');formula.latex='a^2+b^2=c^2';formula.label='eq:triangle';p.pages[1].elements.push(formula);
  const reference=addElement('reference','beamer');reference.target='eq:triangle';p.pages[2].elements.push(reference);
  const source=projectToLatex(p);
  assert.match(source,/\\usepackage\{amsmath\}/);
  assert.match(source,/\\label\{slide:methods\}/);
  assert.match(source,/\\refstepcounter\{equation\}\\label\{eq:triangle\}/);
  assert.match(source,/\\displaystyle a\^2\+b\^2=c\^2/);
  assert.match(source,/\\ref\{eq:triangle\}/);
  p.pages[1].label='slide:bad label';assert.throws(()=>validateProject(p),/Invalid slide label/);
});

test('Word export preserves equation source and reference identifiers as text',async()=>{
  const p=createProject('manuscript');
  p.flow.doc.content.push({type:'paragraph',content:[{type:'text',text:'See '},{type:'crossReference',attrs:{target:'eq:force'}},{type:'text',text:' for '},{type:'inlineMath',attrs:{latex:'F=ma'}}]});
  p.flow.doc.content.push({type:'displayMath',attrs:{latex:'F=ma',label:'eq:force'}});
  const blob=await exportDocx(p);
  const xml=new AdmZip(Buffer.from(await blob.arrayBuffer())).readAsText('word/document.xml');
  assert.match(xml,/\[ref: eq:force\]/);
  assert.match(xml,/\$F=ma\$/);
  assert.match(xml,/\[eq:force\]/);
});

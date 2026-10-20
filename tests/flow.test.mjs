import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject,flowingCopy} from '../src/core/model.mjs';
import {publishers} from '../src/core/catalog.mjs';
import {projectToLatex,extractAssets} from '../src/core/latex.mjs';
test('each publisher uses its actual class and escapes manuscript metadata',()=>{
  for(const publisher of publishers){
    const p=createProject('manuscript');p.flow.publisherId=publisher.id;p.title='A & B: 50%';p.flow.authors='\\input{secret}';
    const source=projectToLatex(p);
    assert.ok(source.includes(`{${publisher.className}}`));
    assert.ok(source.includes('A \\& B: 50\\%'));assert.ok(!source.includes('\\input{secret}'));
  }
});
test('conversion creates a separate flow document and preserves the original',()=>{
  const original=createProject('manuscript');delete original.flow;
  const snapshot=JSON.stringify(original),copy=flowingCopy(original);
  assert.notEqual(copy.id,original.id);assert.equal(JSON.stringify(original),snapshot);
  assert.ok(copy.flow.doc.content.some(n=>n.type==='heading'));
  assert.equal(validateProject(copy),copy);
});
test('manuscript image references, invalid input and legacy documents',()=>{
  const p=createProject('manuscript');p.flow.doc.content.push({type:'image',attrs:{src:'data:image/png;base64,YQ==',width:300,wrap:'left'}});
  assert.equal(extractAssets(p)[0].name,'flow-0.png');
  assert.match(projectToLatex(p),/\\begin\{wrapfigure\}\{l\}/);
  p.flow.doc.content.at(-1).attrs.src='https://example.org/tracker.png';
  assert.throws(()=>validateProject(p));
  delete p.flow;p.version=1;assert.equal(validateProject(p),p);assert.match(projectToLatex(p),/tikzpicture/);
});
test('figure groups preserve panel order and generate native LaTeX layouts',()=>{
  const png='data:image/png;base64,YQ==',p=createProject('manuscript');
  p.flow.doc.content.push({type:'figureGroup',attrs:{layout:'row',width:'full',caption:'Shared result',panels:[
    {src:png,alt:'first.png',caption:'First panel',width:60},{src:png,alt:'second.png',caption:'Second panel',width:40},
  ]}});
  assert.equal(validateProject(p),p);
  assert.deepEqual(extractAssets(p).map(x=>x.name),['flow-0.png','flow-1.png']);
  const source=projectToLatex(p);
  assert.match(source,/\\begin\{figure\*\}\[!tbp\]/);
  assert.match(source,/height=0\.380\\textheight,keepaspectratio/);
  assert.match(source,/\\begin\{minipage\}\[t\]\{0\.4800\\linewidth\}/);
  assert.match(source,/\\includegraphics\[width=0\.600\\linewidth/);
  assert.match(source,/\\includegraphics\[width=0\.400\\linewidth/);
  assert.ok(source.indexOf('First panel')<source.indexOf('Second panel'));
  assert.match(source,/\\caption\{Shared result\}/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject,templates,dimensions,snapRect,validateProject} from '../src/core/model.mjs';
import {escapeTex,projectToLatex,extractAssets} from '../src/core/latex.mjs';

test('15 templates generate independent valid projects for both editors',()=>{
  assert.equal(templates.length,15);
  const sources=new Set();
  for(const t of templates)for(const kind of ['beamer','manuscript']){
    const a=createProject(kind,t.id),b=createProject(kind,t.id);
    assert.notEqual(a.id,b.id);assert.equal(validateProject(a),a);
    assert.equal(a.pages.length,kind==='beamer'?3:1);
    const legacy=structuredClone(a);delete legacy.flow;
    const tex=projectToLatex(legacy);assert.match(tex,/\\begin\{document\}/);
    sources.add(tex);
    b.palette.accent='#000000';assert.notEqual(a.palette.accent,b.palette.accent);
  }
  assert.equal(sources.size,30);
});
test('alignment snaps to edges and centers, clamps margins, and allows explicit override',()=>{
  const d=dimensions('beamer');
  const r=snapRect({x:51,y:172,w:100,h:80},[],d);
  assert.equal(r.x,48);assert.ok(r.guides.some(g=>g.axis==='x'&&g.value===48));
  const neighbor=snapRect({x:202,y:200,w:100,h:80},[{x:200,y:300,w:80,h:40}],d);
  assert.equal(neighbor.x,200);
  const off=snapRect({x:-30,y:500,w:100,h:80},[],d);
  assert.equal(off.x,48);assert.equal(off.y,412);assert.equal(off.attemptedOutside,true);
  const free=snapRect({x:-30,y:500,w:100,h:80},[],d,{allowOutside:true,enabled:false});
  assert.equal(free.x,-30);assert.equal(free.y,500);
});
test('untrusted project structure, paths and image URLs are rejected',()=>{
  const p=createProject();p.id='../outside';assert.throws(()=>validateProject(p));
  const q=createProject();q.pages[0].elements[0].x=Infinity;assert.throws(()=>validateProject(q));
  const r=createProject();r.palette.accent='red}\\input{secret}';assert.throws(()=>validateProject(r));
  const s=createProject();s.pages[0].elements.push({id:'bad',type:'image',x:1,y:1,w:10,h:10,src:'file:///etc/passwd'});assert.throws(()=>validateProject(s));
});
test('literal text is escaped and frame counts match the project',()=>{
  assert.equal(escapeTex('50% & $x_1$'),'50\\% \\& \\$x\\_1\\$');
  const p=createProject();p.pages[0].elements.find(e=>e.type==='text').text='\\input{private}';
  const tex=projectToLatex(p);
  assert.match(tex,/\\textbackslash\{\}input\\\{private\\\}/);
  assert.equal((tex.match(/\\begin\{frame\}/g)||[]).length,3);
  assert.deepEqual(extractAssets(p),[]);
});

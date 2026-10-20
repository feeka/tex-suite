import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';
import {publishers,universities} from '../src/core/catalog.mjs';
const require=createRequire(import.meta.url),{TexService}=require('../electron/tex-service.cjs'),{templateFiles}=require('../electron/native-templates.cjs');
const root=path.resolve('.cache/managed-setup-test'),svc=new TexService(root);
svc.on('progress',p=>console.log(p.message));
await fs.mkdir('.cache/native-results',{recursive:true});
const results=[];
const requested=process.argv.slice(2);
for(const t of [...publishers,...universities].filter(t=>!requested.length||requested.includes(t.id))){
  const p=createProject(t.source?'beamer':'manuscript');if(p.flow)p.flow.publisherId=t.id;
  console.log(`\nTEST ${t.id}`);
  try{
    const files=await templateFiles(p,root,m=>console.log(m));
    const result=await svc.compile(t.source||projectToLatex(p),[],{engine:t.id==='tudarmstadt'?'lualatex':'pdflatex',files});
    await fs.writeFile(`.cache/native-results/${t.id}.log`,result.log);
    if(result.ok)await fs.writeFile(`.cache/native-results/${t.id}.pdf`,Buffer.from(result.pdf,'base64'));
    results.push({id:t.id,ok:result.ok,bytes:result.bytes});console.log(t.id,result.ok?'PASS':'FAIL');
    if(!result.ok)console.log(result.log.slice(-1800));
  }catch(e){results.push({id:t.id,ok:false,error:e.message});console.error(e.message);}
}
await fs.writeFile('.cache/native-results/results.json',JSON.stringify(results,null,2));
console.log(results);
if(results.some(r=>!r.ok))process.exitCode=1;

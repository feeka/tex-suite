import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject,templates} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';

const require=createRequire(import.meta.url),{TexService}=require('../electron/tex-service.cjs');
const root=path.resolve('.cache/design-matrix'),svc=new TexService(root),results=[];
await fs.mkdir(root,{recursive:true});
for(const kind of ['beamer','manuscript'])for(const template of templates){
  const project=createProject(kind,template.id),id=`${kind}/${template.id}`;
  try{
    const result=await svc.compile(projectToLatex(project),[],{engine:kind==='beamer'?'xelatex':'pdflatex'});
    results.push({id,ok:result.ok,bytes:result.bytes});
    if(!result.ok)await fs.writeFile(path.join(root,`${kind}-${template.id}.log`),result.log);
    console.log(`${result.ok?'PASS':'FAIL'} ${id}${result.ok?'':`: ${result.message}`}`);
  }catch(error){results.push({id,ok:false,error:error.message});console.log(`FAIL ${id}: ${error.message}`);}
}
await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));
console.log(`${results.filter(result=>result.ok).length}/${results.length} built-in designs compiled`);
if(results.some(result=>!result.ok))process.exitCode=1;

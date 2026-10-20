import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject,addElement} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';
const require=createRequire(import.meta.url),{TexService}=require('../electron/tex-service.cjs');
await fs.mkdir('test-results',{recursive:true});
const svc=new TexService(path.resolve('.cache/tex-test'));
console.log('Compiler:',await svc.detect());
for(const kind of ['beamer','manuscript']){
  const project=createProject(kind);
  if(kind==='manuscript')project.pages[0].elements.push({...addElement('table',kind),y:930,h:100,fontSize:13});
  const result=await svc.compile(projectToLatex(project));
  await fs.writeFile(`test-results/${kind}.log`,result.log);
  if(!result.ok){console.error(result.log.slice(-4500));process.exitCode=1;break;}
  await fs.writeFile(`test-results/${kind}.pdf`,Buffer.from(result.pdf,'base64'));
  console.log(kind,result.bytes,'bytes',svc.lastPdf.folder);
}

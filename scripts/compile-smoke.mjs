import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject,addElement} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';
import {syncFormulaSource} from '../src/core/formula-sync.mjs';
const require=createRequire(import.meta.url),{TexService}=require('../electron/tex-service.cjs');
await fs.mkdir('test-results',{recursive:true});
const svc=new TexService(path.resolve('.cache/tex-test'));
console.log('Compiler:',await svc.detect());
for(const kind of ['beamer','manuscript']){
  const project=createProject(kind);
  if(kind==='beamer'){
    project.pages[1].elements.push({...addElement('list',kind),x:110,y:220,text:'First point\nSecond point'});
    project.pages[2].elements.push({...addElement('list',kind),x:110,y:220,listStyle:'enumerate',text:'One\nTwo'});
    project.pages[1].elements.push({...addElement('formula',kind,project.palette),x:110,y:500});
  }
  if(kind==='manuscript'){
    project.pages[0].elements.push({...addElement('table',kind),y:930,h:100,fontSize:13});
    project.flow.doc.content.push({type:'displayMath',attrs:{latex:'E=mc^2',label:'eq:smoke'}});
  }
  const before=projectToLatex(project);
  const edited=kind==='beamer'?before.replace('\\displaystyle E=mc^2','\\displaystyle F=ma'):before.replace('\\begin{equation}\nE=mc^2','\\begin{equation}\nF=ma');
  const synced=syncFormulaSource(project,edited);
  if(!synced||projectToLatex(synced)!==edited)throw new Error(`${kind} formula source did not synchronize`);
  const result=await svc.compile(projectToLatex(synced));
  await fs.writeFile(`test-results/${kind}.log`,result.log);
  if(!result.ok){console.error(result.log.slice(-4500));process.exitCode=1;break;}
  await fs.writeFile(`test-results/${kind}.pdf`,Buffer.from(result.pdf,'base64'));
  console.log(kind,result.bytes,'bytes',svc.lastPdf.folder);
}

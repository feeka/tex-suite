import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createProject,addElement} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';

const folder=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-science-'));
try{
  for(const kind of ['manuscript','beamer']){
    const project=createProject(kind);
    if(kind==='manuscript'){
      project.flow.doc.content.push({type:'paragraph',content:[{type:'text',text:'Equation '},{type:'crossReference',attrs:{target:'eq:force'}},{type:'text',text:' uses '},{type:'inlineMath',attrs:{latex:'F=ma'}}]});
      project.flow.doc.content.push({type:'displayMath',attrs:{latex:'F=ma',label:'eq:force'}});
    }else{
      project.pages[1].label='slide:methods';
      project.pages[1].elements.push({...addElement('formula','beamer'),latex:'F=ma',label:'eq:force'});
      project.pages[2].elements.push({...addElement('reference','beamer'),target:'eq:force'});
    }
    const dir=path.join(folder,kind);await fs.mkdir(dir);
    await fs.writeFile(path.join(dir,'main.tex'),projectToLatex(project));
    for(let pass=0;pass<2;pass++){
      const result=spawnSync(process.env.TEXSUITE_XELATEX||'xelatex',['-no-shell-escape','-interaction=nonstopmode','-halt-on-error',...(process.platform==='win32'?['--disable-installer']:[]),'main.tex'],{cwd:dir,windowsHide:true,timeout:120000,encoding:'utf8'});
      if(result.status!==0)throw Error(`${kind} compilation failed on pass ${pass+1}:\n${(result.stdout||result.stderr||'').slice(-3500)}`);
    }
    const pdf=await fs.readFile(path.join(dir,'main.pdf'));
    const log=await fs.readFile(path.join(dir,'main.log'),'utf8');
    if(pdf.length<1000||/undefined references|Reference .* undefined/.test(log))throw Error(`${kind} PDF or references failed validation`);
    console.log(`${kind}: PDF compiled, ${pdf.length} bytes, references resolved`);
  }
}finally{await fs.rm(folder,{recursive:true,force:true});}

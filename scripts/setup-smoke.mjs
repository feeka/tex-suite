// Exercises setup in an isolated app directory, without replacing system TeX.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject} from '../src/core/model.mjs';
import {projectToLatex} from '../src/core/latex.mjs';
const require=createRequire(import.meta.url),{TexService}=require('../electron/tex-service.cjs');
class IsolatedService extends TexService{
  async detect(){
    if(this.compiler)return this.compiler;
    const bins=path.join(this.root,'tex','TinyTeX','bin');
    for(const dir of await fs.readdir(bins).catch(()=>[])){
      const bin=path.join(bins,dir),executable=path.join(bin,process.platform==='win32'?'xelatex.exe':'xelatex');
      if(!await fs.stat(executable).catch(()=>null))continue;
      const r=await this.run(executable,['--version'],{timeout:15000});
      if(!r.code)return this.compiler={executable,bin,distribution:'TeX Live',managed:true,version:r.output.split('\n')[0]};
    }return null;
  }
}
const svc=new IsolatedService(path.resolve('.cache/managed-setup-test'));
let last='';
svc.on('progress',p=>{const s=p.message.replace(/ · \d+ MB/,'');if(s!==last){console.log(p.message);last=s;}});
const installed=await svc.install();console.log('Installed:',installed.version);
await svc.installExtension('essentials');
const result=await svc.compile(projectToLatex(createProject('beamer')));
await fs.mkdir('verification',{recursive:true});
await fs.writeFile('verification/tinytex-setup.log',result.log);
if(!result.ok)throw Error(result.log.slice(-4000));
console.log('Isolated TinyTeX setup and compilation passed:',result.bytes,'PDF bytes');

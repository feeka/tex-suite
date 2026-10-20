import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {publishers} from '../src/core/catalog.mjs';
import {createProject} from '../src/core/model.mjs';
import {extractAssets,projectToLatex} from '../src/core/latex.mjs';
const require=createRequire(import.meta.url);
const {TexService}=require('../electron/tex-service.cjs');
const {templateFiles}=require('../electron/native-templates.cjs');
const root=path.resolve('.cache/miktex-journals'),out=path.join(root,'results');
await fs.mkdir(out,{recursive:true});
const svc=new TexService(root),compiler=await svc.detect();
if(compiler?.distribution!=='MiKTeX')throw Error('This matrix must run on the user’s MiKTeX installation.');
svc.on('progress',p=>console.log(p.message));
const ids=process.argv.slice(2);
const prior=ids.length?JSON.parse(await fs.readFile(path.join(out,'results.json'),'utf8').catch(()=>'{"results":[]}')).results:[];
const results=prior.filter(r=>!ids.includes(r.id));
const text=(text,marks)=>({type:'text',text,...(marks?{marks}:{})});
const para=(s)=>({type:'paragraph',content:[text(s)]});
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
for(const item of publishers.filter(p=>!ids.length||ids.includes(p.id))){
  for(const variant of ['starter','formatted']){
    const p=createProject('manuscript');p.flow.publisherId=item.id;
    if(variant==='formatted'){
      p.title='CRISPR-Cas systems: Methods & results';
      p.flow.authors='A. Researcher';p.flow.affiliation='Sample Research Institute';
      p.flow.doc.content.push(
        {type:'paragraph',content:[text('A bold result. ',[{type:'bold'}]),text('An italic explanation. ',[{type:'italic'}]),text('Reference website',[{type:'link',attrs:{href:'https://example.org/research'}}])]},
        {type:'bulletList',content:[{type:'listItem',content:[para('First finding')]},{type:'listItem',content:[para('Second finding')]}]},
        {type:'table',content:[{type:'tableRow',content:['Method','Result'].map(s=>({type:'tableHeader',content:[para(s)]}))},{type:'tableRow',content:['Graph analysis','42 arrays'].map(s=>({type:'tableCell',content:[para(s)]}))}]},
        {type:'figureGroup',attrs:{layout:'row',width:'full',caption:'Cross-template figure group',panels:[{src:pixel,alt:'panel-a.png',caption:'Panel A',width:55},{src:pixel,alt:'panel-b.png',caption:'Panel B',width:45}]}},
        ...Array.from({length:12},()=>para('We investigate CRISPR-Cas systems in metagenomic datasets. Repeated sequences define shared paths in the graph. '.repeat(4)))
      );
    }
    console.log(`TEST ${item.id} / ${variant}`);
    const name=`${item.id}-${variant}`;
    try{
      const files=await templateFiles(p,root,m=>console.log(m));
      const source=projectToLatex(p);await fs.writeFile(path.join(out,name+'.tex'),source);
      const r=await svc.compile(source,extractAssets(p),{engine:'pdflatex',files});
      await fs.writeFile(path.join(out,name+'.log'),r.log);
      if(r.ok)await fs.writeFile(path.join(out,name+'.pdf'),Buffer.from(r.pdf,'base64'));
      results.push({id:item.id,variant,ok:r.ok,bytes:r.bytes,message:r.message});
      console.log(r.ok?'PASS':`FAIL: ${r.log.slice(-1200)}`);
    }catch(e){results.push({id:item.id,variant,ok:false,message:e.message});console.log('FAIL',e.message);}
    await fs.writeFile(path.join(out,'results.json'),JSON.stringify({compiler,results},null,2));
  }
}
console.log(`${results.filter(r=>r.ok).length}/${results.length} passed`);
if(results.some(r=>!r.ok))process.exitCode=1;

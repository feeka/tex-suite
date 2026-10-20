const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve('.');
const manifest=JSON.parse(fs.readFileSync('package.json','utf8'));
const roots=[...Object.keys(manifest.dependencies),...Object.keys(manifest.devDependencies).filter(n=>/^(?:@tiptap\/|@codemirror\/|@uiw\/|react|lucide-react|mammoth$|docx$)/.test(n))];
const seen=new Set(),notices=[];
function locate(name,from){
  let dir=from;
  while(true){
    const file=path.join(dir,'node_modules',name,'package.json');
    if(fs.existsSync(file))return path.dirname(file);
    const parent=path.dirname(dir);if(parent===dir)return null;dir=parent;
  }
}
function visit(name,from){
  const dir=locate(name,from);if(!dir)return;
  const p=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
  const key=`${p.name}@${p.version}`;if(seen.has(key))return;seen.add(key);
  const files=fs.readdirSync(dir).filter(n=>/^(?:licen[sc]e|copying|notice)(?:\.|$)/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());
  notices.push(`\n${'='.repeat(72)}\n${key}\nDeclared license: ${typeof p.license==='string'?p.license:JSON.stringify(p.license)}\n${files.map(n=>`\n${n}\n${fs.readFileSync(path.join(dir,n),'utf8')}`).join('\n')}`);
  for(const dependency of Object.keys(p.dependencies||{}))visit(dependency,dir);
}
roots.forEach(n=>visit(n,root));
fs.writeFileSync('THIRD-PARTY-NOTICES.txt','Third-party licenses for the editor libraries and their dependencies.\nSome dependency trees include development-only command-line code that is not bundled.\nElectron/Chromium and font licenses are supplied separately.\n'+notices.sort().join('\n'));
console.log(`Collected ${notices.length} package notices.`);

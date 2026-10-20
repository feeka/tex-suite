const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const AdmZip=require('adm-zip');
const SOURCES={
  springer:{folder:'springer-nature-v12',name:'Springer Nature',url:'https://cms-resources.apps.public.k8s.springernature.io/springer-cms/rest/v1/content/18782940/data/v12',sha:'812e76dcaa9c28dc1bff1fb6065d51729b67d4ea140552a05088317414a3ecae'},
  wiley:{folder:'wiley-design-2026',name:'Wiley',url:'https://authors.wiley.com/asset/WileyDesign.zip',sha:'afda236027a0d02837e720014f4fee60e58e25c0595927842beb53c1df75fd98'},
};
Object.assign(SOURCES,{
  "ieee": {
    "name": "IEEE",
    "url": "https://mirrors.ctan.org/macros/latex/contrib/IEEEtran.zip",
    "sha": "e0cd4f5afbd42c8076092280e72b3e0a5111efe501d35de9f715cfb8da313cb4",
    "folder": "ieee-e0cd4f5afbd4"
  },
  "elsevier": {
    "name": "Elsevier",
    "url": "https://mirrors.ctan.org/macros/latex/contrib/elsarticle.zip",
    "sha": "f25a3e1b006e0f86abb091a02f3afa7c6d60491665c7aa89f70cc5609e14d9dc",
    "folder": "elsevier-f25a3e1b006e"
  },
  "acm": {
    "name": "ACM",
    "url": "https://mirrors.ctan.org/macros/latex/contrib/acmart.zip",
    "sha": "93933ce58fbeffa13e23398bb523fcb68275ecc73369c6bc73b421eeef2c10de",
    "folder": "acm-93933ce58fbe"
  },
  "aps": {
    "name": "APS / AIP REVTeX",
    "url": "https://mirrors.ctan.org/install/macros/latex/contrib/revtex.tds.zip",
    "sha": "594346d851a4a8f73de31235b83cbb105bf7730cc4b8eca23c3c87f159a48400",
    "folder": "aps-594346d851a4"
  },
  "acs": {
    "name": "ACS legacy achemso",
    "url": "https://mirrors.ctan.org/install/macros/latex/contrib/achemso.tds.zip",
    "sha": "03d5ae1cf2dc692824554cdedfaa89d1625906050a1c81e0e9beec76e050fff5",
    "folder": "acs-03d5ae1cf2dc"
  },
  "ams": {
    "name": "American Mathematical Society",
    "url": "https://mirrors.ctan.org/install/macros/latex/required/amscls.tds.zip",
    "sha": "6adecab049760399aa45f19feabd4f03b35a1afb2ebd85f934592932baaed539",
    "folder": "ams-6adecab04976"
  },
  "mnras": {
    "name": "MNRAS",
    "url": "https://mirrors.ctan.org/macros/latex/contrib/mnras.zip",
    "sha": "9d453e272a47648b4418b76577c82c331c0a1499a2a620676d3997f5104adf82",
    "folder": "mnras-9d453e272a47"
  },
  "oup": {
    "name": "Oxford University Press",
    "url": "https://mirrors.ctan.org/macros/latex/contrib/oup-authoring-template.zip",
    "sha": "025434f53ed3a46b9fd84d50a78c734c309476bc47b1cb7a90c383734df38e97",
    "folder": "oup-025434f53ed3"
  }
});
const ALIASES={'nature':'springer','ieee-conference':'ieee','elsevier-review':'elsevier','elsevier-final':'elsevier','acm-review':'acm','aip':'aps','bioinformatics':'oup','briefings-bioinformatics':'oup','physical-review-a':'aps','physical-review-b':'aps'};
const pending=new Map();
async function archiveFor(publisherId,root,progress=()=>{}){
  const id=ALIASES[publisherId]||publisherId;
  const spec=SOURCES[id];if(!spec)return null;
  const dir=path.join(root,'templates',spec.folder),archive=path.join(dir,'official-template.zip');
  let data=await fs.readFile(archive).catch(()=>null);
  if(!data||crypto.createHash('sha256').update(data).digest('hex')!==spec.sha){
    progress(`Downloading the official ${spec.name} template…`);
    const response=await fetch(spec.url,{signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error(`The ${spec.name} template could not be downloaded.`);
    const chunks=[];let bytes=0;
    for await(const chunk of response.body){bytes+=chunk.length;if(bytes>30000000)throw Error('Template download exceeded the size limit.');chunks.push(chunk);}
    data=Buffer.concat(chunks);
    if(crypto.createHash('sha256').update(data).digest('hex')!==spec.sha)throw Error('The publisher template has changed. Its checksum must be reviewed before use.');
    await fs.mkdir(dir,{recursive:true});await fs.writeFile(archive,data);
  }
  return {id,spec,data,archive};
}
async function getArchive(id,root,progress){
  const key=root+'::'+(ALIASES[id]||id);
  if(!pending.has(key))pending.set(key,archiveFor(id,root,progress).finally(()=>pending.delete(key)));
  return pending.get(key);
}
function resources(bundle){
  if(!bundle)return [];
  const {id,data}=bundle,zip=new AdmZip(data);
  if(id==='springer')return zip.getEntries().filter(e=>/^sn-article-template\/(?:sn-jnl\.cls|bst\/sn-[a-z-]+\.bst)$/.test(e.entryName)).map(e=>({name:path.posix.basename(e.entryName),data:e.getData()}));
  if(id==='wiley')return zip.getEntries().filter(e=>/^Optimal-Design-layout\/(?:USG\.cls|NJD[a-z]+\.sty|LETTERSP\.STY|wileyNJD-[a-zA-Z-]+\.bst|images\/[a-zA-Z_-]+(?:-eps-converted-to)?\.(?:eps|pdf))$/.test(e.entryName)).map(e=>({name:e.entryName.replace('Optimal-Design-layout/','').replace('LETTERSP.STY','lettersp.sty'),data:e.getData()}));
  const selected=new Map();
  for(const e of zip.getEntries()){
    if(e.isDirectory||/LEGACY|testflow|samples|doc\//.test(e.entryName))continue;
    if(!/\.(cls|sty|bst|cfg|rtx|clo|def|fd)$/i.test(e.entryName))continue;
    const name=path.posix.basename(e.entryName);
    if(!/^[a-zA-Z0-9_.-]+$/.test(name)||name.includes('..')||e.header.size>2000000)continue;
    selected.set(name,{name,data:e.getData()});
  }
  return [...selected.values()];
}
async function templateFiles(project,root,progress=()=>{}){
  return resources(await getArchive(project.flow?.publisherId,root,progress));
}
async function prepareTemplate(id,root,progress=()=>{}){
  const bundle=await getArchive(id,root,progress);
  if(!bundle){if(id!=='article')throw Error('Unknown journal template.');return {id,status:'built-in',files:[]};}
  const files=resources(bundle),entries=new AdmZip(bundle.data).getEntries();
  return {id,status:'downloaded',name:bundle.spec.name,url:bundle.spec.url,sha256:bundle.spec.sha,archive:bundle.archive,files:files.map(f=>f.name),examples:entries.filter(e=>/\.tex$/i.test(e.entryName)&&e.header.size<2000000).map(e=>e.entryName)};
}
module.exports={templateFiles,prepareTemplate,SOURCES,resources};

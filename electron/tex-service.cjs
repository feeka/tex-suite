const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createWriteStream } = require('node:fs');

const BUNDLES = {
  essentials: { title: 'LaTeX essentials', packages: ['xetex','fontspec','tex-gyre','pgf','beamer','geometry','graphics','xcolor'], probe: 'beamer.cls' },
  mathematics: { title: 'Mathematics', packages: ['amsmath','amsfonts','unicode-math','lm-math'], probe: 'unicode-math.sty' },
  bibliography: { title: 'Bibliography', packages: ['biblatex','biber'], probe: 'biblatex.sty' },
  tables: { title: 'Beautiful tables', packages: ['booktabs','tools','multirow','siunitx'], probe: 'booktabs.sty' },
  diagrams: { title: 'Scientific diagrams', packages: ['pgfplots','tikz-cd','circuitikz'], probe: 'pgfplots.sty' },
  publishers: {title:'Publisher classes',packages:['ieeetran','elsarticle','acmart','revtex','achemso','amscls','mnras','oup-authoring-template','cm-super','libertine','newtx','inconsolata'],probes:['IEEEtran.cls','elsarticle.cls','acmart.cls','revtex4-2.cls','achemso.cls','amsart.cls','mnras.cls','oup-authoring-template.cls','sfrm1000.pfb','libertine.sty','newtxmath.sty','zi4.sty']},
  universities: {title:'University themes',packages:['tuda-ci','xcharter','roboto','beamertheme-saintpetersburg','oldstandard','fira','opensans','babel-english'],probes:['tudabeamer.cls','XCharter.sty','roboto.sty','roboto-mono.sty','beamerthemeSaintPetersburg.sty','OldStandard-Regular.otf','FiraMono.sty','opensans.sty','english.ldf']},
};
class TexService extends EventEmitter {
  constructor(root) { super(); this.root = root; this.compiler = null; this.child = null; this.busy = false; this.abort = null; this.cancelled = false; this.lastPdf = null; }
  progress(message, percent = null) { this.emit('progress', { message, percent }); }
  async run(exe, args = [], options = {}) {
    if (this.cancelled) throw new Error('Cancelled.');
    let executable = exe, argv = args, batch = false;
    if (process.platform === 'win32' && /\.(bat|cmd)$/i.test(exe)) {
      if ([exe,...args].some(s => /["\r\n]/.test(s))) throw new Error('Invalid command argument.');
      executable = process.env.ComSpec || 'cmd.exe';
      batch = true;
      argv = ['/d','/s','/v:off','/c', `"${[exe,...args].map(s=>`"${s}"`).join(' ')}"`];
    }
    return new Promise((resolve, reject) => {
      const child = spawn(executable, argv, { windowsHide: true, shell: false, windowsVerbatimArguments: batch, ...options });
      this.child = child;
      let output = '';
      const timer = setTimeout(()=>{
        if(process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/t','/f'],{windowsHide:true});
        else child.kill('SIGTERM');
        const error=new Error(`${path.basename(exe)} timed out after ${Math.round((options.timeout??180000)/1000)} seconds.`);
        error.output=output; reject(error);
      }, options.timeout ?? 180000);
      const append = chunk => { output = (output + chunk.toString()).slice(-(options.maxOutput??2_000_000)); };
      child.stdout?.on('data', append); child.stderr?.on('data', append);
      child.on('error', e=>{ clearTimeout(timer); if(this.child===child)this.child=null; reject(e); });
      child.on('close', code=>{ clearTimeout(timer); if(this.child===child)this.child=null; resolve({ code, output }); });
    });
  }
  async detect() {
    if (this.compiler) return this.compiler;
    const ext = process.platform === 'win32' ? '.exe' : '';
    const candidates = [];
    if (process.env.TEXSUITE_XELATEX) candidates.push(process.env.TEXSUITE_XELATEX);
    const roots = [path.join(this.root,'tex','TinyTeX'), path.join(os.homedir(),'.TinyTeX'), path.join(os.homedir(),'Library','TinyTeX'), path.join(process.env.APPDATA||os.homedir(),'TinyTeX')];
    for (const root of roots) {
      const dirs = await fs.readdir(path.join(root,'bin')).catch(()=>[]);
      for (const dir of dirs) candidates.push(path.join(root,'bin',dir,`xelatex${ext}`));
    }
    candidates.push(...(process.env.PATH||'').split(path.delimiter).filter(Boolean).map(p=>path.join(p,`xelatex${ext}`)));
    if (process.platform === 'win32') candidates.push(
      path.join(process.env.ProgramFiles || 'C:\\Program Files','MiKTeX','miktex','bin','x64','xelatex.exe'),
      path.join(process.env.LOCALAPPDATA || os.homedir(),'Programs','MiKTeX','miktex','bin','x64','xelatex.exe'));
    else candidates.push('/Library/TeX/texbin/xelatex','/usr/bin/xelatex','/usr/local/bin/xelatex');
    for (const executable of [...new Set(candidates)]) {
      if (!(await fs.stat(executable).catch(()=>null))?.isFile()) continue;
      try {
        const r = await this.run(executable,['--version'],{timeout:10000});
        if (r.code===0) {
          const managed = executable.startsWith(path.join(this.root,'tex') + path.sep);
          this.compiler = { executable, bin: path.dirname(executable), distribution: /miktex/i.test(r.output) ? 'MiKTeX' : 'TeX Live', managed, version: r.output.split(/\r?\n/)[0] };
          return this.compiler;
        }
      } catch {}
    }
    return null;
  }
  async manager() {
    const c = await this.detect();
    if (!c) throw new Error('Set up a LaTeX compiler in Extensions first.');
    const exe = path.join(c.bin,process.platform==='win32'?'tlmgr.bat':'tlmgr');
    return (await fs.stat(exe).catch(()=>null)) ? exe : null;
  }
  async findFile(file) {
    const c=await this.detect();
    if(!c)return false;
    // kpsewhich in MiKTeX can install packages, even during a simple lookup.
    // findtexmf without -must-exist is a read-only lookup.
    const tool=c.distribution==='MiKTeX'?'findtexmf':'kpsewhich';
    const r=await this.run(path.join(c.bin,tool+(process.platform==='win32'?'.exe':'')),[file],{timeout:10000});
    if(r.code!==0)return false;
    for(const name of r.output.trim().split(/\r?\n/)){
      if(path.isAbsolute(name)&&(await fs.stat(name).catch(()=>null))?.isFile())return true;
    }
    return false;
  }
  async packageForFile(file,refresh=false) {
    if(!/^[a-zA-Z0-9_.-]+\.(sty|cls|def|cfg|fd|tfm|pfb|map|enc|bst|rtx|clo)$/.test(file))return null;
    const c=await this.detect();
    if(c.distribution==='MiKTeX'){
      const exe=path.join(c.bin,process.platform==='win32'?'miktex.exe':'miktex');
      if(refresh){
        this.progress('Refreshing the MiKTeX package catalog…');
        const updated=await this.run(exe,['packages','update-package-database'],{timeout:180000});
        if(updated.code!==0||/Sorry, but:/.test(updated.output))throw Error(updated.output||'MiKTeX package catalog refresh failed.');
        this.miktexFileIndex=null;
      }
      if(!this.miktexFileIndex){
        const result=await this.run(exe,['packages','list','--template={id}|{runFiles}\n'],{timeout:60000,maxOutput:40000000});
        if(result.code!==0)throw Error(result.output);
        this.miktexFileIndex=new Map();
        for(const line of result.output.split(/\r?\n/)){
          const sep=line.indexOf('|'),id=line.slice(0,sep);
          if(sep<0||!/^[a-zA-Z0-9-]+$/.test(id))continue;
          for(const name of line.slice(sep+1).split(';')){
            const base=name.replaceAll('\\','/').split('/').pop();
            if(base&&!this.miktexFileIndex.has(base))this.miktexFileIndex.set(base,id);
          }
        }
      }
      const pkg=this.miktexFileIndex.get(file);
      return pkg||(!refresh?this.packageForFile(file,true):null);
    }
    const manager=await this.manager();
    if(!manager)return null;
    const found=await this.run(manager,['search','--global','--file',`/${file}`],{timeout:90000});
    return found.output.match(/^([a-zA-Z0-9-]+):\s*$/m)?.[1]||null;
  }
  async download(asset, destination) {
    if (!/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? '')) throw new Error('The official release does not include a SHA-256 digest. Setup stopped before installation.');
    const response = await fetch(asset.browser_download_url, { signal:this.abort.signal });
    if (!response.ok) throw new Error(`Download failed (${response.status}).`);
    const hash = crypto.createHash('sha256'); let bytes=0;
    const meter = new Transform({ transform:(chunk, encoding, cb)=>{
      bytes += chunk.length; hash.update(chunk);
      this.progress(`Downloading TinyTeX · ${Math.round(bytes/1e6)} MB`, Math.min(75, bytes/asset.size*75)); cb(null,chunk);
    }});
    await pipeline(Readable.fromWeb(response.body),meter,createWriteStream(destination));
    if (`sha256:${hash.digest('hex')}` !== asset.digest) { await fs.unlink(destination); throw new Error('Compiler download failed its integrity check. Please retry.'); }
  }
  async install() {
    if (this.busy) throw new Error('Another compiler operation is running.');
    this.busy=true; this.cancelled=false; this.abort=new AbortController();
    try {
      const existing=await this.detect();
      if(existing) { this.progress(`${existing.distribution} is ready`,100); return existing; }
      this.progress('Finding the official TinyTeX release…',2);
      const response=await fetch('https://api.github.com/repos/rstudio/tinytex-releases/releases/latest',{headers:{'User-Agent':'TeX-Suite/0.1'},signal:this.abort.signal});
      if(!response.ok)throw new Error(`Could not read the official release (${response.status}). Check your internet connection.`);
      const release=await response.json();
      const arch=process.arch==='arm64'?'arm64':'x86_64';
      const pattern=process.platform==='win32'?/^TinyTeX-1-windows.*\.exe$/:
        process.platform==='darwin'?/^TinyTeX-1-darwin.*\.tar\.xz$/:
          new RegExp(`^TinyTeX-1-linux-${arch}.*\\.tar\\.xz$`);
      const asset=release.assets.find(a=>pattern.test(a.name));
      if(!asset)throw new Error(`No supported TinyTeX bundle was found for ${process.platform}/${process.arch}. Install TeX Live and use “Check again”.`);
      const parent=path.join(this.root,'tex'); await fs.mkdir(parent,{recursive:true});
      const staging=await fs.mkdtemp(path.join(parent,'setup-'));
      const archive=path.join(staging,asset.name);
      await this.download(asset,archive);
      this.progress('Unpacking your compiler…',80);
      let r;
      if(process.platform==='win32') r=await this.run(archive,['-y'],{cwd:staging,timeout:300000});
      else {
        const listing=await this.run('tar',['-tf',archive],{timeout:30000});
        if(listing.code!==0||listing.output.split('\n').some(p=>p.startsWith('/')||p.split('/').includes('..'))) throw new Error('Unsupported or unsafe compiler archive.');
        r=await this.run('tar',['-xf',archive,'-C',staging],{timeout:300000});
      }
      if(r.code!==0) throw new Error('Could not unpack TinyTeX. On Linux, verify that tar, xz and Perl are installed.\n'+r.output.slice(-1800));
      const folders=await fs.readdir(staging,{withFileTypes:true});
      const unpacked=folders.find(e=>e.isDirectory()&&/tinytex/i.test(e.name));
      if(!unpacked)throw new Error('The compiler archive has an unexpected layout.');
      const destination=path.join(parent,'TinyTeX');
      if(await fs.stat(destination).catch(()=>null)) throw new Error('A partial managed installation already exists. Use an existing TeX installation or remove only this app’s partial compiler folder before retrying.');
      await fs.rename(path.join(staging,unpacked.name),destination);
      this.compiler=null;
      const compiler=await this.detect();
      if(!compiler) throw new Error('TinyTeX was extracted but XeLaTeX could not start.');
      const manager=await this.manager();
      if(manager) {
        this.progress('Preparing fonts and core packages…',90);
        await this.run(manager,['postaction','install','script','xetex'],{timeout:180000});
        await this.installPackages(BUNDLES.essentials.packages);
      }
      await fs.unlink(archive).catch(()=>{});
      await fs.rmdir(staging).catch(()=>{});
      this.progress('Your LaTeX workspace is ready',100);
      return compiler;
    } finally { this.busy=false; this.abort=null; }
  }
  async installPackages(packages) {
    if(!packages.every(p=>/^[a-zA-Z0-9-]+$/.test(p))) throw new Error('Invalid package name.');
    const manager=await this.manager();
    if(!manager) {
      const c=await this.detect();
      if(c?.distribution==='MiKTeX') {
        const mpm=path.join(c.bin,process.platform==='win32'?'mpm.exe':'mpm');
        for(const pkg of packages) {
          const miktexName=({'xetex':null,'tex-gyre':'tex-gyre','graphics':'graphics','tools':'tools'})[pkg]??pkg;
          if(pkg==='xetex')continue;
          this.progress(`Installing ${miktexName} in your user account…`);
          const result=await this.run(mpm,[`--install=${miktexName}`],{timeout:600000});
          if(result.code!==0||/Sorry, but:|requested package is unknown/i.test(result.output))throw new Error(result.output.slice(-1500));
        }
        return;
      }
      throw new Error('This TeX installation uses a system package manager. Install packages there, or use the managed TinyTeX compiler.');
    }
    this.progress(`Installing ${packages.join(', ')}…`);
    let r=await this.run(manager,['install',...packages],{timeout:600000});
    if(/tlmgr itself needs to be updated/i.test(r.output)){
      const compiler=await this.detect();
      if(!compiler.managed)throw new Error('Your existing TeX Live package manager needs an update. Run “tlmgr update --self”, then retry this extension.');
      this.progress('Updating the managed TeX package manager…');
      const update=await this.run(manager,['update','--self'],{timeout:600000});
      if(update.code!==0)throw new Error(update.output.slice(-2000));
      r=await this.run(manager,['install',...packages],{timeout:600000});
    }
    if(r.code!==0)throw new Error(r.output.slice(-2000)||'Package installation failed.');
    // Some Windows tlmgr launchers return 0 even when the Perl command terminates.
    // Verify the local installation database before reporting successful setup.
    const compiler=await this.detect();
    const db=await fs.readFile(path.resolve(compiler.bin,'../../tlpkg/texlive.tlpdb'),'utf8').catch(()=>null);
    if(db){
      const installed=new Set([...db.matchAll(/^name (.+)\r?$/gm)].map(m=>m[1].trim()));
      const missing=packages.filter(p=>!installed.has(p));
      if(missing.length)throw new Error(`Packages were not installed: ${missing.join(', ')}.\n${r.output.slice(-1800)}`);
    }else if(/Terminating;|installation failed|not present in repository/i.test(r.output)){
      throw new Error(r.output.slice(-2000));
    }
  }
  async extensions(check = false) {
    // Opening the catalog must not launch MiKTeX package-discovery utilities.
    if (!check) return Object.entries(BUNDLES).map(([id,b])=>({id,title:b.title,packages:b.packages,installed:null}));
    const c=await this.detect();
    const result=[];
    for(const [id,b] of Object.entries(BUNDLES)) {
      let installed=false;
      if(c) {
        installed=true;
        for(const probe of b.probes??[b.probe]){
          if(!await this.findFile(probe).catch(()=>false)){installed=false;break;}
        }
      }
      result.push({id,title:b.title,packages:b.packages,installed});
    }
    return result;
  }
  async installExtension(id) {
    if(!BUNDLES[id])throw new Error('Unknown extension.');
    if(this.busy)throw new Error('Another compiler operation is running.');
    this.busy=true;this.cancelled=false;
    try { await this.installPackages(BUNDLES[id].packages); return await this.extensions(true); }
    finally {this.busy=false;}
  }
  async compile(source, assets=[], options={}) {
    if(this.busy)throw new Error('Another compiler operation is running.');
    if(typeof source!=='string'||source.length>2_000_000)throw new Error('The LaTeX source is too large.');
    this.busy=true;this.cancelled=false;
    let folder,output='';
    try {
      const c=await this.detect(); if(!c)throw new Error('Set up your compiler in Extensions first.');
      folder=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-'));
      await fs.mkdir(path.join(folder,'assets'));
      await fs.writeFile(path.join(folder,'main.tex'),source,'utf8');
      for(const file of options.files??[]){
        if(!/^(?:images\/)?[a-zA-Z0-9_.-]+\.(cls|bst|sty|cfg|rtx|clo|def|fd|pdf|eps)$/.test(file.name)||file.name.includes('..')||file.data.length>2000000)throw new Error('Invalid template resource.');
        await fs.mkdir(path.dirname(path.join(folder,file.name)),{recursive:true});
        await fs.writeFile(path.join(folder,file.name),file.data);
      }
      const engine=['xelatex','pdflatex','lualatex'].includes(options.engine)?options.engine:'xelatex';
      const executable=path.join(c.bin,engine+(process.platform==='win32'?'.exe':''));
      // Some classes silently substitute fonts when their optional font packages
      // are absent. Install the intended fonts before the first build.
      const requirements=[];
      if(engine==='pdflatex')requirements.push(['cm-super','sfrm1000.pfb']);
      if(/\\documentclass(?:\[[^\]]*\])?\{acmart\}/.test(source))requirements.push(['libertine','libertine.sty'],['inconsolata','zi4.sty'],['newtx','newtxmath.sty']);
      if(/\\documentclass(?:\[[^\]]*\])?\{tudabeamer\}/.test(source))requirements.push(['xcharter','XCharter.sty'],['roboto','roboto.sty'],['roboto','roboto-mono.sty']);
      if(/\\usetheme(?:\[[^\]]*\])?\{SaintPetersburg\}/.test(source))requirements.push(['oldstandard','OldStandard-Regular.otf'],['fira','FiraMono.sty'],['opensans','opensans.sty']);
      if(/\{USG\}|\\usepackage\[english\]\{babel\}/.test(source))requirements.push(['babel-english','english.ldf']);
      const missingRequirements=[];
      for(const [pkg,probe] of requirements){
        if(!await this.findFile(probe))missingRequirements.push(pkg);
      }
      if(missingRequirements.length)await this.installPackages(missingRequirements);
      for(const asset of assets) {
        if(!/^[a-zA-Z0-9-]+\.(png|jpg)$/.test(asset.name)||asset.data.length>30_000_000)throw new Error('Invalid image asset.');
        await fs.writeFile(path.join(folder,'assets',asset.name),Buffer.from(asset.data,'base64'));
      }
      const env={...process.env,PATH:`${c.bin}${path.delimiter}${process.env.PATH||''}`,openin_any:'p',openout_any:'p',shell_escape:'f'};
      let result,autoPackages=0;const repaired=new Set();
      for(let pass=0;pass<2;pass++) {
        this.progress(`Compiling ${pass+1}/2…`);
        const args=['-no-shell-escape','-interaction=nonstopmode','-halt-on-error', ...(c.distribution==='MiKTeX'?['--disable-installer']:[]), 'main.tex'];
        result=await this.run(executable,args,{cwd:folder,env,timeout:c.distribution==='MiKTeX'?600000:180000});
        output+=result.output;
        if(result.code!==0) {
          const missing=result.output.match(/File [`']([^`'\r\n]+\.(?:sty|cls|def|cfg|fd|bst|rtx|clo))['’] not found/);
          if(missing&&autoPackages<50&&!repaired.has(missing[1])) {
            this.progress(`Finding missing package: ${missing[1]}`);
            const pkg=await this.packageForFile(missing[1]);
            if(pkg) {
              await this.installPackages([pkg]);
              if(!await this.findFile(missing[1]))throw Error(`${pkg} installation did not provide ${missing[1]}.`);
              repaired.add(missing[1]);autoPackages++;pass--;continue;
            }
          }
          return {ok:false,log:output.slice(-30000),message:this.cancelled?'Compilation cancelled.':'LaTeX could not compile this document.'};
        }
      }
      const pdf=await fs.readFile(path.join(folder,'main.pdf'));
      this.lastPdf={data:pdf};
      this.progress('PDF is ready',100);
      return {ok:true,pdf:pdf.toString('base64'),log:output.slice(-30000),bytes:pdf.length};
    } catch(error) {
      const texLog=folder?await fs.readFile(path.join(folder,'main.log'),'utf8').catch(()=>''):'';
      const log=[output,error.output||'',texLog,error.message].filter(Boolean).join('\n').slice(-60000);
      const logDir=path.join(this.root,'logs');await fs.mkdir(logDir,{recursive:true});
      const logPath=path.join(logDir,'last-compile.log');await fs.writeFile(logPath,log);
      return {ok:false,message:this.cancelled?'Compilation cancelled.':error.message,log:`${log}\n\nSaved log: ${logPath}`};
    } finally {
      this.busy=false;
      if(folder&&path.dirname(folder)===os.tmpdir()&&path.basename(folder).startsWith('texsuite-'))await fs.rm(folder,{recursive:true,force:true}).catch(()=>{});
    }
  }
  cancel() {
    this.cancelled=true;this.abort?.abort();
    if(this.child?.pid) {
      if(process.platform==='win32') spawn('taskkill',['/pid',String(this.child.pid),'/t','/f'],{windowsHide:true});
      else this.child.kill('SIGTERM');
    }
  }
}
module.exports={TexService,BUNDLES};

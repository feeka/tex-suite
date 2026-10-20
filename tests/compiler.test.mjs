import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const require=createRequire(import.meta.url),{TexService}=require('../electron/tex-service.cjs');
test('extension catalog never launches compiler or package utilities',async()=>{
  const s=new TexService('.');
  s.detect=async()=>{throw Error('Unexpected compiler detection');};
  s.run=async()=>{throw Error('Unexpected process launch');};
  const catalog=await s.extensions();
  assert.equal(catalog.length,7);
  assert.ok(catalog.every(b=>b.installed===null));
});
test('explicit extension check probes installed packages',async()=>{
  const s=new TexService('.'),commands=[];
  s.detect=async()=>({bin:'/fake/tex'});
  s.findFile=async file=>{commands.push(file);return true;};
  const catalog=await s.extensions(true);
  assert.ok(commands.length>7);
  assert.ok(catalog.every(b=>b.installed===true));
});
test('MiKTeX file checks use non-installing findtexmf and verify the returned file',async()=>{
  const s=new TexService('.'),commands=[];
  s.detect=async()=>({bin:'/fake/tex',distribution:'MiKTeX'});
  s.run=async(exe,args)=>{commands.push({exe,args});return {code:0,output:path.resolve('package.json')};};
  assert.equal(await s.findFile('article.cls'),true);
  assert.match(commands[0].exe,/findtexmf/);
  assert.deepEqual(commands[0].args,['article.cls']);
  s.run=async()=>({code:0,output:'/missing/not-installed.cls'});
  assert.equal(await s.findFile('not-installed.cls'),false);
});
test('compile timeout preserves diagnostic output instead of rejecting IPC',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-timeout-'));
  const s=new TexService(root);
  s.detect=async()=>({bin:'/fake/tex',distribution:'TeX Live'});
  s.run=async()=>{const e=Error('xelatex timed out');e.output='Last diagnostic line';throw e;};
  const result=await s.compile('\\documentclass{article}\\begin{document}Test\\end{document}');
  assert.equal(result.ok,false);
  assert.match(result.log,/Last diagnostic line/);
  assert.match(await fs.readFile(path.join(root,'logs/last-compile.log'),'utf8'),/Last diagnostic line/);
  assert.equal(s.busy,false);
});
test('managed package setup updates tlmgr and verifies installed packages',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-test-'));
  await fs.mkdir(path.join(root,'tlpkg'),{recursive:true});
  await fs.writeFile(path.join(root,'tlpkg/texlive.tlpdb'),'name beamer\n');
  const s=new TexService(root),commands=[];
  s.manager=async()=>'/fake/tlmgr';
  s.detect=async()=>({managed:true,bin:path.join(root,'bin/windows')});
  s.run=async(_exe,args)=>{
    commands.push(args);
    return {code:0,output:commands.length===1?'tlmgr itself needs to be updated.':'Installed'};
  };
  await s.installPackages(['beamer']);
  assert.deepEqual(commands,[['install','beamer'],['update','--self'],['install','beamer']]);
});
test('zero exit code does not hide a missing TeX package',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-test-'));
  await fs.mkdir(path.join(root,'tlpkg'),{recursive:true});
  await fs.writeFile(path.join(root,'tlpkg/texlive.tlpdb'),'name latex\n');
  const s=new TexService(root);
  s.manager=async()=>'/fake/tlmgr';
  s.detect=async()=>({managed:true,bin:path.join(root,'bin/windows')});
  s.run=async()=>({code:0,output:'Terminating; package unavailable.'});
  await assert.rejects(()=>s.installPackages(['beamer']),/Packages were not installed: beamer/);
});
test('package arguments cannot become shell commands',async()=>{
  const s=new TexService('.');
  await assert.rejects(()=>s.installPackages(['beamer & whoami']),/Invalid package name/);
});
test('MiKTeX resolves filenames from package metadata, refreshing a stale catalog',async()=>{
  const s=new TexService('.'),commands=[];let refreshed=false;
  s.detect=async()=>({bin:'/fake',distribution:'MiKTeX'});
  s.run=async(exe,args)=>{
    commands.push(args);
    if(args[1]==='update-package-database'){refreshed=true;return {code:0,output:''};}
    return {code:0,output:refreshed?'sttools|texmf/tex/latex/sttools/flushend.sty;texmf/tex/latex/sttools/stfloats.sty\n':'amsmath|texmf/tex/latex/amsmath/amsmath.sty\n'};
  };
  assert.equal(await s.packageForFile('flushend.sty'),'sttools');
  const n=commands.length;
  assert.equal(await s.packageForFile('stfloats.sty'),'sttools');
  assert.equal(commands.length,n);
});
test('MiKTeX repairs missing template dependencies and retries before reporting success',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-repair-')),s=new TexService(root);
  let installed=false,passes=0;
  s.detect=async()=>({bin:'/fake',distribution:'MiKTeX'});
  s.findFile=async file=>file!=='flushend.sty'||installed;
  s.packageForFile=async file=>{assert.equal(file,'flushend.sty');return 'sttools';};
  s.installPackages=async packages=>{assert.deepEqual(packages,['sttools']);installed=true;};
  s.run=async(exe,args,opts)=>{
    assert.ok(args.includes('--disable-installer'));passes++;
    if(!installed)return {code:1,output:"! LaTeX Error: File `flushend.sty' not found."};
    await fs.writeFile(path.join(opts.cwd,'main.pdf'),'%PDF-test');
    return {code:0,output:'Document built'};
  };
  const result=await s.compile('\\documentclass{article}\\begin{document}Test\\end{document}',[],{engine:'pdflatex'});
  assert.equal(result.ok,true);assert.equal(passes,3);
});

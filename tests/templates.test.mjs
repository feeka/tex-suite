import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Zip=require('adm-zip');
const {SOURCES,prepareTemplate,templateFiles}=require('../electron/native-templates.cjs');
test('selection downloads the original archive once and compiles with its real class',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'texsuite-templates-'));
  const zip=new Zip();zip.addFile('journal/journal.cls',Buffer.from('% Publisher class'));
  zip.addFile('journal/example.tex',Buffer.from('\\documentclass{journal}'));
  const data=zip.toBuffer();
  SOURCES.testjournal={name:'Test journal',folder:'testjournal',url:'https://example.org/template.zip',sha:crypto.createHash('sha256').update(data).digest('hex')};
  const originalFetch=globalThis.fetch;let requests=0;
  globalThis.fetch=async()=>{requests++;return new Response(data);};
  try{
    const [a,b]=await Promise.all([prepareTemplate('testjournal',root),prepareTemplate('testjournal',root)]);
    assert.equal(requests,1);assert.equal(a.status,'downloaded');assert.equal(b.sha256,a.sha256);
    assert.deepEqual(a.examples,['journal/example.tex']);
    const files=await templateFiles({flow:{publisherId:'testjournal'}},root);
    assert.equal(requests,1);assert.equal(files[0].name,'journal.cls');
    assert.equal(files[0].data.toString(),'% Publisher class');
    assert.deepEqual(await fs.readFile(a.archive),data);
    await fs.writeFile(a.archive,'corrupt');
    await prepareTemplate('testjournal',root);assert.equal(requests,2);
    SOURCES.testjournal.sha='0'.repeat(64);
    await assert.rejects(()=>prepareTemplate('testjournal',root),/checksum/);
  }finally{globalThis.fetch=originalFetch;delete SOURCES.testjournal;}
});

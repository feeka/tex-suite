import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const repository=process.argv[2]||process.env.GITHUB_REPOSITORY;
if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository||'')){
  throw new Error('Pass owner/repository as the first argument, or set GITHUB_REPOSITORY.');
}
const {version}=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const repositoryUrl=`https://github.com/${repository}`;
const releaseUrl=`${repositoryUrl}/releases/tag/v${version}`;
const asset=name=>`${repositoryUrl}/releases/download/v${version}/${encodeURIComponent(`TeX Suite-${version}-${name}`)}`;
const values={
  VERSION:version,
  REPOSITORY_URL:repositoryUrl,
  RELEASE_URL:releaseUrl,
  WINDOWS_X64:asset('win-x64.exe'),
  MAC_X64:asset('mac-x64.dmg'),
  MAC_ARM64:asset('mac-arm64.dmg'),
  LINUX_X64_APPIMAGE:asset('linux-x64.AppImage'),
  LINUX_ARM64_APPIMAGE:asset('linux-arm64.AppImage'),
  LINUX_X64_DEB:asset('linux-x64.deb'),
  LINUX_ARM64_DEB:asset('linux-arm64.deb'),
};
let html=await readFile(join(root,'docs','index.html'),'utf8');
for(const [key,value] of Object.entries(values))html=html.replaceAll(`{{${key}}}`,value);
if(/\{\{[A-Z_]+\}\}/.test(html))throw new Error('Unresolved landing-page placeholder.');
const out=join(root,'site');
await mkdir(out,{recursive:true});
await writeFile(join(out,'index.html'),html);
await copyFile(join(root,'docs','style.css'),join(out,'style.css'));
await copyFile(join(root,'build','icon.png'),join(out,'icon.png'));
console.log(`Built landing page for ${repository} v${version} in ${out}`);

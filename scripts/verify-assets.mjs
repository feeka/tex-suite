import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const names=new Set(readdirSync(resolve(process.argv[2]||'release-assets')));
const expected=[
  `TeX Suite-${version}-win-x64.exe`,
  `TeX Suite-${version}-mac-x64.dmg`,
  `TeX Suite-${version}-mac-arm64.dmg`,
  `TeX Suite-${version}-linux-x64.AppImage`,
  `TeX Suite-${version}-linux-arm64.AppImage`,
  `TeX Suite-${version}-linux-x64.deb`,
  `TeX Suite-${version}-linux-arm64.deb`,
];
const missing=expected.filter(name=>!names.has(name));
if(missing.length){
  console.error(`Missing release files:\n${missing.join('\n')}`);
  process.exitCode=1;
}else console.log(`All ${expected.length} release files are present.`);

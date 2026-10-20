import {readFileSync} from 'node:fs';

const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const tag=process.env.GITHUB_REF_NAME;
if(tag!==`v${version}`){
  console.error(`Release tag ${tag||'(missing)'} does not match package version v${version}.`);
  process.exitCode=1;
}else console.log(`Release tag ${tag} matches package version.`);

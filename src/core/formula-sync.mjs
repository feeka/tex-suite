import {projectToLatex} from './latex.mjs';
import {validFormula} from './science.mjs';

// Match an edited source against the generated document with only its formula
// bodies replaced by slots. Other LaTeX changes remain custom source.
export function syncFormulaSource(project, editedSource){
  if(project.sourceOverride!=null)return null;
  const template=structuredClone(project),formulas=[];
  const add=node=>{
    const token=`TEXSUITEMATHSLOT${String(formulas.length).padStart(5,'0')}`;
    formulas.push({node,token});
    node.latex=token;
  };
  if(template.flow){
    const walk=node=>{
      if(node.type==='inlineMath'||node.type==='displayMath'){
        const token=`TEXSUITEMATHSLOT${String(formulas.length).padStart(5,'0')}`;
        formulas.push({node,token});node.attrs.latex=token;
      }
      node.content?.forEach(walk);
    };
    walk(template.flow.doc);
  }else for(const page of template.pages)for(const element of page.elements)if(element.type==='formula')add(element);
  if(!formulas.length)return null;
  const source=projectToLatex(template);
  const parts=[];let start=0;
  for(const {token} of formulas){
    const at=source.indexOf(token,start);
    if(at<0)return null;
    parts.push(source.slice(start,at));start=at+token.length;
  }
  parts.push(source.slice(start));
  if(!editedSource.startsWith(parts[0]))return null;
  const values=[];let cursor=parts[0].length;
  for(let i=0;i<formulas.length;i++){
    const at=editedSource.indexOf(parts[i+1],cursor);
    if(at<0)return null;
    const value=editedSource.slice(cursor,at);
    if(!validFormula(value))return null;
    values.push(value);cursor=at+parts[i+1].length;
  }
  if(cursor!==editedSource.length)return null;
  let index=0;
  if(template.flow){
    const walk=node=>{if(node.type==='inlineMath'||node.type==='displayMath')node.attrs.latex=values[index++];node.content?.forEach(walk);};
    walk(template.flow.doc);
  }else for(const page of template.pages)for(const element of page.elements)if(element.type==='formula')element.latex=values[index++];
  return template;
}

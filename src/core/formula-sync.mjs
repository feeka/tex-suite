import {projectToLatex} from './latex.mjs';
import {validFormula,validLabel} from './science.mjs';

const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// Recognize edits confined to generated equation bodies and labels. All other
// source changes stay in custom-source mode, so they are never silently lost.
export function syncFormulaSource(project,editedSource){
  const template=structuredClone(project),formulas=[];
  const add=(node,isFlow,hasLabel)=>{
    const index=formulas.length;
    const mathToken=`TEXSUITEMATHSLOT${String(index).padStart(5,'0')}`;
    const labelToken=hasLabel?`TEXSUITELABELSLOT${String(index).padStart(5,'0')}`:null;
    formulas.push({node,isFlow,mathToken,labelToken});
    if(isFlow){node.attrs.latex=mathToken;if(hasLabel)node.attrs.label=labelToken;}
    else {node.latex=mathToken;node.label=labelToken;}
  };
  if(template.flow){
    const walk=node=>{if(node.type==='inlineMath'||node.type==='displayMath')add(node,true,node.type==='displayMath');node.content?.forEach(walk);};
    walk(template.flow.doc);
  }else for(const page of template.pages)for(const element of page.elements)if(element.type==='formula')add(element,false,true);
  if(!formulas.length)return null;
  const source=projectToLatex(template),slots=[];
  for(let index=0;index<formulas.length;index++){
    const {mathToken,labelToken}=formulas[index];
    const mathAt=source.indexOf(mathToken);
    if(mathAt<0)return null;
    slots.push({start:mathAt,end:mathAt+mathToken.length,index,kind:'math'});
    if(labelToken){
      const command=`\\label{${labelToken}}`,labelAt=source.indexOf(command);
      if(labelAt<0)return null;
      const trailingNewline=formulas[index].isFlow&&source[labelAt+command.length]==='\n';
      slots.push({start:labelAt,end:labelAt+command.length+(trailingNewline?1:0),index,kind:'label',trailingNewline});
    }
  }
  slots.sort((a,b)=>a.start-b.start);
  let pattern='^',cursor=0;
  for(const slot of slots){
    pattern+=escapePattern(source.slice(cursor,slot.start));
    pattern+=slot.kind==='math'?'([\\s\\S]*?)':String.raw`(?:\\label\{([^{}]*)\}`+(slot.trailingNewline?'\n':'')+')?';
    cursor=slot.end;
  }
  pattern+=escapePattern(source.slice(cursor))+'$';
  const match=new RegExp(pattern).exec(editedSource);
  if(!match)return null;
  const values=formulas.map(()=>({latex:null,label:''}));
  slots.forEach((slot,i)=>{values[slot.index][slot.kind==='math'?'latex':'label']=match[i+1]??'';});
  if(values.some(({latex,label})=>!validFormula(latex)||(label&&!validLabel(label))))return null;
  for(let i=0;i<formulas.length;i++){
    const {node,isFlow}=formulas[i],{latex,label}=values[i];
    if(isFlow){node.attrs.latex=latex;if(formulas[i].labelToken)node.attrs.label=label;}
    else {node.latex=latex;node.label=label;}
  }
  template.sourceOverride=null;
  return template;
}

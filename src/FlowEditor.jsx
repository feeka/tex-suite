import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useEditor,EditorContent,NodeViewWrapper,ReactNodeViewRenderer} from '@tiptap/react';
import {Node} from '@tiptap/core';
import {DOMParser as ProseMirrorParser} from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import {TextStyleKit} from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import {TableKit} from '@tiptap/extension-table';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CodeMirror from '@uiw/react-codemirror';
import {StreamLanguage} from '@codemirror/language';
import {EditorView} from '@codemirror/view';
import {stex} from '@codemirror/legacy-modes/mode/stex';
import {publishers,publisherById} from './core/catalog.mjs';
import {flowText} from './core/flow.mjs';
import {palettes} from './core/model.mjs';
import {Bold,Italic,Underline,Strikethrough,Undo2,Redo2,List,ListOrdered,AlignLeft,AlignCenter,AlignRight,AlignJustify,ImagePlus,Table2,Search,Link,FileText,Code2,Columns2,Download,Upload,Plus,Minus,GripVertical,Trash2,LayoutGrid} from 'lucide-react';
import './flow.css';
const latexExtensions=[StreamLanguage.define(stex),EditorView.lineWrapping];

function WidthInput({label,value,min,max,onCommit,unit}){
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  const commit=(raw,clamp=false)=>{
    const number=Number(raw);
    if(!Number.isFinite(number)||raw.trim()===''){if(clamp)setDraft(String(value));return;}
    if(!clamp&&(number<min||number>max))return;
    const next=Math.round(Math.min(max,Math.max(min,number)));
    setDraft(String(next));if(next!==value)onCommit(next);
  };
  return <span className="figure-width-control"><label>{label} <input aria-label={label} type="number" min={min} max={max} step="1" value={draft} onChange={e=>{setDraft(e.target.value);commit(e.target.value);}} onBlur={e=>commit(e.target.value,true)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label><span>{unit}</span></span>;
}
function SingleImageView({node,updateAttributes,selected}){
  const wrap=['left','right'].includes(node.attrs.wrap)?node.attrs.wrap:'none';
  const width=Math.min(660,Math.max(60,Number(node.attrs.width)||300));
  const percent=Math.round(width/660*100);
  return <NodeViewWrapper className={`manuscript-image ${selected?'selected':''}`} contentEditable={false} style={{width:`${percent}%`,float:wrap==='none'?'none':wrap}}>
    <img src={node.attrs.src} alt={node.attrs.alt||'Inserted figure'}/>
    <div className="manuscript-image-controls"><WidthInput label="Image width" value={percent} min={10} max={wrap==='none'?100:55} unit="%" onCommit={next=>updateAttributes({width:Math.round(next*6.6)})}/><select aria-label="Image wrapping" value={wrap} onChange={e=>updateAttributes({wrap:e.target.value,width:e.target.value==='none'?width:Math.min(width,360)})}><option value="none">No wrap</option><option value="left">Wrap left</option><option value="right">Wrap right</option></select></div>
  </NodeViewWrapper>;
}
const WrappedImage=Image.extend({
  addAttributes(){return {...this.parent?.(),width:{default:300},wrap:{default:'none',parseHTML:el=>el.style.float||'none',renderHTML:attrs=>({'data-wrap':attrs.wrap,style:`float:${attrs.wrap==='left'||attrs.wrap==='right'?attrs.wrap:'none'};width:${Math.min(660,Math.max(60,Number(attrs.width)||300))}px`})}};},
  addNodeView(){return ReactNodeViewRenderer(SingleImageView);}
});
const PageBreak=Node.create({name:'pageBreak',group:'block',atom:true,parseHTML(){return[{tag:'div[data-page-break]'}];},renderHTML(){return['div',{'data-page-break':'true',class:'document-page-break'},'Page break'];}});
async function imagePanel(file){
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>15000000)throw new Error('Choose PNG, JPEG or WebP figures under 15 MB each.');
  const url=URL.createObjectURL(file);
  try{const img=new window.Image();img.src=url;await img.decode();const canvas=document.createElement('canvas'),ratio=Math.min(1,2400/img.width,2400/img.height);canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return{src:canvas.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png'),alt:file.name,caption:'',width:100};}finally{URL.revokeObjectURL(url);}
}
function FigureGroupView({node,updateAttributes,deleteNode,selected}){
  const fileInput=useRef(),dragFrom=useRef(null),attrs=node.attrs,panels=attrs.panels||[];
  const updatePanel=(index,patch)=>updateAttributes({panels:panels.map((panel,i)=>i===index?{...panel,...patch}:panel)});
  const add=async files=>{try{const added=await Promise.all([...files].slice(0,12-panels.length).map(imagePanel));updateAttributes({panels:[...panels,...added]});}catch(error){window.alert(error.message);}};
  const move=(from,to)=>{if(from===to||from==null)return;const next=[...panels],item=next.splice(from,1)[0];next.splice(to,0,item);updateAttributes({panels:next});};
  const beginReorder=(event,index)=>{
    event.preventDefault();event.stopPropagation();dragFrom.current=index;document.body.classList.add('figure-panel-reordering');
    const targetAt=e=>e.target?.closest?.('.figure-panel')||document.elementsFromPoint(e.clientX,e.clientY).find(el=>el.classList?.contains('figure-panel'));
    const moving=e=>{document.querySelectorAll('.figure-panel.drop-target').forEach(el=>el.classList.remove('drop-target'));targetAt(e)?.classList.add('drop-target');};
    const finish=e=>{const target=targetAt(e),to=Number(target?.dataset.panelIndex);document.querySelectorAll('.figure-panel.drop-target').forEach(el=>el.classList.remove('drop-target'));document.body.classList.remove('figure-panel-reordering');document.removeEventListener('mousemove',moving,true);dragFrom.current=null;if(Number.isInteger(to))move(index,to);};
    document.addEventListener('mousemove',moving,true);document.addEventListener('mouseup',finish,{capture:true,once:true});
  };
  return <NodeViewWrapper className={`figure-group ${attrs.layout} ${selected?'selected':''}`} contentEditable={false}>
    <div className="figure-group-toolbar"><LayoutGrid size={14}/><strong>Figure group</strong><select aria-label="Figure arrangement" value={attrs.layout} onChange={e=>updateAttributes({layout:e.target.value})}><option value="row">Side by side</option><option value="column">One below another</option><option value="grid">2-column grid</option></select><select aria-label="Figure span" value={attrs.width} onChange={e=>updateAttributes({width:e.target.value})}><option value="column">Journal column</option><option value="full">Full page width</option></select><button aria-label="Add figures to group" onClick={()=>fileInput.current.click()}><Plus size={13}/>Add</button><button aria-label="Delete figure group" onClick={deleteNode}><Trash2 size={13}/></button><input ref={fileInput} hidden multiple type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{add(e.target.files);e.target.value='';}}/></div>
    <div className="figure-panels">
      {panels.map((panel,index)=><div className="figure-panel" data-panel-index={index} key={`${panel.alt}-${index}`}>
        <button className="figure-panel-grip" aria-label={`Drag panel ${index+1}`} onMouseDown={e=>beginReorder(e,index)}><GripVertical size={13}/></button>
        <div className="figure-panel-image" style={{width:`${Math.max(10,Number(panel.width)||100)}%`}}><span>{String.fromCharCode(65+index)}</span><img src={panel.src} alt={panel.alt}/></div>
        <input aria-label={`Panel ${index+1} caption`} placeholder={`Panel ${String.fromCharCode(65+index)} caption`} value={panel.caption} onChange={e=>updatePanel(index,{caption:e.target.value})}/>
        <div className="figure-panel-size"><WidthInput label={`Panel ${index+1} width`} value={panel.width} min={10} max={100} unit="%" onCommit={next=>updatePanel(index,{width:next})}/><input aria-label={`Panel ${index+1} width slider`} type="range" min="10" max="100" value={panel.width} onChange={e=>updatePanel(index,{width:Number(e.target.value)})}/></div>
        <div className="figure-panel-actions"><button aria-label={`Move panel ${index+1} left`} disabled={index===0} onClick={()=>move(index,index-1)}>←</button><button aria-label={`Move panel ${index+1} right`} disabled={index===panels.length-1} onClick={()=>move(index,index+1)}>→</button><button aria-label={`Remove panel ${index+1}`} onClick={()=>panels.length===1?deleteNode():updateAttributes({panels:panels.filter((_,i)=>i!==index)})}><Trash2 size={12}/></button></div>
      </div>)}
    </div>
    <input className="figure-shared-caption" aria-label="Shared figure caption" placeholder="Shared figure caption" value={attrs.caption} onChange={e=>updateAttributes({caption:e.target.value})}/>
    <small>Drag panels to reorder them. The journal class controls final page placement.</small>
  </NodeViewWrapper>;
}
const FigureGroup=Node.create({name:'figureGroup',group:'block',atom:true,selectable:true,draggable:false,addAttributes(){return{layout:{default:'row'},width:{default:'column'},caption:{default:''},panels:{default:[]}};},parseHTML(){return[{tag:'figure[data-figure-group]'}];},renderHTML({node}){return['figure',{'data-figure-group':'true','data-layout':node.attrs.layout},['figcaption',{},node.attrs.caption||'Figure group']];},addNodeView(){return ReactNodeViewRenderer(FigureGroupView);}});
export function FlowEditor({project,onChange,source,mode,setMode,compiled,compile,compileBusy,notify}){
  const latest=useRef(project);latest.current=project;
  const sourceRef=useRef(source);sourceRef.current=source;
  const onChangeRef=useRef(onChange);onChangeRef.current=onChange;
  const onSourceChange=useCallback(value=>{
    if(value===sourceRef.current)return;
    sourceRef.current=value;
    onChangeRef.current({...latest.current,sourceOverride:value});
  },[]);
  const [revision,refresh]=useState(0),[find,setFind]=useState(''),[replacement,setReplacement]=useState(''),[searchOpen,setSearchOpen]=useState(false),[linkOpen,setLinkOpen]=useState(false),[link,setLink]=useState(''),[metaOpen,setMetaOpen]=useState(false);
  const imageInput=useRef(),figureInput=useRef(),wordInput=useRef();
  const [templateState,setTemplateState]=useState({status:'idle'});
  useEffect(()=>{
    let alive=true;
    if(!window.texSuite?.prepareTemplate){setTemplateState({status:'desktop'});return;}
    setTemplateState({status:'downloading'});
    window.texSuite.prepareTemplate(project.flow.publisherId).then(info=>{
      if(alive)setTemplateState(info);
    }).catch(error=>{if(alive)setTemplateState({status:'error',message:error.message});});
    return()=>{alive=false;};
  },[project.flow.publisherId,project.id]);
  const lastTypeset=useRef(''),[liveFailure,setLiveFailure]=useState(false);
  useEffect(()=>{
    if(!window.texSuite||project.flow.publisherId==='article'||templateState.status!=='downloaded'||compileBusy)return;
    const revision=project.id+'\n'+source;
    if(lastTypeset.current===revision||compiled?.revision===project.updatedAt&&compiled?.projectId===project.id)return;
    const timer=setTimeout(()=>{
      lastTypeset.current=revision;
      setLiveFailure(false);
      compile({preserveMode:true,quiet:true}).then(ok=>setLiveFailure(ok===false));
    },1200);
    return()=>clearTimeout(timer);
  },[source,project.id,project.updatedAt,templateState.status,compileBusy,compiled?.revision]);
  const updateFlow=patch=>{if(latest.current.sourceOverride!=null){notify('Restore generated source before changing the visual manuscript.');return;}onChange({...latest.current,flow:{...latest.current.flow,...patch}});};
  const editor=useEditor({
    extensions:[StarterKit.configure({link:{openOnClick:false}}),TextStyleKit,TextAlign.configure({types:['heading','paragraph']}),WrappedImage.configure({allowBase64:true}),FigureGroup,TableKit.configure({table:{resizable:true}}),Subscript,Superscript,PageBreak],
    content:project.flow.doc,
    editorProps:{attributes:{class:'manuscript-prose','aria-label':'Manuscript text',role:'textbox',spellcheck:'true'},handleDrop:(_view,event)=>{const file=event.dataTransfer?.files?.[0];if(file?.type.startsWith('image/')){event.preventDefault();insertImage(file);return true;}return false;}},
    onUpdate:({editor})=>{updateFlow({doc:editor.getJSON()});refresh(n=>n+1);},
    onSelectionUpdate:()=>refresh(n=>n+1),
    onTransaction:()=>refresh(n=>n+1),
  },[project.id]);
  useEffect(()=>{if(editor&&JSON.stringify(editor.getJSON())!==JSON.stringify(project.flow.doc))editor.commands.setContent(project.flow.doc,{emitUpdate:false});},[project.flow.doc]);
  useEffect(()=>{editor?.setEditable(project.sourceOverride==null);},[project.sourceOverride,editor]);
  useEffect(()=>{const key=e=>{if(mode==='code'||mode==='preview')return;if((e.ctrlKey||e.metaKey)&&['f','h'].includes(e.key.toLowerCase())){e.preventDefault();setSearchOpen(true);requestAnimationFrame(()=>document.querySelector('input[aria-label="Find text"]')?.focus());}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[mode]);
  const chain=()=>editor?.chain().focus();
  const insertBlock=content=>editor.chain().focus().insertContentAt(editor.state.selection.to,content).run();
  function action(label,Icon,fn,active=false){return <button title={label} aria-label={label} className={active?'active':''} onMouseDown={e=>e.preventDefault()} onClick={fn}><Icon size={16}/></button>;}
  async function insertImage(file){
    if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>15000000){notify('Choose a PNG, JPEG or WebP image under 15 MB.');return;}
    const url=URL.createObjectURL(file);
    try{const img=new window.Image();img.src=url;await img.decode();const c=document.createElement('canvas'),ratio=Math.min(1,2000/img.width,2000/img.height);c.width=img.width*ratio;c.height=img.height*ratio;c.getContext('2d').drawImage(img,0,0,c.width,c.height);insertBlock({type:'image',attrs:{src:c.toDataURL('image/png'),alt:file.name,width:Math.min(400,img.width),wrap:'none'}});}finally{URL.revokeObjectURL(url);}
  }
  async function insertFigureGroup(files){
    try{const panels=await Promise.all([...files].slice(0,12).map(imagePanel));if(panels.length)insertBlock({type:'figureGroup',attrs:{layout:panels.length>2?'grid':'row',width:'column',caption:'',panels}});}catch(error){notify(error.message);}
  }
  function matches(){const out=[];if(!find)return out;editor.state.doc.descendants((n,pos)=>{if(!n.isText)return;let i=0;while((i=n.text.toLocaleLowerCase().indexOf(find.toLocaleLowerCase(),i))>=0){out.push({from:pos+i,to:pos+i+find.length});i+=find.length;}});return out;}
  function findNext(){const all=matches(),pos=editor.state.selection.to,m=all.find(m=>m.from>=pos)||all[0];if(m)editor.chain().focus().setTextSelection(m).scrollIntoView().run();else notify('No matches found.');}
  function replaceAll(){const all=matches();let tr=editor.state.tr;for(const m of all.reverse())tr=tr.insertText(replacement,m.from,m.to);editor.view.dispatch(tr);notify(`Replaced ${all.length} matches.`);}
  async function importWord(file){
    if(!file)return;
    if(file.size>30000000){notify('Choose a Word document under 30 MB.');return;}
    try{
      const mammoth=await import('mammoth/mammoth.browser.js');
      const result=await (mammoth.default||mammoth).convertToHtml({arrayBuffer:await file.arrayBuffer()},{styleMap:[
        "p[style-name='Title'] => h1.ts-title:fresh",
        "p[style-name='TeX Suite Authors'] => p.ts-authors:fresh",
        "p[style-name='TeX Suite Affiliation'] => p.ts-affiliation:fresh",
        "p[style-name='TeX Suite Abstract Heading'] => p.ts-abstract-heading:fresh",
        "p[style-name='TeX Suite Abstract'] => p.ts-abstract:fresh",
      ]});
      const doc=new DOMParser().parseFromString(result.value,'text/html'),metadata={};
      const title=doc.querySelector('.ts-title')?.textContent;
      for(const key of ['authors','affiliation','abstract']){const el=doc.querySelector(`.ts-${key}`);if(el)metadata[key]=el.textContent;}
      doc.querySelectorAll('.ts-title,.ts-authors,.ts-affiliation,.ts-abstract,.ts-abstract-heading').forEach(el=>el.remove());
      const imported=structuredClone(latest.current);
      imported.id=crypto.randomUUID();imported.sourceOverride=null;
      imported.title=title||file.name.replace(/\.docx$/i,'');
      imported.flow={...imported.flow,...metadata,doc:ProseMirrorParser.fromSchema(editor.schema).parse(doc.body).toJSON()};
      await onChange(imported);
      notify('Word imported as a new document. Review complex formatting before submission.');
    }catch(e){notify(`Could not import Word document: ${e.message}`);}
  }
  async function exportWord(){try{const {exportDocx}=await import('./core/word.mjs');const blob=await exportDocx(latest.current);if(window.texSuite?.exportWord){const saved=await window.texSuite.exportWord(project.title,new Uint8Array(await blob.arrayBuffer()));if(saved)notify('Word document saved.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${project.title}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){notify(e.message);}}
  if(!editor)return null;
  const p=publisherById(project.flow.publisherId);
  const words=flowText(project.flow.doc).trim().split(/\s+/).filter(Boolean).length;
  const headings=[];editor.state.doc.descendants((n,pos)=>{if(n.type.name==='heading')headings.push({text:n.textContent,pos,level:n.attrs.level});});
  return <div className="flow-workspace">
    <div className="flow-ribbon" onClickCapture={e=>{if(project.sourceOverride!=null&&!e.target.closest('[data-mode-control]')){e.preventDefault();e.stopPropagation();notify('Restore generated source before changing the visual manuscript.');}}}>
      <div className="flow-ribbon-row" inert={project.sourceOverride!=null}>
        {action('Undo typing',Undo2,()=>chain().undo().run())}{action('Redo typing',Redo2,()=>chain().redo().run())}<i/>
        <select aria-label="Paragraph style" value={editor.isActive('heading')?`h${editor.getAttributes('heading').level}`:'paragraph'} onChange={e=>e.target.value==='paragraph'?chain().setParagraph().run():chain().setHeading({level:Number(e.target.value[1])}).run()}><option value="paragraph">Normal text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select>
        <select aria-label="Font family" value={editor.getAttributes('textStyle').fontFamily||'Suite Serif'} onChange={e=>chain().setFontFamily(e.target.value).run()}>{['Suite Serif','Suite Sans','monospace'].map(name=><option key={name}>{name}</option>)}</select>
        <select aria-label="Font size" value={editor.getAttributes('textStyle').fontSize||'12pt'} onChange={e=>chain().setFontSize(e.target.value).run()}>{[8,9,10,11,12,14,16,18,20,24,28,36].map(n=><option key={n}>{n}pt</option>)}</select>
        {action('Bold selection',Bold,()=>chain().toggleBold().run(),editor.isActive('bold'))}{action('Italic selection',Italic,()=>chain().toggleItalic().run(),editor.isActive('italic'))}{action('Underline selection',Underline,()=>chain().toggleUnderline().run(),editor.isActive('underline'))}{action('Strikethrough selection',Strikethrough,()=>chain().toggleStrike().run(),editor.isActive('strike'))}
        <button title="Subscript" onClick={()=>chain().toggleSubscript().run()}>x₂</button><button title="Superscript" onClick={()=>chain().toggleSuperscript().run()}>x²</button>
        <input className="flow-color" aria-label="Text color" type="color" value={editor.getAttributes('textStyle').color||'#243831'} onChange={e=>chain().setColor(e.target.value).run()}/><i/>
        {action('Bulleted list',List,()=>chain().toggleBulletList().run(),editor.isActive('bulletList'))}{action('Numbered list',ListOrdered,()=>chain().toggleOrderedList().run(),editor.isActive('orderedList'))}
        {[['left',AlignLeft],['center',AlignCenter],['right',AlignRight],['justify',AlignJustify]].map(([a,Icon])=><React.Fragment key={a}>{action(`Align ${a}`,Icon,()=>chain().setTextAlign(a).run(),editor.isActive({textAlign:a}))}</React.Fragment>)}
        <select aria-label="Line spacing" onChange={e=>chain().setLineHeight(e.target.value).run()} defaultValue="1.6">{['1','1.15','1.5','1.6','2'].map(n=><option key={n}>{n}</option>)}</select>
      </div>
      <div className="flow-ribbon-row secondary">
        <button onClick={()=>imageInput.current.click()}><ImagePlus size={15}/>Image</button><button onClick={()=>figureInput.current.click()}><LayoutGrid size={15}/>Figure group</button><button onClick={()=>chain().insertTable({rows:3,cols:3,withHeaderRow:true}).run()}><Table2 size={15}/>Table</button>
        {action('Insert link',Link,()=>{setLink(editor.getAttributes('link').href||'');setLinkOpen(!linkOpen);})}
        <button onClick={()=>chain().insertContent({type:'pageBreak'}).run()}>Page break</button>
        <button onClick={()=>setSearchOpen(!searchOpen)}><Search size={15}/>Find & replace</button><i/>
        <button onClick={()=>wordInput.current.click()}><Upload size={15}/>Import Word</button><button onClick={exportWord}><Download size={15}/>Word</button>
        <div className="flow-ribbon-spacer"/>
        {[['visual','Write',FileText],['split','Split',Columns2],['code','LaTeX',Code2],['preview','PDF',FileText]].map(([m,label,Icon])=><button data-mode-control key={m} className={mode===m?'active':''} onClick={()=>setMode(m)}><Icon size={15}/>{label}</button>)}
        <button data-mode-control className="flow-build" disabled={compileBusy} onClick={compile}>{compileBusy?'Typesetting…':'Typeset PDF'}</button>{compileBusy&&<button data-mode-control onClick={()=>window.texSuite?.cancel()}>Cancel</button>}
      </div>
      {editor.isActive('table')&&<div className="flow-context"><span>TABLE</span><button onClick={()=>chain().addRowAfter().run()}><Plus size={13}/>Row</button><button onClick={()=>chain().addColumnAfter().run()}><Plus size={13}/>Column</button><button onClick={()=>chain().deleteRow().run()}><Minus size={13}/>Row</button><button onClick={()=>chain().deleteColumn().run()}><Minus size={13}/>Column</button><button onClick={()=>chain().deleteTable().run()}>Delete table</button></div>}
      {linkOpen&&<div className="flow-context"><input aria-label="Link URL" placeholder="https://…" value={link} onChange={e=>setLink(e.target.value)}/><button onClick={()=>{if(/^https?:\/\//.test(link)){chain().setLink({href:link}).run();setLinkOpen(false);}else notify('Use an http or https link.');}}>Apply link</button><button onClick={()=>{chain().unsetLink().run();setLinkOpen(false);}}>Remove link</button></div>}
      {searchOpen&&<div className="flow-context"><input aria-label="Find text" placeholder="Find…" value={find} onChange={e=>setFind(e.target.value)}/><input aria-label="Replace with" placeholder="Replace with…" value={replacement} onChange={e=>setReplacement(e.target.value)}/><button onClick={findNext}>Find next</button><button onClick={replaceAll}>Replace all</button><span>{matches().length} matches · case insensitive</span></div>}
    </div>
    <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{insertImage(e.target.files[0]);e.target.value='';}}/>
    <input ref={figureInput} hidden multiple type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{insertFigureGroup(e.target.files);e.target.value='';}}/>
    <input ref={wordInput} hidden type="file" accept=".docx" onChange={e=>{importWord(e.target.files[0]);e.target.value='';}}/>
    <div className="flow-body">
      <aside className="flow-outline"><div className="panel-label">DOCUMENT OUTLINE</div>{headings.map((h,i)=><button key={i} style={{paddingLeft:16+(h.level-1)*12}} onClick={()=>{setMode('visual');editor.chain().focus().setTextSelection(h.pos+1).scrollIntoView().run();}}>{h.text||'Untitled section'}</button>)}<div className="flow-format">
        <span>JOURNAL / PUBLISHER TEMPLATE</span>
        <select aria-label="Publisher format" disabled={compileBusy||project.sourceOverride!=null} value={project.flow.publisherId} onChange={e=>updateFlow({publisherId:e.target.value})}>
          {[...new Set(publishers.map(p=>p.publisher))].map(group=><optgroup key={group} label={group}>{publishers.filter(p=>p.publisher===group).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>)}
        </select>
        <div className={`template-download ${templateState.status}`} role="status">
          {templateState.status==='downloading'?'Downloading original template…':templateState.status==='downloaded'?'Original template downloaded ✓':templateState.status==='error'?templateState.message:templateState.status==='desktop'?'Automatic downloads available in the desktop app.':'Built-in LaTeX article'}
        </div>
        <p>{p.description}</p><code>{p.className}{p.options?` [${p.options}]`:''}</code>
        <p>Your document is typeset automatically using this template.</p>
        <button disabled={compileBusy||templateState.status==='downloading'||templateState.status==='error'} onClick={()=>compile({preserveMode:true})}>Update document</button>
        <button onClick={()=>{setMetaOpen(!metaOpen);setMode('visual');}}>Article details</button>
        {templateState.status==='downloaded'&&<button onClick={async()=>{try{if(await window.texSuite.exportTemplate(p.id))notify('Original publisher ZIP saved, including source examples and instructions.');}catch(e){notify(e.message);}}}>Save original template ZIP</button>}
        <p><button onClick={()=>window.texSuite?window.texSuite.openReference(p.id):window.open(p.url,'_blank','noopener')}>Template source & guidance ↗</button></p>
      </div></aside>
      <div className={`flow-panes ${mode}`}>
        {mode==='code'&&<div className="flow-code"><CodeMirror value={source} height="100%" extensions={latexExtensions} onChange={onSourceChange}/></div>}
        {(mode==='visual'||mode==='split')&&<div className="flow-scroll">
          {project.sourceOverride!=null&&<div className="source-banner">Custom source is active.<button onClick={()=>onChange({...latest.current,sourceOverride:null})}>Restore generated source</button></div>}
          <div className="flow-paper" style={{'--document-accent':'#222222'}}>
            <div className="flow-paper-label">EDIT MANUSCRIPT <span>{p.name.toUpperCase()}</span></div>
            <input className="flow-document-title" aria-label="Manuscript title" disabled={project.sourceOverride!=null} value={project.title} onChange={e=>onChange({...latest.current,title:e.target.value})}/>
            <div className="flow-author"><input aria-label="Manuscript authors" value={project.flow.authors} onChange={e=>updateFlow({authors:e.target.value})}/><span> · </span><input aria-label="Manuscript affiliation" value={project.flow.affiliation} onChange={e=>updateFlow({affiliation:e.target.value})}/></div>
            <button className="flow-details-toggle" onClick={()=>setMetaOpen(!metaOpen)}>{metaOpen?'Close':'Edit'} title-page details</button>
            {metaOpen&&<div className="flow-metadata">{[['authors','Author(s)'],['affiliation','Affiliation'],['city','City'],['country','Country'],['abstract','Abstract'],['keywords','Keywords']].map(([key,label])=><label key={key}>{label}<textarea aria-label={label} rows={key==='abstract'?4:1} value={project.flow[key]||''} onChange={e=>updateFlow({[key]:e.target.value})}/></label>)}</div>}
            <div className="flow-abstract"><strong>Abstract</strong><textarea aria-label="Manuscript abstract" rows={3} value={project.flow.abstract} onChange={e=>updateFlow({abstract:e.target.value})}/></div>
            <EditorContent editor={editor}/>
          </div>
        </div>}
        {(mode==='preview'||mode==='split'||mode==='code')&&<section className="flow-document" aria-label="Typeset journal document">
          <header><strong>{p.name} · PDF output</strong><span>{compileBusy?'Typesetting…':compiled?.revision===project.updatedAt?'Up to date':liveFailure?'Build failed — see compiler log':compiled?'Updating document…':'Preparing document…'}</span><button onClick={()=>{setMode('visual');requestAnimationFrame(()=>editor.commands.focus());}}>Edit text</button></header>
          {compiled?.projectId===project.id&&compiled?.publisherId===project.flow.publisherId?<iframe title="Compiled PDF" src={`${compiled.url}#navpanes=0&view=FitH`}/>:<div className="journal-empty">{compileBusy?'Installing required packages and typesetting your document…':templateState.status==='error'?templateState.message:project.flow.publisherId==='article'?'Choose a journal template to typeset automatically, or create a PDF.':'The selected template will be applied automatically.'}</div>}
        </section>}
      </div>
    </div>
    <footer className="flow-status"><span>{words.toLocaleString()} words · automatic text wrapping · spellcheck</span><span>{p.name} · Page count available in typeset PDF</span></footer>
  </div>;
}

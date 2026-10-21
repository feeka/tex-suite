import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { ArrowUpRight, ArrowLeft, ArrowRight, ChevronDown, Plus, Search, LayoutTemplate, FileText, Presentation, FolderOpen, Puzzle, Settings2, X, Check, CheckCheck, CircleHelp, MoreHorizontal, Sparkles, Download, Play, Upload, ImagePlus, Type, Square, Table2, List, ListOrdered, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2, Copy, Magnet, PanelLeft, Code2, Columns2, MousePointer2, ZoomIn, ZoomOut, GripVertical, LoaderCircle, Terminal, RefreshCw, Monitor, ArrowDown, Layers, Save, FileCode2, ExternalLink, CheckCircle2, AlertCircle, Maximize2 } from 'lucide-react';
import { uid, dimensions, palettes, templates, createProject, createPage, addElement, snapRect, resolveColor, validateProject, flowingCopy } from './core/model.mjs';
import { projectToLatex } from './core/latex.mjs';
import './styles.css';
import {FlowEditor} from './FlowEditor.jsx';
import {publishers,universities} from './core/catalog.mjs';
import {flowText} from './core/flow.mjs';
const latexExtensions=[StreamLanguage.define(stex),EditorView.lineWrapping];
const latexBasicSetup={lineNumbers:true,foldGutter:true,highlightActiveLine:true};

const api=window.texSuite;
const clone=value=>structuredClone(value);
const loadLocal=()=>{try{return JSON.parse(localStorage.getItem('texsuite-projects')||'[]').map(validateProject);}catch{return[];}};
const download=(name,data,type='application/json')=>{
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
};
function IconButton({icon:Icon,label,active,...rest}) {return <button title={label} aria-label={label} className={`icon-btn ${active?'active':''}`} {...rest}><Icon size={17}/></button>;}
function Brand({small=false,onClick}) {return <button className={`brand ${small?'small':''}`} onClick={onClick} aria-label="TeX Suite home"><span className="brand-mark">T<span>e</span>X</span>{!small&&<span>TeX Suite<span className="brand-dot">.</span></span>}</button>;}
function ElementView({el,palette,editing=false,onText}) {
  const style={color:resolveColor(el,'color',palette),fontSize:el.fontSize||16,fontFamily:el.fontFamily==='serif'?'"Suite Serif", Georgia, serif':'"Suite Sans", Arial, sans-serif',fontWeight:el.fontWeight||400,fontStyle:el.italic?'italic':'normal',textAlign:el.align||'left',lineHeight:el.lineHeight||1.25};
  if(el.type==='rect')return <div className="shape-content" style={{background:resolveColor(el,'fill',palette),borderRadius:el.radius||0,border:el.strokeRole?`${el.strokeWidth||1}px solid ${palette[el.strokeRole]}`:'none'}}/>;
  if(el.type==='image')return <img src={el.src} draggable={false} alt={el.alt||'Inserted figure'}/>;
  if(el.type==='table')return <table style={{...style,borderColor:palette.accent}}><tbody>{el.data.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} style={{background:i===0?palette.muted:'transparent',borderColor:palette.muted}}>{cell}</td>)}</tr>)}</tbody></table>;
  if(editing)return <textarea autoFocus className="inline-edit" aria-label="Edit text on canvas" style={style} value={el.text} onChange={e=>{e.target.style.height='auto';onText(e.target.value,Math.ceil(e.target.scrollHeight));}}  onPointerDown={e=>e.stopPropagation()}/>;
  if(el.type==='list'){const Tag=el.listStyle==='enumerate'?'ol':'ul';return <Tag className="element-list" style={{...style,'--list-marker':palette.accent}}>{el.text.split('\n').filter(line=>line.trim()).map((line,i)=><li key={i}>{line}</li>)}</Tag>;}
  return <div className="element-content" style={style}>{el.text}</div>;
}
function MiniPage({page,project,width=180}) {
  const d=dimensions(project.kind),s=width/d.width;
  if(project.flow)return <div className="mini-page" style={{width,height:d.height*s,background:'#fff'}}><div style={{width:d.width,height:d.height,transform:`scale(${s})`,transformOrigin:'top left',padding:68,boxSizing:'border-box',position:'absolute',fontFamily:'Suite Serif',color:project.palette.ink}}><div style={{borderTop:`3px solid ${project.palette.accent}`,paddingTop:45,color:project.palette.accent,fontSize:42,lineHeight:1.2}}>{project.title}</div><p style={{fontSize:16,marginTop:25}}>{project.flow.authors}</p><h3 style={{fontSize:21,marginTop:45}}>Abstract</h3><p style={{fontSize:18,lineHeight:1.6}}>{project.flow.abstract}</p>{project.flow.doc.content?.slice(0,7).map((n,i)=><div key={i} style={{fontSize:n.type==='heading'?25:18,fontWeight:n.type==='heading'?600:400,lineHeight:1.6,marginTop:n.type==='heading'?30:12}}>{flowText(n).slice(0,360)}</div>)}</div></div>;
  return <div className="mini-page" style={{width,height:d.height*s,background:project.palette.paper}}><div style={{width:d.width,height:d.height,transform:`scale(${s})`,transformOrigin:'top left',position:'absolute'}}>
    {page.elements.map(e=><div key={e.id} className="canvas-element miniature" style={{left:e.x,top:e.y,width:e.w,height:e.h}}><ElementView el={e} palette={project.palette}/></div>)}
  </div></div>;
}
function App(){
  const [library,setLibrary]=useState(loadLocal);
  const [project,setProject]=useState(null);
  const [pageId,setPageId]=useState(null),[selected,setSelected]=useState(null),[editing,setEditing]=useState(null);
  const [mode,setMode]=useState('visual'),[homeTab,setHomeTab]=useState('home'),[modal,setModal]=useState(null);
  const [galleryKind,setGalleryKind]=useState('beamer'),[query,setQuery]=useState(''),[category,setCategory]=useState('All');
  const [snap,setSnap]=useState(true),[zoom,setZoom]=useState(1),[guides,setGuides]=useState([]),[marginGlow,setMarginGlow]=useState(false);
  const [history,setHistory]=useState([]),[future,setFuture]=useState([]),[toast,setToast]=useState('');
  const [compiler,setCompiler]=useState(null),[checking,setChecking]=useState(!!api),[setupBusy,setSetupBusy]=useState(false),[progress,setProgress]=useState(null),[extensions,setExtensions]=useState([]);
  const [compileBusy,setCompileBusy]=useState(false),[compiled,setCompiled]=useState(null),[compileLog,setCompileLog]=useState(''),[showLog,setShowLog]=useState(false);
  const compileGate=useRef(false);
  const [presenting,setPresenting]=useState(false),[presentIndex,setPresentIndex]=useState(0),[saveState,setSaveState]=useState('Saved locally');
  const [storagePath,setStoragePath]=useState('');
  const projectRef=useRef(project),fileInput=useRef(),stageRef=useRef(),drag=useRef(null),historyRef=useRef(history),futureRef=useRef(future);
  const sourceRef=useRef('');
  const [bounds,setBounds]=useState({width:850,height:650});
  projectRef.current=project;historyRef.current=history;futureRef.current=future;
  const notify=useCallback(s=>setToast(s),[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t);},[toast]);
  const open=useCallback(p=>{setProject(clone(p));setPageId(p.pages[0].id);setSelected(null);setEditing(null);setHistory([]);setFuture([]);setMode(p.sourceOverride!=null?'code':'visual');setCompiled(null);setZoom(1);setModal(null);setStoragePath('');},[]);
  const save=useCallback(async p=>{
    if(!p)return true;
    try {
      if(api)await api.saveProject(p);
      setLibrary(old=>{const next=[p,...old.filter(x=>x.id!==p.id)].sort((a,b)=>b.updatedAt-a.updatedAt);if(!api){try{localStorage.setItem('texsuite-projects',JSON.stringify(next));}catch{queueMicrotask(()=>{setSaveState('Storage full');notify('Browser storage is full. Export your project to keep a copy.');});}}return next;});
      setSaveState('Saved locally');
      return true;
    } catch(e){setSaveState('Save failed');notify(e.message);return false;}
  },[notify]);
  const setup=useCallback(async()=>{
    if(!api){notify('Compiler setup is available in the desktop application.');return;}
    setSetupBusy(true);setProgress({message:'Preparing your LaTeX workspace…',percent:0});
    try{const c=await api.installCompiler();setCompiler(c);setExtensions(await api.extensions());notify('LaTeX is ready. Make something wonderful.');}
    catch(e){notify(e.message);setProgress({message:e.message,error:true});}
    finally{setSetupBusy(false);setChecking(false);}
  },[notify]);
  useEffect(()=>{
    if(!api)return;
    let alive=true;
    api.library().then(items=>{if(alive&&items.length)setLibrary(items);}).catch(e=>notify(e.message));
    api.system().then(info=>{if(alive&&info.editor)open(createProject(info.editor));}).catch(()=>{});
    api.detectCompiler().then(async c=>{
      if(!alive)return;setCompiler(c);setChecking(false);
      if(c)setExtensions(await api.extensions());
      else if(localStorage.getItem('texsuite-auto-setup')!=='off')setup();
    }).catch(e=>{setChecking(false);notify(e.message);});
    return()=>{alive=false;};
  },[setup,notify]);
  useEffect(()=>api?.onProgress(p=>{
    if(p.action==='save'){save(projectRef.current);notify('Project saved');}
    else if(p.action==='close'){save(projectRef.current).then(saved=>{if(saved)api.closeReady();else notify('Could not save. Export a project copy before closing.');});}
    else if(p.action==='open')openFile();
    else setProgress(p);
  }),[save]);
  useEffect(()=>{
    if(!project)return;
    setSaveState('Saving…');const t=setTimeout(()=>save(project),500);return()=>clearTimeout(t);
  },[project,save]);
  useEffect(()=>{
    if(!api||!project?.id)return;
    let active=true;
    api.projectLocation(project.id).then(location=>{if(active)setStoragePath(location);}).catch(e=>notify(e.message));
    return()=>{active=false;};
  },[project?.id,notify]);
  useEffect(()=>{
    if(!stageRef.current)return;
    const obs=new ResizeObserver(entries=>setBounds({width:entries[0].contentRect.width,height:entries[0].contentRect.height}));
    obs.observe(stageRef.current);return()=>obs.disconnect();
  },[project?.id,mode]);
  const commit=useCallback(updater=>{
    const old=projectRef.current;if(!old)return;
    const next=typeof updater==='function'?updater(clone(old)):updater;
    setHistory(h=>[...h.slice(-79),clone(old)]);setFuture([]);next.updatedAt=Date.now();projectRef.current=next;setProject(next);
  },[]);
  const undo=useCallback(()=>{
    const h=historyRef.current;if(!h.length)return;
    setFuture(f=>[...f,clone(projectRef.current)]);setProject({...h[h.length-1],updatedAt:Date.now()});setHistory(h.slice(0,-1));setSelected(null);setEditing(null);
  },[]);
  const redo=useCallback(()=>{
    const f=futureRef.current;if(!f.length)return;
    setHistory(h=>[...h,clone(projectRef.current)]);setProject({...f[f.length-1],updatedAt:Date.now()});setFuture(f.slice(0,-1));setSelected(null);setEditing(null);
  },[]);
  const page=project?.pages.find(p=>p.id===pageId)??project?.pages[0];
  const element=page?.elements.find(e=>e.id===selected);
  const d=dimensions(project?.kind);
  const visualWidth=mode==='split'?bounds.width*.51:bounds.width;
  const baseScale=project?.kind==='manuscript'?Math.min((visualWidth-92)/d.width,.95):Math.min((visualWidth-92)/d.width,(bounds.height-110)/d.height,1.1);
  const scale=Math.max(.16,baseScale*zoom);
  const patchElement=(patch,checkpoint=true)=>{
    if(!element||!guardVisual())return;
    const update=p=>{const pg=p.pages.find(x=>x.id===page.id);pg.elements=pg.elements.map(e=>e.id===selected?{...e,...patch}:e);return p;};
    if(checkpoint)commit(update);else setProject(p=>({...update(clone(p)),updatedAt:Date.now()}));
  };
  const source=project?(project.sourceOverride??projectToLatex(project)):'';
  sourceRef.current=source;
  const onSourceChange=useCallback(value=>{
    if(!projectRef.current||value===sourceRef.current)return;
    sourceRef.current=value;
    commit(p=>({...p,sourceOverride:value}));
  },[commit]);
  const guardVisual=()=>{
    if(project?.sourceOverride!=null){notify('Custom LaTeX is active. Use “Return to visual source” before changing the visual layout.');return false;}return true;
  };
  function insert(type,listStyle='itemize'){
    if(!guardVisual())return;
    const el=addElement(type,project.kind,project.palette);
    if(type==='list')el.listStyle=listStyle;
    commit(p=>{p.pages.find(x=>x.id===page.id).elements.push(el);return p;});setSelected(el.id);setEditing(['text','heading','list'].includes(type)?el.id:null);
  }
  function removeSelected(){
    if(!selected||!guardVisual())return;commit(p=>{const pg=p.pages.find(x=>x.id===page.id);pg.elements=pg.elements.filter(e=>e.id!==selected);return p;});setSelected(null);setEditing(null);
  }
  function duplicate(){
    if(!element||!guardVisual())return;const el={...clone(element),id:uid(),x:element.x+16,y:element.y+16};
    commit(p=>{p.pages.find(x=>x.id===page.id).elements.push(el);return p;});setSelected(el.id);
  }
  async function openFile(){
    try{
      if(api){const p=await api.openProject();if(p)open(p);}
      else {const input=document.createElement('input');input.type='file';input.accept='.texsuite,.tex';input.onchange=async()=>{try{const f=input.files[0];if(!f)return;const t=await f.text();if(f.name.endsWith('.texsuite'))open(validateProject(JSON.parse(t)));else{const p=createProject(t.includes('{beamer}')?'beamer':'manuscript');p.title=f.name.replace(/\.tex$/,'');p.sourceOverride=t;open(p);}}catch(e){notify(e.message);}};input.click();}
    }catch(e){notify(e.message);}
  }
  async function exportProject(){
    try{if(api)await api.exportProject(project);else download(`${project.title}.texsuite`,JSON.stringify(project,null,2));notify('Project exported');}catch(e){notify(e.message);}
  }
  async function exportTex(){
    try{if(api)await api.exportTex(project,source);else download(`${project.title}.tex`,source,'text/plain');notify('LaTeX source exported');}catch(e){notify(e.message);}
  }
  async function compile(options={}){
    if(!api){notify('Open the desktop app to compile with your local LaTeX engine. You can export the source here.');return;}
    if(compileGate.current)return;
    compileGate.current=true;
    setCompileBusy(true);setProgress({message:'Preparing document…'});setCompileLog('');
    try{
      const result=await api.compile(project,source);setCompileLog(result.log);
      if(result.ok){
        if(compiled)URL.revokeObjectURL(compiled.url);
        const blob=new Blob([Uint8Array.from(atob(result.pdf),c=>c.charCodeAt(0))],{type:'application/pdf'});
        if(projectRef.current?.id!==project.id)return;
        setCompiled({url:URL.createObjectURL(blob),at:Date.now(),revision:project.updatedAt,source,projectId:project.id,publisherId:project.flow?.publisherId});
        if(!options.preserveMode&&!project.flow&&mode!=='code')setMode('preview');
        if(!options.quiet)notify('Your PDF is ready');
      }else{setShowLog(true);notify(result.message);}
      return result.ok;
    }catch(e){setCompileLog(e.message);setShowLog(true);notify(e.message);return false;}
    finally{compileGate.current=false;setCompileBusy(false);}
  }
  async function addImage(file,position){
    if(!file||!guardVisual())return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){notify('Choose a PNG, JPEG, or WebP image.');return;}
    if(file.size>15_000_000){notify('Please use an image smaller than 15 MB.');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();img.onload=()=>{
        const cvs=document.createElement('canvas'),ratio=Math.min(1,2400/img.width,2400/img.height);cvs.width=img.width*ratio;cvs.height=img.height*ratio;
        cvs.getContext('2d').drawImage(img,0,0,cvs.width,cvs.height);
        let w=Math.min(420,d.width-d.margin*2),h=w*img.height/img.width;
        if(h>d.height-d.margin*2){h=d.height-d.margin*2;w=h*img.width/img.height;}
        const pos=snapRect({x:position?.x??d.margin+60,y:position?.y??d.margin+60,w,h},[],d);
        const el={id:uid(),type:'image',x:pos.x,y:pos.y,w,h,src:cvs.toDataURL('image/png'),alt:file.name};
        commit(p=>{p.pages.find(x=>x.id===page.id).elements.push(el);return p;});setSelected(el.id);
      };img.src=reader.result;
    };reader.readAsDataURL(file);
  }
  function startDrag(event,el,resize=false){
    if(event.button!==0||editing===el.id)return;
    event.stopPropagation();setSelected(el.id);setEditing(null);
    if(!guardVisual())return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={startX:event.clientX,startY:event.clientY,el:clone(el),resize,old:clone(projectRef.current),moved:false};
  }
  function onDrag(event){
    if(!drag.current)return;
    const state=drag.current,dx=(event.clientX-state.startX)/scale,dy=(event.clientY-state.startY)/scale;
    if(!state.moved&&Math.abs(dx)+Math.abs(dy)<2)return;
    if(!state.moved){setHistory(h=>[...h.slice(-79),state.old]);setFuture([]);state.moved=true;}
    let patch;
    if(state.resize){
      let w=Math.max(24,state.el.w+dx),h=Math.max(20,state.el.h+dy);
      if(event.shiftKey){h=w*state.el.h/state.el.w;}
      const outside=state.el.x+w>d.width-d.margin||state.el.y+h>d.height-d.margin;
      setMarginGlow(outside);
      if(!event.altKey){w=Math.min(w,d.width-d.margin-state.el.x);h=Math.min(h,d.height-d.margin-state.el.y);}
      patch={w:Math.round(w),h:Math.round(h)};
    }else{
      const result=snapRect({...state.el,x:state.el.x+dx,y:state.el.y+dy},page.elements.filter(e=>e.id!==state.el.id),d,{enabled:snap,allowOutside:event.altKey,threshold:7/scale});
      patch={x:result.x,y:result.y};setGuides(result.guides);setMarginGlow(result.attemptedOutside);
    }
    setProject(p=>{const next=clone(p),pg=next.pages.find(x=>x.id===page.id);pg.elements=pg.elements.map(e=>e.id===state.el.id?{...e,...patch}:e);next.updatedAt=Date.now();return next;});
  }
  function endDrag(){drag.current=null;setGuides([]);setTimeout(()=>setMarginGlow(false),450);}
  function newPage(){
    if(!guardVisual())return;const pg=createPage(project.kind,project.templateId,project.pages.length,'content');
    commit(p=>{p.pages.push(pg);return p;});setPageId(pg.id);setSelected(null);setEditing(null);
  }
  function deletePage(id){
    if(project.pages.length===1){notify('Keep at least one page in your document.');return;}
    commit(p=>{p.pages=p.pages.filter(pg=>pg.id!==id);return p;});if(pageId===id)setPageId(project.pages.find(p=>p.id!==id).id);
  }
  function newProject(kind,templateId='atelier',fixed=false){const p=createProject(kind,templateId);if(fixed&&kind==='manuscript')delete p.flow;open(p);save(p);}
  useEffect(()=>{
    const key=e=>{
      const input=/INPUT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable||e.target.closest('.cm-editor');
      if(presenting){if(e.key==='Escape'){setPresenting(false);document.exitFullscreen?.().catch(()=>{});}if(['ArrowRight',' ','PageDown'].includes(e.key)){e.preventDefault();setPresentIndex(i=>Math.min(i+1,project.pages.length-1));}if(['ArrowLeft','PageUp'].includes(e.key))setPresentIndex(i=>Math.max(0,i-1));return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save(projectRef.current);notify('Project saved');}
      if(e.key==='Escape'){setEditing(null);setSelected(null);setModal(null);return;}
      if(input)return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();}
      if(['Delete','Backspace'].includes(e.key)&&selected){e.preventDefault();removeSelected();}
      if(element&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&project.sourceOverride==null){
        e.preventDefault();const step=e.shiftKey?10:1;
        const result=snapRect({...element,x:element.x+({'ArrowRight':step,'ArrowLeft':-step}[e.key]||0),y:element.y+({'ArrowDown':step,'ArrowUp':-step}[e.key]||0)},[],d,{enabled:false,allowOutside:e.altKey});
        patchElement({x:result.x,y:result.y});setMarginGlow(result.attemptedOutside);setTimeout(()=>setMarginGlow(false),500);
      }
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[project,pageId,selected,presenting,save,undo,redo]);
  const startPresent=()=>{setPresentIndex(project.pages.findIndex(p=>p.id===page.id));setPresenting(true);document.documentElement.requestFullscreen?.().catch(()=>{});};
  const filteredTemplates=templates.filter(t=>(category==='All'||t.category===category)&&`${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase()));
  function newNative(item,kind){const p=createProject(kind);p.title=kind==='manuscript'?'Untitled manuscript':'A research presentation';if(kind==='manuscript')p.flow.publisherId=item.id;else {p.sourceOverride=item.source;p.nativeTheme=item.id;}open(p);save(p);}
  const templateGallery=(insideModal=false)=><div className={`gallery ${insideModal?'in-modal':''}`}>
    <div className="section-eyebrow">A HEAD START, BEAUTIFULLY CONSIDERED</div><h1>Make it your own.</h1>
    <p className="muted">Choose an original journal template or university theme. Downloads are automatic in the desktop app.</p>
    <div className="gallery-controls"><div className="segmented"><button className={galleryKind==='beamer'?'active':''} onClick={()=>{setGalleryKind('beamer');setCategory('All');}}><Presentation size={15}/>Presentations</button><button className={galleryKind==='manuscript'?'active':''} onClick={()=>{setGalleryKind('manuscript');setCategory('All');}}><FileText size={15}/>Documents</button></div><div className="searchbox"><Search size={16}/><input placeholder="Find a template…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    <div className="category-tabs">{['All',galleryKind==='manuscript'?'Publishers':'Universities','Editorial','Academic','Research','Business','Creative'].map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}<span>15 designs + {galleryKind==='manuscript'?publishers.length-1:universities.length} native formats</span></div>
    {(galleryKind!=='manuscript'||!['All','Publishers'].includes(category))&&<div className="template-grid">{filteredTemplates.map(t=>{const p=createProject(galleryKind,t.id);delete p.flow;return <button className="template-card" key={t.id} onClick={()=>newProject(galleryKind,t.id,true)} aria-label={`Use ${t.name} template`}><div className={`template-preview ${galleryKind}`}><MiniPage page={p.pages[0]} project={p} width={galleryKind==='beamer'?270:145}/><span className="use-template">Use template <ArrowUpRight size={15}/></span></div><div className="template-meta"><strong>{t.name}</strong><span>{t.category}</span></div><p>{t.description}</p><div className="swatches">{Object.values(p.palette).map((c,i)=><i key={i} style={{background:c}}/>)}</div></button>;})}</div>}
    <section className="native-catalog"><div className="section-eyebrow">NATIVE LATEX FORMATS</div><h2>{galleryKind==='manuscript'?'Ready for your journal.':'Academic, by design.'}</h2><p>{galleryKind==='manuscript'?'Real publisher classes for typeset output, with a comfortable flowing writing view. Select the format your target journal requests; specific journal requirements can differ.':'University themes open as editable LaTeX with a compiled PDF preview. These preserve the native theme rather than approximating it on the canvas.'}</p><div className="native-grid">{(galleryKind==='manuscript'?publishers.slice(1):universities).filter(t=>(t.name+' '+(t.publisher||'')).toLowerCase().includes(query.toLowerCase())).map(t=><button className="native-card" key={t.id} onClick={()=>newNative(t,galleryKind)}><small>{t.publisher||t.label}</small><strong>{t.name}</strong><p>{t.description}</p><code>{t.className||'Native Beamer theme'}</code></button>)}</div></section>
    {!filteredTemplates.length&&query&&<div className="empty-state">No design presets match that search.</div>}
  </div>;
  return <div className="app">
    {!project?<div className="home-shell">
      <aside className="home-sidebar"><Brand onClick={()=>setHomeTab('home')}/><div className="workspace-label">YOUR WORKSPACE</div>
        <nav><button className={homeTab==='home'?'active':''} onClick={()=>setHomeTab('home')}><Layers size={18}/>Overview</button><button className={homeTab==='templates'?'active':''} onClick={()=>setHomeTab('templates')}><LayoutTemplate size={18}/>Templates<span>15</span></button><button onClick={openFile}><FolderOpen size={18}/>Open a project</button></nav>
        <div className="workspace-label editors-label">THE SUITE</div><button className="app-link" onClick={()=>newProject('manuscript')}><span className="app-icon manuscript"><FileText size={20}/></span><span>texManuscript<small>Make room for your words</small></span><Plus size={15}/></button><button className="app-link" onClick={()=>newProject('beamer')}><span className="app-icon beamer"><Presentation size={20}/></span><span>texBeamer<small>Give your ideas a stage</small></span><Plus size={15}/></button>
        <div className="sidebar-bottom"><button className="compiler-status" onClick={()=>setModal('extensions')}><span className={`status-dot ${compiler?'ready':''}`}/><span>{compiler?'LaTeX is ready':checking?'Checking your setup…':setupBusy?'Setting up LaTeX…':api?'Set up LaTeX':'Browser preview'}<small>{compiler?compiler.distribution:api?'Managed in Extensions':'Desktop compiler available in app'}</small></span><ChevronDown size={14}/></button><button className="bottom-link" onClick={()=>setModal('extensions')}><Puzzle size={17}/>Extensions & setup</button><button className="bottom-link" onClick={()=>setModal('help')}><CircleHelp size={17}/>A little guidance</button><div className="profile"><div className="avatar">Y</div><span>Your personal workspace<small>Local. Private. Yours.</small></span></div></div>
      </aside>
      <main className="home-main"><header className="home-header"><span>{homeTab==='home'?'A place for your next idea':'Your template collection'}</span><div><span className="local-badge"><span/>All files stay on your device</span><IconButton icon={Settings2} label="Extensions and settings" onClick={()=>setModal('extensions')}/></div></header>
        {homeTab==='templates'?templateGallery():<div className="overview"><div className="hero-intro"><div><div className="section-eyebrow">WORDS. IDEAS. POSSIBILITIES.</div><h1>Good things start<br/>with a blank page<span>.</span></h1><p>Write with focus. Present with confidence.<br/>One thoughtful workspace, powered by LaTeX.</p></div><div className="hero-art" aria-hidden="true"><div className="art-orbit"/><div className="art-sheet back"><i/><i/><i/></div><div className="art-sheet front"><span>Ideas<br/><em>take shape.</em></span><b/><small>TeX SUITE / MADE BY YOU</small></div><div className="art-plus">+</div></div></div>
        <div className="create-grid"><button className="create-card" onClick={()=>newProject('manuscript')}><span className="app-icon manuscript"><FileText size={26}/></span><div><h2>texManuscript</h2><p>For the words that deserve a beautiful page.</p><span>New document <ArrowUpRight size={16}/></span></div><div className="paper-mini"><i/><i/><i/><i/></div></button><button className="create-card" onClick={()=>newProject('beamer')}><span className="app-icon beamer"><Presentation size={26}/></span><div><h2>texBeamer</h2><p>For the ideas that deserve an audience.</p><span>New presentation <ArrowUpRight size={16}/></span></div><div className="slide-mini"><b>A new<br/>perspective.</b><i/></div></button></div>
        <div className="section-heading"><h2>Pick up where you left off</h2><button className="text-button" onClick={openFile}>Open a project <ArrowUpRight size={16}/></button></div>
        {library.length?<div className="recent-grid">{library.slice(0,6).map(p=><button className="recent-card" key={p.id} onClick={()=>open(p)}><div className="recent-preview"><MiniPage page={p.pages[0]} project={p} width={p.kind==='beamer'?242:135}/><span className="project-kind">{p.kind==='beamer'?<Presentation size={14}/>:<FileText size={14}/>}</span></div><strong>{p.title}</strong><small>{p.kind==='beamer'?'Presentation':'Document'} · {new Date(p.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></button>)}</div>:<div className="empty-recent"><FolderOpen size={23}/><div><strong>Your next project starts here.</strong><p>Create a document above, or find a template that feels like you.</p></div><button className="secondary-button" onClick={()=>setHomeTab('templates')}>Explore templates <ArrowRight size={16}/></button></div>}
        <div className="template-callout"><div className="small-orbits"><i/><i/><i/></div><div><strong>A little inspiration goes a long way.</strong><p>Explore 15 templates, each with its own point of view.</p></div><button className="text-button" onClick={()=>setHomeTab('templates')}>Find your starting point <ArrowRight size={16}/></button></div>
        <div className="home-footer"><span>TeX Suite</span><span>VISUAL WHEN YOU WANT. CODE WHEN YOU NEED.</span></div></div>}
      </main>
    </div>:<div className={`editor-shell ${project.nativeTheme?'native-source':''}`}>
      <header className="editor-header"><Brand small onClick={()=>{save(project);setProject(null);}}/><div className="header-divider"/><span className={`product-label ${project.kind}`}>{project.kind==='beamer'?<Presentation size={18}/>:<FileText size={18}/>} {project.kind==='beamer'?'texBeamer':'texManuscript'}</span><ChevronDown size={14}/><div className="document-title"><input aria-label="Document title" value={project.title} onChange={e=>commit(p=>({...p,title:e.target.value}))}/><span><CheckCheck size={12}/>{saveState}{api&&<button className="location-link" title={storagePath||'Show where this project is saved'} onClick={()=>setModal('location')}>· File location</button>}</span></div><div className="header-actions"><button className="quiet-button" onClick={()=>setModal('extensions')}><Puzzle size={16}/><span>Extensions</span></button><button className="secondary-button compact" onClick={()=>setModal('export')}><Download size={15}/>Export</button><button className="primary-button compact" onClick={project.kind==='beamer'&&project.sourceOverride==null&&mode==='visual'?startPresent:()=>compile()}>{project.kind==='beamer'&&project.sourceOverride==null&&mode==='visual'?<Play size={15}/>:<FileText size={15}/>} {project.kind==='beamer'&&project.sourceOverride==null&&mode==='visual'?'Present':'Create PDF'}</button></div></header>
      {!project.flow&&<div className="editor-toolbar"><div className="tool-group"><IconButton icon={Undo2} label="Undo" disabled={!history.length} onClick={undo}/><IconButton icon={Redo2} label="Redo" disabled={!future.length} onClick={redo}/></div><div className="toolbar-sep"/><div className="tool-group"><button onClick={()=>insert('text')}><Type size={17}/>Text</button><button onClick={()=>insert('list')}><List size={17}/>Bullets</button><button onClick={()=>insert('list','enumerate')}><ListOrdered size={17}/>Numbers</button><button onClick={()=>fileInput.current.click()}><ImagePlus size={17}/>Image</button><button onClick={()=>insert('rect')}><Square size={17}/>Shape</button><button onClick={()=>insert('table')}><Table2 size={17}/>Table</button><button onClick={()=>{setGalleryKind(project.kind);setModal('templates');}}><LayoutTemplate size={17}/>Templates</button>{project.kind==='manuscript'&&project.sourceOverride==null&&<button onClick={()=>{const p=flowingCopy(project);open(p);save(p);notify('Created a flowing copy. The original canvas project is preserved.');}}>Flowing copy</button>}<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{addImage(e.target.files[0]);e.target.value='';}}/></div><div className="toolbar-spacer"/><div className="mode-switch segmented">{[['visual',MousePointer2,'Visual'],['split',Columns2,'Split'],['code',Code2,'LaTeX']].filter(([m])=>!project.nativeTheme||m==='code').map(([m,I,label])=><button key={m} className={mode===m?'active':''} onClick={()=>{setMode(m);setEditing(null);}}><I size={14}/>{label}</button>)}</div></div>}
      {project.flow?<FlowEditor key={project.id} project={project} onChange={next=>{next.updatedAt=Date.now();if(next.id!==project.id)return save(projectRef.current).then(saved=>{if(!saved)throw new Error('Could not save the current document.');open(next);return save(next);});setProject(next);}} source={source} mode={mode} setMode={setMode} compiled={compiled} compile={compile} compileBusy={compileBusy} notify={notify}/>:<div className="editor-body">
        <aside className="pages-panel"><div className="panel-label"><span>{project.kind==='beamer'?'SLIDES':'PAGES'} <b>{project.pages.length}</b></span><IconButton icon={Plus} label="Add page" onClick={newPage}/></div><div className="page-list">{project.pages.map((pg,i)=><div className={`page-list-item ${pg.id===page.id?'current':''}`} key={pg.id} draggable onDragStart={e=>e.dataTransfer.setData('text/texsuite-page',pg.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/texsuite-page');if(id&&id!==pg.id)commit(p=>{const from=p.pages.findIndex(x=>x.id===id),to=p.pages.findIndex(x=>x.id===pg.id);if(from>=0){const [item]=p.pages.splice(from,1);p.pages.splice(to,0,item);}return p;});}}><span className="page-number">{String(i+1).padStart(2,'0')}</span><button className="thumbnail-button" aria-label={`Select ${project.kind==='beamer'?'slide':'page'} ${i+1}`} onClick={()=>{setPageId(pg.id);setSelected(null);setEditing(null);}}><MiniPage page={pg} project={project} width={145}/></button><div className="page-item-footer"><span>{pg.title}</span><button aria-label={`Delete page ${i+1}`} onClick={()=>deletePage(pg.id)}><Trash2 size={12}/></button></div></div>)}</div><button className="add-page-button" onClick={newPage}><Plus size={16}/>Add {project.kind==='beamer'?'slide':'page'}</button><div className="pages-tip"><GripVertical size={14}/>Drag thumbnails to reorder</div></aside>
        <main className="editing-main">
          {project.sourceOverride!=null&&mode!=='preview'&&<div className="source-banner"><Code2 size={15}/><span>{project.nativeTheme?'Native university template. Compile to see its theme and layout.':'Custom LaTeX is active. Compile to see your changes.'}</span><button onClick={()=>{commit(p=>({...p,sourceOverride:null,nativeTheme:null}));notify('Visual source restored. Undo will recover your custom LaTeX.');}}>Return to visual source</button></div>}
          <div className={`edit-panes ${mode} ${mode==='code'&&compiled?.projectId===project.id?'with-pdf':''}`} ref={stageRef}>
            {(mode==='code'||mode==='split')&&<div className="code-pane"><div className="code-title"><FileCode2 size={15}/>main.tex<span>{project.nativeTheme==='tudarmstadt'?'LuaLaTeX':project.nativeTheme==='saintpetersburg'?'pdfLaTeX':'XeLaTeX'}</span></div><CodeMirror value={source} height="100%" extensions={latexExtensions} theme="light" onChange={onSourceChange} basicSetup={latexBasicSetup}/><div className="code-caption">Visual edits generate LaTeX. Custom source is preserved until you restore visual mode.</div></div>}
            {mode==='code'&&compiled?.projectId===project.id&&<div className="pdf-preview code-pdf">{compiled.source!==source&&<div className="pdf-stale">Source changed · Compile to update PDF</div>}<iframe title="Compiled PDF" src={compiled.url}/></div>}{mode==='preview'?<div className="pdf-preview">{compiled&&compiled.projectId===project.id?<iframe title="Compiled PDF" src={compiled.url}/>:<div className="empty-state"><FileText size={35}/><h3>Your PDF belongs here.</h3><p>Compile your project to see the final typeset result.</p><button className="primary-button" onClick={compile}>Compile PDF</button></div>}</div>:(mode==='visual'||mode==='split')&&<div className="stage-scroll"><div className="canvas-topline"><span>{project.kind==='beamer'?'PRESENTATION':'MANUSCRIPT'} <i>/</i> {page.title}</span><span>{project.kind==='beamer'?'16:9 · Widescreen':'A4 · Portrait'}</span></div><div className="canvas-wrap" style={{width:d.width*scale,height:d.height*scale}}>
              <div className={`page-canvas ${marginGlow?'margin-glow':''}`} data-testid="page-canvas" style={{width:d.width,height:d.height,transform:`scale(${scale})`,background:project.palette.paper}} onPointerDown={e=>{if(e.target===e.currentTarget){setSelected(null);setEditing(null);}}} onDragOver={e=>{e.preventDefault();setMarginGlow(true);}} onDragLeave={()=>setMarginGlow(false)} onDrop={e=>{e.preventDefault();setMarginGlow(false);const rect=e.currentTarget.getBoundingClientRect();addImage(e.dataTransfer.files[0],{x:(e.clientX-rect.left)/scale,y:(e.clientY-rect.top)/scale});}}>
                {page.elements.map(el=><div key={el.id} data-testid={`element-${el.type}`} data-element-id={el.id} className={`canvas-element ${selected===el.id?'selected':''} ${editing===el.id?'editing':''}`} style={{left:el.x,top:el.y,width:el.w,height:el.h}} onPointerDown={e=>startDrag(e,el)} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onDoubleClick={e=>{e.stopPropagation();if(['text','list'].includes(el.type)&&guardVisual()){setSelected(el.id);setEditing(el.id);}}}>
                  <ElementView el={el} palette={project.palette} editing={editing===el.id} onText={(text,height)=>patchElement({text,h:Math.max(24,height)})}/>
                  {selected===el.id&&editing!==el.id&&<><span className="selection-label">{el.type==='text'?'Text':el.type} <small>{Math.round(el.w)} × {Math.round(el.h)}</small></span><span className="corner tl"/><span className="corner tr"/><span className="corner bl"/><span role="button" aria-label="Resize element" className="corner br resize-handle" onPointerDown={e=>startDrag(e,el,true)}/></>}
                </div>)}
                <div className="margin-guide" style={{inset:d.margin}}/>
                {guides.map((g,i)=><div key={i} className={`snap-guide ${g.axis}`} style={g.axis==='x'?{left:g.value}:{top:g.value}}/>)}
              </div>
            </div><div className="canvas-hint"><Magnet size={13}/>{marginGlow?'Blue guides mark the safe margins. Hold Alt / Option to go beyond.':'Double-click to edit · Drag to compose · Alt / Option to go beyond margins'}</div>
            {project.kind==='beamer'&&<div className="speaker-notes"><label>Speaker notes <span>Only for you</span></label><textarea aria-label="Speaker notes" placeholder="A few words to guide your story…" value={page.notes||''} onChange={e=>commit(p=>{p.pages.find(x=>x.id===page.id).notes=e.target.value;return p;})}/></div>}
            </div>}
          </div>
          <footer className="editor-status"><span><span className={`status-dot ${compiler?'ready':''}`}/>{compiler?compiler.distribution:'Visual editor'}<i>·</i>{project.nativeTheme?'Native Beamer source':`${project.kind==='beamer'?'Slide':'Page'} ${project.pages.findIndex(p=>p.id===page.id)+1} of ${project.pages.length}`}</span><div><button className={snap?'active':''} onClick={()=>setSnap(!snap)}><Magnet size={14}/>Snap {snap?'on':'off'}</button><IconButton icon={ZoomOut} label="Zoom out" onClick={()=>setZoom(z=>Math.max(.4,z-.1))}/><button onClick={()=>setZoom(1)}>{Math.round(scale*100)}%</button><IconButton icon={ZoomIn} label="Zoom in" onClick={()=>setZoom(z=>Math.min(2,z+.1))}/></div></footer>
        </main>
        <aside className="inspector"><div className="inspector-tabs"><button className="active">{project.nativeTheme?'Theme':'Design'}</button><button onClick={()=>setModal('extensions')}>Extensions</button></div>
          {project.nativeTheme&&<div className="native-theme-info"><div className="section-eyebrow">NATIVE BEAMER</div><h3>{universities.find(t=>t.id===project.nativeTheme)?.name}</h3><p>Edit the LaTeX source, then compile to preview the university's theme and its slide reveals.</p><button className="text-button" onClick={()=>api?api.openReference(project.nativeTheme):window.open(universities.find(t=>t.id===project.nativeTheme)?.url,'_blank','noopener')}>Theme source & guidance ↗</button></div>}
          <div className="inspector-content">{element?<><div className="inspector-title"><h3>{element.type==='text'?'Typography':element.type==='image'?'Image':element.type==='table'?'Table':element.type==='list'?'List':'Shape'}</h3><div><IconButton icon={Copy} label="Duplicate element" onClick={duplicate}/><IconButton icon={Trash2} label="Delete element" onClick={removeSelected}/></div></div>
            <div className="inspector-section"><label>Position & size</label><div className="geometry-grid">{['x','y','w','h'].map(k=><label key={k}><span>{k.toUpperCase()}</span><input aria-label={`Element ${k}`} type="number" value={Math.round(element[k])} onChange={e=>patchElement({[k]:['w','h'].includes(k)?Math.max(20,Number(e.target.value)):Number(e.target.value)})}/></label>)}</div><button className="inspector-text-btn" onClick={()=>{const r=snapRect(element,[],d);patchElement({x:r.x,y:r.y});}}>Fit within safe margins <Magnet size={12}/></button></div>
            {['text','list'].includes(element.type)&&<><div className="inspector-section"><label>Typeface</label><select aria-label="Typeface" value={element.fontFamily||'sans'} onChange={e=>patchElement({fontFamily:e.target.value})}><option value="sans">Sans · Arial / TeX Gyre Heros</option><option value="serif">Serif · Georgia / TeX Gyre Pagella</option></select><div className="font-controls"><input aria-label="Font size" type="number" min="6" max="150" value={element.fontSize} onChange={e=>patchElement({fontSize:Math.max(6,Math.min(150,Number(e.target.value)))})}/><IconButton icon={Bold} label="Bold" active={element.fontWeight>=600} onClick={()=>patchElement({fontWeight:element.fontWeight>=600?400:700})}/><IconButton icon={Italic} label="Italic" active={element.italic} onClick={()=>patchElement({italic:!element.italic})}/></div><div className="alignment-controls">{[['left',AlignLeft],['center',AlignCenter],['right',AlignRight]].map(([v,I])=><IconButton key={v} icon={I} label={`Align ${v}`} active={(element.align||'left')===v} onClick={()=>patchElement({align:v})}/>)}</div></div><div className="inspector-section"><label>{element.type==='list'?'List items · one per line':'Text'}</label><textarea className="inspector-text" aria-label="Selected text" value={element.text} onChange={e=>patchElement({text:e.target.value})}/><label className="color-field"><span>Text color</span><input type="color" aria-label="Text color" value={resolveColor(element,'color',project.palette)} onChange={e=>patchElement({color:e.target.value})}/></label></div></>}
            {element.type==='list'&&<div className="inspector-section"><label>List style</label><select aria-label="List style" value={element.listStyle||'itemize'} onChange={e=>patchElement({listStyle:e.target.value})}><option value="itemize">Bullets</option><option value="enumerate">Numbers</option></select></div>}
            {element.type==='rect'&&<div className="inspector-section"><label className="color-field"><span>Fill color</span><input type="color" aria-label="Fill color" value={resolveColor(element,'fill',project.palette)} onChange={e=>patchElement({fill:e.target.value})}/></label><label>Corner radius<input type="range" min="0" max="120" value={element.radius||0} onChange={e=>patchElement({radius:Number(e.target.value)})}/></label></div>}
            {element.type==='table'&&<div className="inspector-section"><label>Cells · separate columns with |</label><textarea className="inspector-text" aria-label="Table cells" value={element.data.map(r=>r.join(' | ')).join('\n')} onChange={e=>patchElement({data:e.target.value.split('\n').map(r=>r.split('|').map(v=>v.trim()))})}/></div>}
            <div className="inspector-section"><label>Arrange</label><div className="arrange-buttons"><button onClick={()=>commit(p=>{const pg=p.pages.find(x=>x.id===page.id);const i=pg.elements.findIndex(e=>e.id===selected),[el]=pg.elements.splice(i,1);pg.elements.push(el);return p;})}>Bring to front</button><button onClick={()=>commit(p=>{const pg=p.pages.find(x=>x.id===page.id);const i=pg.elements.findIndex(e=>e.id===selected),[el]=pg.elements.splice(i,1);pg.elements.unshift(el);return p;})}>Send to back</button></div></div>
          </>:<><div className="inspector-title"><h3>Your canvas</h3><Settings2 size={16}/></div><p className="inspector-description">A considered starting point.<br/>Make every detail yours.</p><div className="inspector-section"><label>Template</label><div className="current-template"><LayoutTemplate size={18}/><span>{templates.find(t=>t.id===project.templateId)?.name||'Custom'}<small>{project.kind==='beamer'?'Presentation':'Document'}</small></span><button onClick={()=>{setGalleryKind(project.kind);setModal('templates');}}><ArrowUpRight size={15}/></button></div></div></>}
          <div className="inspector-section"><label>Document palette <span>{project.palette.name}</span></label><div className="palette-options">{palettes.map(p=><button key={p.name} aria-label={`${p.name} palette`} title={p.name} className={project.palette.name===p.name?'selected':''} onClick={()=>commit(doc=>({...doc,palette:{...p}}))}><span style={{background:p.accent}}/><span style={{background:p.muted}}/>{project.palette.name===p.name&&<Check size={12}/>}</button>)}</div><div className="custom-colors">{['accent','ink','paper','muted'].map(k=><label key={k} title={k}><input type="color" aria-label={`Palette ${k}`} value={project.palette[k]} onChange={e=>commit(p=>({...p,palette:{...p.palette,[k]:e.target.value,name:'Custom'}}))}/><small>{k}</small></label>)}</div></div>
          <div className="inspector-section"><label>Layout assistance</label><button className="toggle-row" onClick={()=>setSnap(!snap)}><span><Magnet size={16}/>Magnetic alignment</span><span className={`toggle ${snap?'on':''}`}/></button><p className="fineprint">Elements snap to margins, centers, and neighboring objects. Hold Alt / Option for free placement.</p></div>
          <div className="inspector-help"><MousePointer2 size={18}/><strong>Made to move.</strong><p>Click an element to fine-tune it. Double-click text to start writing.</p></div>
          </div><div className="compile-panel"><button className="primary-button" disabled={compileBusy||setupBusy} onClick={compile}>{compileBusy?<LoaderCircle className="spin" size={16}/>:<FileCode2 size={16}/>} {compileBusy?'Typesetting…':'Compile PDF'}</button><div><button onClick={()=>setShowLog(true)}><Terminal size={12}/>Build log</button>{compileBusy?<button onClick={()=>api?.cancel()}>Cancel</button>:<span>XeLaTeX</span>}</div></div>
        </aside>
      </div>}
    </div>}
    {presenting&&project&&<div className="presentation-view"><button className="present-exit" onClick={()=>{setPresenting(false);document.exitFullscreen?.().catch(()=>{});}}><X size={20}/>Exit presentation</button><div className="present-slide"><MiniPage page={project.pages[presentIndex]} project={project} width={Math.min(window.innerWidth-80,(window.innerHeight-100)*16/9)}/></div><div className="present-controls"><button aria-label="Previous slide" disabled={presentIndex===0} onClick={()=>setPresentIndex(i=>i-1)}><ArrowLeft/></button><span>{presentIndex+1} / {project.pages.length}</span><button aria-label="Next slide" disabled={presentIndex===project.pages.length-1} onClick={()=>setPresentIndex(i=>i+1)}><ArrowRight/></button></div></div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><section className={`modal ${modal==='templates'?'wide':''}`} role="dialog" aria-modal="true" aria-label={modal}><button className="modal-close icon-btn" onClick={()=>setModal(null)} aria-label="Close dialog"><X size={20}/></button>
      {modal==='templates'?templateGallery(true):modal==='extensions'?<><div className="section-eyebrow">A WORKSPACE THAT GROWS WITH YOU</div><h2>Extensions & setup</h2><p className="muted">Everything your words and ideas need, in one place.</p><div className="engine-card"><span className="engine-icon"><FileCode2 size={25}/></span><div><h3>{compiler?compiler.distribution:'Your LaTeX engine'}</h3><p>{compiler?'Detected and ready to typeset.':'TinyTeX sets up a compiler in your user account.'}</p>{compiler&&<code>{compiler.version}</code>}</div>{compiler?<span className="ready-pill"><Check size={13}/>Ready</span>:<button className="primary-button" disabled={setupBusy||!api} onClick={setup}>{setupBusy?<LoaderCircle className="spin" size={16}/>:'Set up'}</button>}</div>
        {progress&&<div className={`setup-progress ${progress.error?'error':''}`}><span>{progress.message}</span>{progress.percent!=null&&<progress value={progress.percent} max="100"/>}{setupBusy&&<button onClick={()=>{localStorage.setItem('texsuite-auto-setup','off');api?.cancel();}}>Cancel setup</button>}</div>}
        <div className="extension-list">{(extensions.length?extensions:[{id:'essentials',title:'LaTeX essentials',packages:['XeLaTeX','Beamer','TikZ','fonts']},{id:'mathematics',title:'Mathematics',packages:['AMS','Unicode math']},{id:'bibliography',title:'Bibliography',packages:['BibLaTeX','Biber']},{id:'tables',title:'Beautiful tables',packages:['Booktabs','Siunitx']},{id:'diagrams',title:'Scientific diagrams',packages:['PGFPlots','TikZ-CD']}]).map((e,i)=><div className="extension-item" key={e.id}><span className="extension-glyph">{['TₑX','∑','“ ”','▦','◇','¶','U'][i]}</span><div><strong>{e.title}</strong><p>{e.packages.join(' · ')}{e.installed===null?' · Not checked':''}</p></div><button className={e.installed?'installed':'secondary-button compact'} disabled={e.installed||!compiler||setupBusy||compileBusy} onClick={async()=>{setSetupBusy(true);try{setExtensions(await api.installExtension(e.id));notify(`${e.title} is ready`);}catch(err){notify(err.message);}finally{setSetupBusy(false);}}}>{e.installed?<><Check size={13}/>Installed</>:'Install'}</button></div>)}</div><div className="extension-footer"><span>Missing packages are resolved during compilation.</span><button className="text-button" onClick={async()=>{if(!api)return;setChecking(true);try{setCompiler(await api.detectCompiler());setExtensions(await api.extensions(true));}catch(e){notify(e.message);}finally{setChecking(false);}}}><RefreshCw size={13}/>Check again</button></div></>
      :modal==='export'?<><div className="section-eyebrow">READY FOR THE WORLD</div><h2>Take your work with you.</h2><p className="muted">Keep it editable, share the source, or create a beautiful PDF.</p><div className="export-options"><button onClick={exportProject}><Save/><div><strong>TeX Suite project</strong><p>All pages, images, styles, and notes · .texsuite</p></div><Download size={17}/></button><button onClick={exportTex}><Code2/><div><strong>LaTeX source</strong><p>Editable source and image assets · .tex</p></div><Download size={17}/></button><button disabled={compileBusy} onClick={async()=>{if(!compiled||compiled.projectId!==project.id||compiled.revision!==project.updatedAt){setModal(null);await compile();notify('PDF compiled. Open Export to save it.');return;}try{if(api)await api.exportPdf();else download('Document.pdf',await(await fetch(compiled.url)).arrayBuffer(),'application/pdf');}catch(e){notify(e.message);}}}><FileText/><div><strong>PDF document</strong><p>{compiled&&compiled.revision===project.updatedAt?'Compiled and ready to save':'Compile the latest version first'}</p></div><Download size={17}/></button></div></>
      :modal==='location'?<><div className="section-eyebrow">PROJECT STORAGE</div><h2>Where this project is saved</h2><p className="muted">TeX Suite automatically saves the editable project here:</p><code className="project-storage-path" aria-label="Saved project path">{storagePath||'Finding project location…'}</code><button className="secondary-button project-storage-open" onClick={async()=>{try{if(await save(projectRef.current))await api.revealProject(project.id);}catch(e){notify(e.message);}}}><FolderOpen size={16}/>Open folder and select project</button><p className="fineprint">PDF and LaTeX exports are saved separately wherever you choose in the Save dialog.</p></>
      :<><div className="section-eyebrow">FIND YOUR FLOW</div><h2>A few useful things.</h2><div className="help-grid">{[['Double-click','Edit text directly on the page.'],['Drag','Move elements. Blue lines show alignment.'],['Alt / Option + drag','Go beyond the safe margins. They glow blue.'],['Shift + resize','Keep the element’s aspect ratio.'],['⌘ / Ctrl + Z','Undo. Add Shift to redo.'],['Delete','Delete the selected element.'],['Visual / Split / LaTeX','Choose how you want to work.'],['Compile PDF','Create the final typeset document locally.']].map(([k,v])=><div key={k}><kbd>{k}</kbd><p>{v}</p></div>)}</div><p className="fineprint">Visual layouts generate LaTeX. Arbitrary LaTeX is compiled as written; it is not automatically converted into draggable objects. Imported .tex files with external images need those assets embedded through a TeX Suite project.</p></>}
    </section></div>}
    {showLog&&<div className="log-panel"><header><span><Terminal size={16}/>Compilation log</span><button className="icon-btn" aria-label="Close log" onClick={()=>setShowLog(false)}><X size={18}/></button></header><pre>{compileLog||'No compilation yet. Your build output will appear here.'}</pre></div>}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
    {setupBusy&&modal!=='extensions'&&<button className="setup-floating" onClick={()=>setModal('extensions')}><LoaderCircle className="spin" size={17}/><span>{progress?.message||'Setting up your workspace…'}</span><ArrowUpRight size={15}/></button>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);

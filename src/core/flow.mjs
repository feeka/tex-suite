import { publisherById } from './catalog.mjs';
import {validFormula,validLabel} from './science.mjs';
export const paragraph=text=>({type:'paragraph',content:text?[{type:'text',text}]:[]});
export function newFlow(){
  return {publisherId:'article',authors:'Your name',affiliation:'Your institution',city:'Your city',country:'Your country',abstract:'Summarize the question, approach, and main finding.',keywords:'Research; methods',doc:{type:'doc',content:[
    {type:'heading',attrs:{level:1},content:[{type:'text',text:'Introduction'}]},
    paragraph('Good work begins with a clear question. Start writing here. Text wraps naturally and the document grows with your ideas.'),
    {type:'heading',attrs:{level:1},content:[{type:'text',text:'Methods'}]},paragraph('Describe your approach.'),
    {type:'heading',attrs:{level:1},content:[{type:'text',text:'Results'}]},paragraph('Present your findings.'),
    {type:'heading',attrs:{level:1},content:[{type:'text',text:'Discussion'}]},paragraph('Explain what your findings mean.'),
  ]}};
}
export function validateFlow(f){
  if(!f||!f.doc||f.doc.type!=='doc'||!['publisherId','authors','affiliation','abstract','keywords'].every(k=>typeof f[k]==='string'&&f[k].length<100000))throw new Error('Invalid manuscript.');
  if(['city','country'].some(k=>f[k]!=null&&(typeof f[k]!=='string'||f[k].length>10000)))throw new Error('Invalid affiliation metadata.');
  let count=0;
  const types=new Set(['doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','codeBlock','hardBreak','horizontalRule','image','figureGroup','table','tableRow','tableCell','tableHeader','pageBreak','inlineMath','displayMath','crossReference']);
  function walk(n,depth=0){
    if(++count>50000||depth>30||!types.has(n.type))throw new Error('Invalid manuscript structure.');
    if(n.text!=null&&(typeof n.text!=='string'||n.text.length>100000))throw new Error('Invalid manuscript text.');
    if(n.type==='image'&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(n.attrs?.src??''))throw new Error('Images must be embedded PNG or JPEG.');
    if((n.type==='inlineMath'||n.type==='displayMath')&&!validFormula(n.attrs?.latex))throw new Error('Invalid formula.');
    if(n.attrs?.label&& !validLabel(n.attrs.label))throw new Error('Invalid label.');
    if(n.type==='crossReference'&&n.attrs?.target&&!validLabel(n.attrs.target))throw new Error('Invalid reference target.');
    if(n.type==='figureGroup'){
      const a=n.attrs??{},panels=a.panels;
      if(!['row','column','grid'].includes(a.layout)||!['column','full'].includes(a.width)||typeof a.caption!=='string'||a.caption.length>10000||!Array.isArray(panels)||panels.length<1||panels.length>12)throw new Error('Invalid figure group.');
      for(const panel of panels){
        if(!panel||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(panel.src??'')||typeof panel.caption!=='string'||panel.caption.length>10000||typeof panel.alt!=='string'||panel.alt.length>10000||!Number.isFinite(panel.width)||panel.width<10||panel.width>100)throw new Error('Invalid figure panel.');
      }
    }
    if(n.content!=null&&!Array.isArray(n.content))throw new Error('Invalid manuscript content.');
    if(n.marks!=null&&(!Array.isArray(n.marks)||n.marks.length>20))throw new Error('Invalid text formatting.');
    n.content?.forEach(child=>walk(child,depth+1));
  }
  walk(f.doc);return f;
}
export function flowText(node){return node.text??node.content?.map(flowText).join(['doc','table','tableRow','bulletList','orderedList'].includes(node.type)?'\n':'')??'';}
const tex=s=>String(s??'').replace(/[\\{}$&#%_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c]));
export function flowAssets(doc){
  const out=[];function add(src){out.push({name:`flow-${out.length}.${src.startsWith('data:image/jpeg')?'jpg':'png'}`,data:src.split(',')[1]});}function walk(n){if(n.type==='image')add(n.attrs.src);if(n.type==='figureGroup')for(const panel of n.attrs.panels)add(panel.src);n.content?.forEach(walk);}walk(doc);return out;
}
export function flowToLatex(project){
  const f=validateFlow(project.flow),p=publisherById(f.publisherId);let imageIndex=0;
  function render(n){
    const content=()=>n.content?.map(render).join('')??'';
    if(n.type==='text'){
      let s=tex(n.text);
      for(const m of n.marks??[]){
        const cmd={bold:'textbf',italic:'textit',underline:'uline',strike:'sout',superscript:'textsuperscript',subscript:'textsubscript',code:'texttt'}[m.type];
        if(cmd)s=`\\${cmd}{${s}}`;
        if(m.type==='link'&&/^https?:\/\//.test(m.attrs?.href??''))s=`\\href{${tex(m.attrs.href)}}{${s}}`;
        if(m.type==='textStyle'){
          if(/^#[\da-f]{6}$/i.test(m.attrs?.color??''))s=`\\textcolor[HTML]{${m.attrs.color.slice(1)}}{${s}}`;
          const size=parseFloat(m.attrs?.fontSize);if(size>=6&&size<=72)s=`{\\fontsize{${size}}{${size*1.35}}\\selectfont ${s}}`;
          if(['Suite Sans','Arial'].includes(m.attrs?.fontFamily))s=`\\textsf{${s}}`;
          if(m.attrs?.fontFamily==='monospace')s=`\\texttt{${s}}`;
        }
      }return s;
    }
    if(n.type==='heading')return `\n\\${['section','subsection','subsubsection'][Math.min(3,Math.max(1,n.attrs?.level||1))-1]}{${content()}}${n.attrs?.label?`\\label{${n.attrs.label}}`:''}\n`;
    if(n.type==='inlineMath')return `\\(${n.attrs.latex}\\)`;
    if(n.type==='displayMath')return `\n\\begin{equation}\n${n.attrs.latex}\n${n.attrs.label?`\\label{${n.attrs.label}}\n`:''}\\end{equation}\n`;
    if(n.type==='crossReference')return n.attrs.target?`\\ref{${n.attrs.target}}`:'??';
    if(n.type==='paragraph'){const a={center:'center',right:'flushright',left:'flushleft'}[n.attrs?.textAlign];const lines=(n.content||[]).flatMap(c=>c.marks||[]).map(m=>parseFloat(m.attrs?.lineHeight)).filter(v=>v>=1&&v<=3);const spacing=lines.length?`\\linespread{${Math.max(...lines)}}\\selectfont `:'';const text=spacing?`{${spacing}${content()}\\par}`:content();return a?`\\begin{${a}}${text}\\end{${a}}\n`:`${text}\\par\n`;}
    if(n.type==='bulletList'||n.type==='orderedList'){const env=n.type==='bulletList'?'itemize':'enumerate';return `\\begin{${env}}\n${content()}\\end{${env}}\n`;}
    if(n.type==='listItem')return `\\item ${content()}`;
    if(n.type==='blockquote')return `\\begin{quote}${content()}\\end{quote}\n`;
    if(n.type==='hardBreak')return '\\newline ';
    if(n.type==='pageBreak')return '\\clearpage\n';
    if(n.type==='horizontalRule')return '\\par\\noindent\\rule{\\linewidth}{0.4pt}\\par\n';
    if(n.type==='codeBlock')return `\\begin{quote}\\ttfamily ${tex(flowText(n)).replace(/\n/g,'\\newline ')}\\end{quote}\n`;
    if(n.type==='image'){
      const filename=`flow-${imageIndex++}.${n.attrs.src.startsWith('data:image/jpeg')?'jpg':'png'}`;
      const fraction=Math.min(1,Math.max(.15,(Number(n.attrs.width)||600)/660));
      if(['left','right'].includes(n.attrs.wrap))return `\\begin{wrapfigure}{${n.attrs.wrap[0]}}{${Math.min(360/660,fraction)}\\linewidth}\\includegraphics[width=\\linewidth]{assets/${filename}}\\end{wrapfigure}\n`;
      return `\\begin{center}\\includegraphics[width=${fraction}\\linewidth]{assets/${filename}}\\end{center}\n`;
    }
    if(n.type==='figureGroup'){
      const panels=n.attrs.panels,layout=n.attrs.layout,environment=n.attrs.width==='full'?'figure*':'figure';
      const files=panels.map(panel=>({panel,filename:`flow-${imageIndex++}.${panel.src.startsWith('data:image/jpeg')?'jpg':'png'}`}));
      const rows=layout==='row'?1:layout==='grid'?Math.ceil(panels.length/2):panels.length;
      const maxHeight=Math.min(.38,.60/rows);
      const panelBody=({panel,filename},fraction,imageWidth=1)=>`\\begin{minipage}[t]{${fraction.toFixed(4)}\\linewidth}\n\\centering\n\\includegraphics[width=${imageWidth.toFixed(3)}\\linewidth,height=${maxHeight.toFixed(3)}\\textheight,keepaspectratio]{assets/${filename}}${panel.caption?`\\par\\small ${tex(panel.caption)}`:''}\n\\end{minipage}`;
      let body='';
      if(layout==='row'){
        body=files.map(item=>panelBody(item,.96/panels.length,item.panel.width/100)).join('\\hfill\n');
      }else if(layout==='grid'){
        body=files.map((item,index)=>`${panelBody(item,.48,item.panel.width/100)}${index%2===0&&index<files.length-1?'\\hfill':'\\par\\medskip'}\n`).join('');
      }else{
        body=files.map(item=>`${panelBody(item,1,item.panel.width/100)}\\par\\medskip\n`).join('');
      }
      return `\\begin{${environment}}[!tbp]\n\\centering\n${body}${n.attrs.caption||n.attrs.label?`\\caption{${tex(n.attrs.caption)}}\n`:''}${n.attrs.label?`\\label{${n.attrs.label}}\n`:''}\\end{${environment}}\n`;
    }
    if(n.type==='table'){
      const cols=Math.max(...(n.content??[]).map(r=>(r.content??[]).reduce((sum,c)=>sum+Math.min(20,Number(c.attrs?.colspan)||1),0)),1);
      const revtex=p.className==='revtex4-2',env=revtex?'tabular':'tabularx';
      const col=revtex?`p{\\dimexpr${(1/cols).toFixed(6)}\\linewidth-2\\tabcolsep-2\\arrayrulewidth\\relax}|`:'X|';
      return `\\begin{center}\\begin{${env}}${revtex?'':'{\\linewidth}'}{|${col.repeat(cols)}}\\hline\n${(n.content??[]).map(r=>(r.content??[]).map(c=>{const body=c.content?.map(render).join('')||'';return c.type==='tableHeader'?`{\\bfseries ${body}}`:body;}).join(' & ')).join('\\\\\\hline\n')}\\\\\\hline\\end{${env}}\\end{center}\n`;
    }
    return content();
  }
  const title=tex(project.title),author=tex(f.authors),aff=tex(f.affiliation),abstract=tex(f.abstract),keywords=tex(f.keywords),body=render(f.doc);
  let pre='',front=`\\title{${title}}\n\\author{${author}\\\\${aff}}\n\\date{}\n`,start='\\maketitle\n',after=`\\begin{abstract}${abstract}\\end{abstract}\n`;
  if(p.className==='elsarticle'){front='';start=`\\begin{frontmatter}\\title{${title}}\\author{${author}}\\address{${aff}}\\begin{abstract}${abstract}\\end{abstract}\\begin{keyword}${keywords}\\end{keyword}\\end{frontmatter}\n`;after='';}
  if(p.className==='revtex4-2'){front='';start=`\\title{${title}}\\author{${author}}\\affiliation{${aff}}\\date{\\today}\n\\begin{abstract}${abstract}\\end{abstract}\\maketitle\n`;after='';}
  if(p.className==='acmart'){pre='\\settopmatter{printacmref=false}\n';front=`\\title{${title}}\\author{${author}}\\affiliation{\\institution{${aff}}\\city{${tex(f.city||'Your city')}}\\country{${tex(f.country||'Your country')}}}\n`;start=`\\begin{abstract}${abstract}\\end{abstract}\\keywords{${keywords}}\\maketitle\n`;after='';}
  if(p.className==='achemso'){front=`\\title{${title}}\\author{${author}}\\affiliation{${aff}}\\keywords{${keywords}}\n`;start='';}
  if(p.className==='amsart'){front=`\\title{${title}}\\author{${author}}\\address{${aff}}\\keywords{${keywords}}\n`;start=`\\begin{abstract}${abstract}\\end{abstract}\\maketitle\n`;after='';}
  if(p.className==='mnras'){front=`\\title{${title}}\\author{${author}\\\\${aff}}\\date{}\\pubyear{${new Date().getFullYear()}}\n`;after+=`\\begin{keywords}${keywords}\\end{keywords}\n`;}
  if(p.className==='oup-authoring-template'){pre='\\providecommand{\\societylogo}{}\n';front='';start=`\\journaltitle{${tex(['bioinformatics','briefings-bioinformatics'].includes(p.id)?p.name:'Journal manuscript')}}\\DOI{}\\copyrightyear{}\\pubyear{}\\vol{}\\issue{}\\firstpage{1}\\access{}\\appnotes{Research article}\\title[${title}]{${title}}\\author[1]{${author}}\\address[1]{\\orgname{${aff}}}\\abstract{${abstract}}\\keywords{${keywords}}\\maketitle\n`;after='';}
  if(p.className==='sn-jnl'){front='';start=`\\title{${title}}\\author[1]{${author}}\\affil[1]{\\orgname{${aff}}}\\abstract{${abstract}}\\keywords{${keywords}}\\maketitle\n`;after='';}
  if(p.className==='USG'){pre='\\makeatletter\n\\patchcmd{\\@maketitle}{\\includegraphics[width=56mm]{allergy.eps}}{}{}{}\n\\patchcmd{\\@@articletype}{\\includegraphics[width=0.70in]{images/openaccess}}{}{}{}\n\\makeatother\n\\graphicspath{{images/}}\n\\articletype{RESEARCH ARTICLE}\n\\journal{Manuscript}\n\\volume{}\n\\articledoi{}\n\\received{}\n\\revised{}\n\\accepted{}\n\\copyyear{}\n\\startpage{1}\n';front='';start=`\\title{${title}}\\author[1]{${author}}\\address[1]{\\orgname{${aff}}}\\authormark{${author}}\\titlemark{${title}}\\keywords{${keywords}}\\abstract[ABSTRACT]{${abstract}}\\maketitle\n`;after='';}
  return `% ${p.name} · native ${p.className} class\n% Check the target journal's author instructions before submission.\n\\PassOptionsToPackage{normalem}{ulem}\n\\documentclass${p.options?`[${p.options}]`:''}{${p.className}}\n${p.className==='article'?'\\usepackage[a4paper,margin=25mm]{geometry}\n':''}\\usepackage{amsmath}\n\\usepackage[T1]{fontenc}\n\\usepackage{graphicx}\n\\usepackage{xcolor}\n${p.className==='revtex4-2'?'':'\\usepackage{tabularx}\n'}\\usepackage{wrapfig}\n\\usepackage{ulem}\n\\usepackage{hyperref}\n${pre}${front}\\begin{document}\n${start}${after}${body}\\end{document}\n`;
}

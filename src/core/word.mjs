import {Document,Packer,Paragraph,TextRun,HeadingLevel,Table,TableRow,TableCell,WidthType,ImageRun,ExternalHyperlink} from 'docx';
export async function exportDocx(project){
  const sizes=new Map();
  async function inspectSource(src){const img=new Image();img.src=src;await img.decode();sizes.set(src,{w:img.naturalWidth,h:img.naturalHeight});}
  async function inspect(n){if(n.type==='image')await inspectSource(n.attrs.src);if(n.type==='figureGroup')await Promise.all(n.attrs.panels.map(panel=>inspectSource(panel.src)));await Promise.all((n.content||[]).map(inspect));}
  await inspect(project.flow.doc);
  function inline(n){
    if(n.type==='hardBreak')return new TextRun({break:1});
    if(n.type==='inlineMath')return new TextRun({text:'$'+n.attrs.latex+'$'});
    if(n.type==='crossReference')return new TextRun({text:'[ref: '+n.attrs.target+']'});
    if(n.type!=='text')return new TextRun('');
    const marks=n.marks||[],has=t=>marks.some(m=>m.type===t),style=marks.find(m=>m.type==='textStyle')?.attrs||{};
    const run=new TextRun({text:n.text,bold:has('bold'),italics:has('italic'),underline:has('underline')?{}:undefined,strike:has('strike'),superScript:has('superscript'),subScript:has('subscript'),color:/^#[a-f0-9]{6}$/i.test(style.color)?style.color.slice(1):undefined,size:Math.min(144,Math.max(12,(parseFloat(style.fontSize)||12)*2))});
    const link=marks.find(m=>m.type==='link')?.attrs?.href;
    return /^https?:\/\//.test(link||'')?new ExternalHyperlink({children:[run],link}):run;
  }
  function blocks(nodes,bullet=false,ordered=false){
    return (nodes||[]).flatMap(n=>{
      if(n.type==='bulletList'||n.type==='orderedList')return (n.content||[]).flatMap(item=>blocks(item.content,n.type==='bulletList',n.type==='orderedList'));
      if(n.type==='blockquote'||n.type==='listItem')return blocks(n.content,bullet,ordered);
      if(n.type==='table')return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:n.content.map(r=>new TableRow({children:r.content.map(c=>new TableCell({children:blocks(c.content)}))}))});
      if(n.type==='image'){
        const data=Uint8Array.from(atob(n.attrs.src.split(',')[1]),c=>c.charCodeAt(0));
        const width=Math.min(600,Number(n.attrs.width)||300),size=sizes.get(n.attrs.src);
        return new Paragraph({children:[new ImageRun({data,type:n.attrs.src.startsWith('data:image/jpeg')?'jpg':'png',transformation:{width,height:width*size.h/size.w}})]});
      }
      if(n.type==='figureGroup'){
        const image=(panel,width)=>{const data=Uint8Array.from(atob(panel.src.split(',')[1]),c=>c.charCodeAt(0)),size=sizes.get(panel.src);return new Paragraph({children:[new ImageRun({data,type:panel.src.startsWith('data:image/jpeg')?'jpg':'png',transformation:{width,height:width*size.h/size.w}})]});};
        const cell=(panel,width)=>new TableCell({children:[image(panel,width),...(panel.caption?[new Paragraph({text:panel.caption})]:[])]});
        let content;
        if(n.attrs.layout==='column')content=n.attrs.panels.flatMap(panel=>[image(panel,Math.round(540*panel.width/100)),...(panel.caption?[new Paragraph({text:panel.caption})]:[])]);
        else {const rows=[];const columns=n.attrs.layout==='grid'?2:n.attrs.panels.length;for(let i=0;i<n.attrs.panels.length;i+=columns)rows.push(new TableRow({children:n.attrs.panels.slice(i,i+columns).map(panel=>cell(panel,Math.max(24,Math.floor(540/columns*panel.width/100))))}));content=[new Table({width:{size:100,type:WidthType.PERCENTAGE},rows})];}
        return [...content,...(n.attrs.caption?[new Paragraph({text:n.attrs.caption})]:[])];
      }
      if(n.type==='displayMath')return new Paragraph({children:[new TextRun({text:n.attrs.latex,italics:true}),...(n.attrs.label?[new TextRun({text:'  ['+n.attrs.label+']'})]:[])]});
      if(n.type==='pageBreak')return new Paragraph({pageBreakBefore:true});
      return new Paragraph({children:(n.content||[]).filter(c=>['text','hardBreak','inlineMath','crossReference'].includes(c.type)).map(inline),heading:n.type==='heading'?HeadingLevel[`HEADING_${Math.min(3,n.attrs?.level||1)}`]:undefined,alignment:n.attrs?.textAlign||undefined,bullet:bullet?{level:0}:undefined,numbering:ordered?{reference:'ordered',level:0}:undefined,spacing:{after:160,line:276}});
    });
  }
  const f=project.flow;
  const doc=new Document({styles:{paragraphStyles:[
    {id:'TSAuthors',name:'TeX Suite Authors',basedOn:'Normal'},{id:'TSAffiliation',name:'TeX Suite Affiliation',basedOn:'Normal'},
    {id:'TSAbstractHeading',name:'TeX Suite Abstract Heading',basedOn:'Heading1'},{id:'TSAbstract',name:'TeX Suite Abstract',basedOn:'Normal'}
  ]},numbering:{config:[{reference:'ordered',levels:[{level:0,format:'decimal',text:'%1.',alignment:'left'}]}]},sections:[{children:[
    new Paragraph({text:project.title,heading:HeadingLevel.TITLE}),new Paragraph({text:f.authors,style:'TSAuthors'}),new Paragraph({text:f.affiliation,style:'TSAffiliation'}),new Paragraph({text:'Abstract',style:'TSAbstractHeading'}),new Paragraph({text:f.abstract,style:'TSAbstract'}),...blocks(f.doc.content)
  ]}]});
  return Packer.toBlob(doc);
}

import {newFlow,validateFlow} from './flow.mjs';
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const dimensions = kind => kind === 'beamer' ? { width: 960, height: 540, margin: 48 } : { width: 794, height: 1123, margin: 68 };
export const palettes = [
  { name: 'Forest', accent: '#245747', ink: '#243831', paper: '#FAF9F5', muted: '#DCE9DF' },
  { name: 'Stuttgart', accent: '#00519E', ink: '#3E444C', paper: '#FFFFFF', muted: '#DDECF7' },
  { name: 'Terracotta', accent: '#A84F3B', ink: '#382C29', paper: '#FFF9F3', muted: '#F2DDD2' },
  { name: 'Midnight', accent: '#3946A0', ink: '#252641', paper: '#FAFAFE', muted: '#E4E5FA' },
  { name: 'Plum', accent: '#804265', ink: '#372833', paper: '#FFFAFD', muted: '#EEDDDF' },
  { name: 'Charcoal', accent: '#3E444C', ink: '#22262A', paper: '#FFFFFF', muted: '#E9EBED' },
];
export const templates = [
  { id: 'atelier', name: 'Atelier', category: 'Editorial', description: 'Quiet typography. Room to think.', family: 'serif', motif: 'editorial', palette: 0 },
  { id: 'stuttgart', name: 'Stuttgart', category: 'Academic', description: 'Crisp blue rules and academic clarity.', family: 'sans', motif: 'rule', palette: 1 },
  { id: 'folio', name: 'Folio', category: 'Editorial', description: 'An editorial cover with a generous spine.', family: 'serif', motif: 'spine', palette: 2 },
  { id: 'orbit', name: 'Orbit', category: 'Research', description: 'Circular geometry for connected ideas.', family: 'sans', motif: 'orbit', palette: 3 },
  { id: 'monograph', name: 'Monograph', category: 'Academic', description: 'Classic scholarship, beautifully spaced.', family: 'serif', motif: 'classic', palette: 5 },
  { id: 'fieldnotes', name: 'Fieldnotes', category: 'Research', description: 'A grounded grid for observations.', family: 'sans', motif: 'grid', palette: 0 },
  { id: 'signal', name: 'Signal', category: 'Business', description: 'A bold accent and a clear point of view.', family: 'sans', motif: 'band', palette: 2 },
  { id: 'prism', name: 'Prism', category: 'Creative', description: 'A diagonal composition with contrast.', family: 'sans', motif: 'diagonal', palette: 3 },
  { id: 'linen', name: 'Linen', category: 'Editorial', description: 'Warm paper and restrained serif titles.', family: 'serif', motif: 'frame', palette: 2 },
  { id: 'blueprint', name: 'Blueprint', category: 'Research', description: 'Technical structure, without the clutter.', family: 'sans', motif: 'technical', palette: 1 },
  { id: 'journal', name: 'Journal', category: 'Academic', description: 'Abstracts, sections, and scholarly rhythm.', family: 'serif', motif: 'journal', palette: 5 },
  { id: 'horizon', name: 'Horizon', category: 'Business', description: 'A broad color field and quiet details.', family: 'sans', motif: 'horizon', palette: 0 },
  { id: 'margin', name: 'Margin', category: 'Editorial', description: 'Strong marginalia and asymmetry.', family: 'serif', motif: 'margin', palette: 4 },
  { id: 'studio', name: 'Studio', category: 'Creative', description: 'Expressive blocks, balanced composition.', family: 'sans', motif: 'blocks', palette: 4 },
  { id: 'minimal', name: 'Minimal', category: 'Business', description: 'Only what matters, precisely placed.', family: 'sans', motif: 'minimal', palette: 5 },
];
const text = (content, x, y, w, h, fontSize, extra = {}) => ({ id: uid(), type: 'text', text: content, x, y, w, h, fontSize, fontFamily: 'sans', fontWeight: 400, align: 'left', colorRole: 'ink', ...extra });
const shape = (x, y, w, h, fillRole = 'accent', extra = {}) => ({ id: uid(), type: 'rect', x, y, w, h, fillRole, radius: 0, ...extra });
function decoration(t, d) {
  const { width: W, height: H } = d;
  switch (t.motif) {
    case 'rule': return [shape(48, 48, 75, 5), shape(48, H - 49, W - 96, 1, 'muted')];
    case 'spine': return [shape(0, 0, 27, H), shape(W - 180, 0, 180, H, 'muted')];
    case 'orbit': return [shape(W - 265, H - 260, 220, 220, 'muted', { radius: 110 }), shape(W - 180, H - 175, 80, 80)];
    case 'classic': return [shape(48, 48, W - 96, 2), shape(48, H - 50, W - 96, 2)];
    case 'grid': return Array.from({ length: 7 }, (_, i) => shape(W - 225 + i * 25, 50, 1, H - 100, 'muted'));
    case 'band': return [shape(0, 0, W, 24), shape(W - 180, H - 140, 140, 100, 'muted')];
    case 'diagonal': return [shape(W - 235, 0, 235, H, 'muted'), shape(W - 210, H - 145, 150, 85)];
    case 'frame': return [shape(22, 22, W - 44, H - 44, 'paper', { strokeRole: 'accent', strokeWidth: 1 })];
    case 'technical': return [shape(48, 48, W - 96, 1), shape(W - 220, 48, 1, H - 96), shape(48, H - 60, W - 96, 1)];
    case 'journal': return [shape(48, 72, W - 96, 2), shape(48, H - 64, W - 96, 1)];
    case 'horizon': return [shape(0, H - 120, W, 120, 'muted'), shape(48, H - 120, 100, 5)];
    case 'margin': return [shape(40, 48, 4, H - 96), shape(W - 190, 0, 190, 30, 'muted')];
    case 'blocks': return [shape(W - 210, 52, 150, 150, 'muted'), shape(W - 125, 160, 65, 65)];
    case 'minimal': return [shape(48, H - 60, 35, 3)];
    default: return [shape(W - 230, 90, 170, 300, 'muted', { radius: 85 }), shape(W - 205, 118, 120, 244, 'paper', { radius: 60 })];
  }
}
export function createPage(kind, templateId = 'atelier', index = 0, layout = 'title') {
  const t = templates.find(t => t.id === templateId) ?? templates[0];
  const d = dimensions(kind);
  const W = d.width, H = d.height, m = d.margin;
  let elements;
  if (kind === 'beamer') {
    elements = layout === 'title' ? [
      ...decoration(t, d),
      text('RESEARCH & DISCOVERY', m, 68, 500, 20, 12, { colorRole: 'accent', fontWeight: 700 }),
      text('Ideas worth\nsharing.', m, 153, 620, 185, 67, { fontFamily: t.family, colorRole: 'accent', lineHeight: 1.08 }),
      text('A thoughtful space for your next big idea.', m, 360, 600, 36, 21),
      text('YOUR NAME  /  PRESENTATION DATE', m, H - 66, 600, 20, 11, { colorRole: 'accent' }),
    ] : [
      text(index === 1 ? 'The questions that move us' : 'A new perspective', m, 48, 820, 60, 36, { fontFamily: t.family, colorRole: 'accent' }),
      shape(m, 125, W - m * 2, 1, 'muted'),
      text('01', m, 174, 60, 40, 26, { colorRole: 'accent', fontFamily: t.family }),
      text('Start with a meaningful question.\nGive every idea room to breathe.\nMake the complex feel clear.', m + 84, 177, 670, 180, 27, { lineHeight: 1.65 }),
      text('Double-click any text to make it yours.', m + 84, 378, 670, 32, 16, { colorRole: 'accent' }),
      text(String(index + 1).padStart(2, '0'), W - 88, H - 48, 40, 20, 12, { align: 'right', colorRole: 'accent' }),
    ];
  } else {
    elements = [
      shape(m, 62, W - m * 2, 2),
      text('FIELD NOTES · VOLUME 01', m, 85, W - m * 2, 25, 11, { colorRole: 'accent', fontWeight: 700 }),
      text(index ? 'A closer look' : 'A space for\noriginal thinking.', m, 145, W - m * 2, 160, 49, { fontFamily: t.family, colorRole: 'accent', lineHeight: 1.15 }),
      text('Your name · Research & ideas', m, 328, W - m * 2, 30, 15),
      text('Abstract', m, 403, W - m * 2, 35, 23, { fontFamily: t.family, colorRole: 'accent' }),
      text('Good work begins with a clear question. This manuscript is a place to develop yours: to connect observations, follow an argument, and share what you discover.\n\nWrite with intention. The typography and structure are already here, so you can focus on the ideas.', m, 454, W - m * 2, 210, 18, { lineHeight: 1.65 }),
      text('1.  Introduction', m, 710, W - m * 2, 40, 25, { fontFamily: t.family, colorRole: 'accent' }),
      text('Double-click to begin writing. Add headings, figures, and tables from the toolbar. Switch to LaTeX for equations and more control.', m, 770, W - m * 2, 125, 18, { lineHeight: 1.65 }),
      text(String(index + 1), W / 2 - 10, H - 55, 20, 20, 11, { align: 'center', colorRole: 'accent' }),
    ];
    if (t.motif === 'spine' || t.motif === 'margin') elements.unshift(shape(24, 52, 4, H - 104));
    if (t.motif === 'frame') elements.unshift(shape(28, 28, W - 56, H - 56, 'paper', { strokeRole: 'accent', strokeWidth: 1 }));
    if (t.motif === 'journal') {
      elements.find(e => e.text === 'Abstract').text = 'ABSTRACT';
      elements.find(e => e.text?.startsWith('Good work')).fontSize = 17;
    }
    if (['horizon', 'band', 'blocks'].includes(t.motif)) elements.unshift(shape(0, 0, W, 22));
    if (t.motif === 'technical') elements.unshift(shape(W - 39, 52, 1, H - 104, 'muted'));
    if(t.motif==='orbit')elements.unshift(shape(W-160,135,80,80,'muted',{radius:40}));
    if(t.motif==='diagonal')elements.unshift(shape(W-45,0,45,320,'muted'),shape(W-45,320,45,100));
    if(t.motif==='grid')elements.unshift(...Array.from({length:8},(_,i)=>shape(25+i*7,100,1,H-200,'muted')));
    if(t.motif==='classic')elements.unshift(shape(m,H-90,W-m*2,1));
    if(t.motif==='editorial')elements.unshift(shape(m,390,35,2,'muted'));
    if(t.motif==='blocks')elements.unshift(shape(W-90,85,24,24,'muted'));
  }
  return { id: uid(), title: layout === 'title' ? (kind === 'beamer' ? 'Opening' : 'Manuscript') : 'A new perspective', elements, notes: '' };
}
export function createProject(kind = 'beamer', templateId = 'atelier') {
  const t = templates.find(t => t.id === templateId) ?? templates[0];
  return { version: 2, id: uid(), kind, ...(kind==='manuscript'?{flow:newFlow()}:{}), title: kind === 'beamer' ? 'Ideas worth sharing' : 'Original thinking', templateId: t.id, palette: { ...palettes[t.palette] }, pages: [createPage(kind, t.id), ...(kind === 'beamer' ? [createPage(kind, t.id, 1, 'content'), createPage(kind, t.id, 2, 'content')] : [])], updatedAt: Date.now(), sourceOverride: null };
}
export function flowingCopy(original){
  const p=createProject('manuscript',original.templateId);
  p.title=`${original.title} — flowing copy`;p.palette={...original.palette};
  p.flow.authors='';p.flow.affiliation='';p.flow.abstract='';
  const content=original.pages.flatMap(page=>[...page.elements].sort((a,b)=>a.y-b.y||a.x-b.x).flatMap(el=>{
    if(el.type==='text'){
      const marks=[...(el.fontWeight>=600?[{type:'bold'}]:[]),...(el.italic?[{type:'italic'}]:[])];
      return el.text.split(/\n\s*\n/).filter(Boolean).map(text=>({type:el.fontSize>=24?'heading':'paragraph',...(el.fontSize>=24?{attrs:{level:el.fontSize>=35?1:2}}:{}),content:[{type:'text',text,marks}]}));
    }
    if(el.type==='image')return [{type:'image',attrs:{src:el.src,alt:el.alt||'',width:Math.min(660,el.w),wrap:'none'}}];
    if(el.type==='table')return [{type:'table',content:el.data.map((row,i)=>({type:'tableRow',content:row.map(text=>({type:i?'tableCell':'tableHeader',content:[{type:'paragraph',content:text?[{type:'text',text}]:[]}]}))}))}];
    if(el.type==='list')return [{type:el.listStyle==='enumerate'?'orderedList':'bulletList',content:el.text.split('\n').filter(Boolean).map(text=>({type:'listItem',content:[{type:'paragraph',content:[{type:'text',text}]}]}))}];
    return [];
  }));
  p.flow.doc={type:'doc',content:content.length?content:[{type:'paragraph'}]};
  return p;
}
export function resolveColor(el, prop, palette) { return el[prop] ?? palette[el[`${prop}Role`]] ?? (prop === 'fill' ? palette.muted : palette.ink); }
export function validateProject(value) {
  if (!value || !['beamer', 'manuscript'].includes(value.kind) || !Array.isArray(value.pages) || !value.pages.length || value.pages.length > 500) throw new Error('This is not a valid TeX Suite project.');
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(value.id ?? '')) throw new Error('Invalid project identifier.');
  if(typeof value.title!=='string'||value.title.length>1000||!Number.isFinite(value.updatedAt))throw new Error('Invalid project metadata.');
  if(!value.palette||!['accent','ink','paper','muted'].every(k=>/^#[a-fA-F0-9]{6}$/.test(value.palette[k]??'')))throw new Error('Invalid project palette.');
  if(value.sourceOverride!=null&&(typeof value.sourceOverride!=='string'||value.sourceOverride.length>2_000_000))throw new Error('Invalid custom source.');
  if (JSON.stringify(value).length > 70_000_000) throw new Error('This project is too large (70 MB limit).');
  if(value.flow)validateFlow(value.flow);
  for (const p of value.pages) {
    if(!/^[a-zA-Z0-9-]{1,100}$/.test(p.id??''))throw new Error('Invalid page identifier.');
    if (!Array.isArray(p.elements) || p.elements.length > 1000) throw new Error('Invalid page elements.');
    for (const el of p.elements) {
      if(!/^[a-zA-Z0-9-]{1,100}$/.test(el.id??''))throw new Error('Invalid element identifier.');
      if (!['text','rect','image','table','list'].includes(el.type) || !['x','y','w','h'].every(k => Number.isFinite(el[k])) || el.w <= 0 || el.h <= 0) throw new Error('Invalid element geometry.');
      if(el.type==='text'&&(typeof el.text!=='string'||el.text.length>100000))throw new Error('Invalid text element.');
      if(el.type==='list'&&(typeof el.text!=='string'||el.text.length>100000||!['itemize','enumerate'].includes(el.listStyle)))throw new Error('Invalid list element.');
      if(el.type==='table'&&(!Array.isArray(el.data)||!el.data.length||el.data.length>100||el.data.some(r=>!Array.isArray(r)||!r.length||r.length>20||r.some(c=>typeof c!=='string'))))throw new Error('Invalid table.');
      if(el.fontSize!=null&&(!Number.isFinite(el.fontSize)||el.fontSize<1||el.fontSize>500))throw new Error('Invalid font size.');
      if(el.lineHeight!=null&&(!Number.isFinite(el.lineHeight)||el.lineHeight<=0||el.lineHeight>5))throw new Error('Invalid line height.');
      if (el.type === 'image' && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(el.src ?? '')) throw new Error('Images must be embedded PNG or JPEG files.');
    }
  }
  return value;
}
export function snapRect(rect, others, d, { enabled = true, allowOutside = false, threshold = 8 } = {}) {
  let { x, y, w, h } = rect;
  const attemptedOutside = x < d.margin || y < d.margin || x + w > d.width - d.margin || y + h > d.height - d.margin;
  const guides = [];
  if (enabled) {
    for (const axis of ['x', 'y']) {
      const size = axis === 'x' ? w : h, limit = axis === 'x' ? d.width : d.height;
      const targets = [d.margin, limit / 2, limit - d.margin, ...others.flatMap(e => [e[axis], e[axis] + e[axis === 'x' ? 'w' : 'h'] / 2, e[axis] + e[axis === 'x' ? 'w' : 'h']])];
      let best = threshold + 1, delta = 0, target = null;
      for (const offset of [0, size / 2, size]) for (const t of targets) {
        const diff = t - ((axis === 'x' ? x : y) + offset);
        if (Math.abs(diff) < best) { best = Math.abs(diff); delta = diff; target = t; }
      }
      if (best <= threshold) { if (axis === 'x') x += delta; else y += delta; guides.push({ axis, value: target }); }
    }
  }
  if (!allowOutside) {
    x = Math.max(d.margin, Math.min(x, Math.max(d.margin, d.width - d.margin - w)));
    y = Math.max(d.margin, Math.min(y, Math.max(d.margin, d.height - d.margin - h)));
  }
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, guides, attemptedOutside };
}
export function addElement(type, kind, palette) {
  const d = dimensions(kind);
  if (type === 'text') return text('Your idea goes here', d.margin + 48, d.margin + 100, 350, 64, 26);
  if (type === 'heading') return text('A fresh perspective', d.margin + 48, d.margin + 100, 500, 80, 38, { fontFamily: 'serif', colorRole: 'accent' });
  if (type === 'table') return { id: uid(), type, x: d.margin + 48, y: d.margin + 140, w: 420, h: 160, data: [['Category', 'Value', 'Notes'], ['First', '42', 'Your finding'], ['Second', '68', 'Your finding']], fontSize: 16 };
  if (type === 'list') return { id: uid(), type, x: kind === 'beamer' ? 560 : d.margin + 48, y: kind === 'beamer' ? 405 : d.margin + 140, w: kind === 'beamer' ? 350 : 600, h: kind === 'beamer' ? 80 : 180, text: 'First point\nSecond point', listStyle: 'itemize', fontSize: 18, lineHeight: 1.4 };
  return shape(d.margin + 70, d.margin + 90, 220, 120, 'muted', { radius: 12 });
}

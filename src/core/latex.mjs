import {flowToLatex,flowAssets} from './flow.mjs';
import { dimensions, resolveColor, validateProject } from './model.mjs';
export function escapeTex(s) {
  return String(s ?? '').replace(/[\\{}$&#%_^~]/g, c => ({ '\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}' }[c]));
}
const hex = c => /^#[a-fA-F0-9]{6}$/.test(c ?? '') ? c.slice(1) : '243831';
const num = n => Number(n.toFixed(3));
export function projectToLatex(project) {
  validateProject(project);
  if(project.flow)return flowToLatex(project);
  const { width: W, height: H } = dimensions(project.kind);
  const beamer = project.kind === 'beamer';
  const mmPerUnit = beamer ? 160 / W : 210 / W;
  const ptPerUnit = mmPerUnit * 72.27 / 25.4;
  let colorIndex = 0;
  const colors = [];
  const color = c => { const name = `tscolor${colorIndex++}`; colors.push(`\\definecolor{${name}}{HTML}{${hex(c)}}`); return name; };
  const paperColor = color(project.palette.paper);
  const accentColor = color(project.palette.accent);
  const frames = project.pages.map((p, pageIndex) => {
    const objects = p.elements.map(el => {
      const x = num(el.x * mmPerUnit), y = num(el.y * mmPerUnit), w = num(el.w * mmPerUnit), h = num(el.h * mmPerUnit);
      if (el.type === 'rect') {
        const fill = color(resolveColor(el, 'fill', project.palette));
        const stroke = el.strokeRole ? `draw=${color(project.palette[el.strokeRole])},line width=${el.strokeWidth ?? 1}pt,` : '';
        return `\\path[${stroke}fill=${fill},rounded corners=${num((el.radius ?? 0) * mmPerUnit)}mm] (${x},${y}) rectangle (${num(x+w)},${num(y+h)});`;
      }
      if (el.type === 'image') return `\\node[anchor=north west,inner sep=0pt] at (${x},${y}) {\\includegraphics[width=${w}mm,height=${h}mm]{assets/${el.id.replace(/[^a-zA-Z0-9-]/g, '')}.${el.src.startsWith('data:image/jpeg')?'jpg':'png'}}};`;
      const fs = num(Math.max(4, (el.fontSize ?? 16) * ptPerUnit));
      const leading = num(fs * (el.lineHeight ?? 1.25));
      const align = ({ left:'left',center:'center',right:'right' })[el.align] ?? 'left';
      const font = `\\${el.fontFamily === 'serif' ? 'rmfamily' : 'sffamily'}\\fontsize{${fs}}{${leading}}\\selectfont${el.fontWeight >= 600 ? '\\bfseries' : '\\mdseries'}${el.italic ? '\\itshape' : ''}${align==='left'?'\\raggedright':align==='right'?'\\raggedleft':'\\centering'}`;
      let contents = String(el.text??'').split(/\n\s*\n/).map(p=>escapeTex(p).replace(/\n/g,'\\\\')).join(`\\par\\vspace{${leading}pt}\\noindent `);
      if (el.type === 'table') {
        const rows = el.data ?? [['Column','Value'],['Row','Value']];
        const columns = Math.max(...rows.map(r=>r.length));
        contents = `\\renewcommand{\\arraystretch}{1.4}\\setlength{\\tabcolsep}{3pt}\\begin{tabular}{${Array(columns).fill(`p{${num(Math.max(1,w / columns - 2.2))}mm}`).join('')}}\\hline\n${rows.map(row=>Array.from({length:columns},(_,i)=>escapeTex(row[i]??'')).join(' & ')).join('\\\\\\hline\n')}\\\\\\hline\\end{tabular}`;
      }
      if (el.type === 'list') {
        const env = el.listStyle === 'enumerate' ? 'enumerate' : 'itemize';
        const items = el.text.split('\n').map(item => item.trim()).filter(Boolean);
        contents = `\\begin{${env}}\n${items.map(item => `\\item ${escapeTex(item)}`).join('\n')}\n\\end{${env}}`;
      }
      return `\\node[anchor=north west,inner sep=0pt,outer sep=0pt,text width=${w}mm,align=${align},text=${color(resolveColor(el,'color',project.palette))},font={${font}}] at (${x},${y}) {${contents}};`;
    }).join('\n');
    return `${beamer ? '\\begin{frame}[plain]' : (pageIndex ? '\\newpage' : '')}
\\begin{tikzpicture}[remember picture,overlay]
\\begin{scope}[shift={(current page.north west)},x=1mm,y=-1mm]
\\fill[${paperColor}] (0,0) rectangle (${num(W*mmPerUnit)},${num(H*mmPerUnit)});
${objects}
\\end{scope}
\\end{tikzpicture}
${beamer ? '\\end{frame}' : '\\null'}`;
  }).join('\n\n');
  return `% Created with TeX Suite · ${escapeTex(project.title)}
% Layout is editable in TeX Suite. This file also compiles independently with XeLaTeX.
${beamer ? '\\documentclass[aspectratio=169]{beamer}' : '\\documentclass{article}\n\\usepackage[a4paper,margin=0mm]{geometry}'}
\\usepackage{fontspec}
\\setmainfont{TeX Gyre Pagella}
\\setsansfont{TeX Gyre Heros}
\\usepackage{tikz}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\pagestyle{empty}
\\hyphenpenalty=10000
\\exhyphenpenalty=10000
${beamer ? '\\setbeamertemplate{navigation symbols}{}' : ''}
${colors.join('\n')}
${beamer ? `\\setbeamercolor{itemize item}{fg=${accentColor}}\\setbeamercolor{enumerate item}{fg=${accentColor}}` : `\\renewcommand{\\labelitemi}{\\textcolor{${accentColor}}{\\textbullet}}`}
\\begin{document}
${frames}
\\end{document}
`;
}
export function extractAssets(project) {
  if(project.flow)return flowAssets(project.flow.doc);
  return project.pages.flatMap(p=>p.elements.filter(e=>e.type==='image').map(e=>({ name: `${e.id.replace(/[^a-zA-Z0-9-]/g,'')}.${e.src.startsWith('data:image/jpeg')?'jpg':'png'}`, data: e.src.split(',')[1] })));
}

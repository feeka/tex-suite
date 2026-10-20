// Native classes are supplied by the user's TeX distribution, not imitations.
export const publishers = [
  {id:'article',name:'Classic manuscript',publisher:'TeX Suite',className:'article',options:'11pt',description:'A clean, single-column manuscript.',url:'https://www.latex-project.org/'},
  {id:'springer',name:'Springer Nature article',publisher:'Springer Nature',className:'sn-jnl',options:'pdflatex,sn-mathphys-num',description:'Official authoring class, downloaded from Springer Nature on first use.',url:'https://www.springernature.com/in/authors/campaigns/latex-author-support'},
  {id:'nature',name:'Nature portfolio',publisher:'Springer Nature',className:'sn-jnl',options:'pdflatex,sn-nature',description:'Nature reference-style variant of the official authoring class.',url:'https://www.springernature.com/in/authors/campaigns/latex-author-support'},
  {id:'wiley',name:'Wiley journal',publisher:'Wiley',className:'USG',options:'ASNA,twocolumn',description:'Official Wiley optimal-design authoring class, downloaded on first use.',url:'https://authors.wiley.com/author-resources/Journal-Authors/Prepare/latex-template.html'},
  {id:'ieee',name:'IEEE journal',publisher:'IEEE',className:'IEEEtran',options:'journal',description:'Two-column transactions and journals.',url:'https://ctan.org/pkg/ieeetran'},
  {id:'ieee-conference',name:'IEEE conference',publisher:'IEEE',className:'IEEEtran',options:'conference',description:'Conference proceedings with IEEE typography.',url:'https://ctan.org/pkg/ieeetran'},
  {id:'elsevier',name:'Elsevier preprint',publisher:'Elsevier',className:'elsarticle',options:'preprint,12pt',description:'Front matter, abstract and keywords in elsarticle.',url:'https://ctan.org/pkg/elsarticle'},
  {id:'elsevier-review',name:'Elsevier review',publisher:'Elsevier',className:'elsarticle',options:'review,12pt',description:'Double-spaced submission manuscript.',url:'https://ctan.org/pkg/elsarticle'},
  {id:'elsevier-final',name:'Elsevier two-column',publisher:'Elsevier',className:'elsarticle',options:'final,5p,times,twocolumn',description:'Five-page model in two columns.',url:'https://ctan.org/pkg/elsarticle'},
  {id:'acm',name:'ACM proceedings',publisher:'ACM',className:'acmart',options:'sigconf,nonacm',description:'SIG conference layout without invented publication metadata.',url:'https://ctan.org/pkg/acmart'},
  {id:'acm-review',name:'ACM review manuscript',publisher:'ACM',className:'acmart',options:'manuscript,review,nonacm',description:'Single-column review format.',url:'https://ctan.org/pkg/acmart'},
  {id:'aps',name:'Physical Review Letters',publisher:'APS',className:'revtex4-2',options:'aps,prl,reprint',description:'Publisher REVTeX class with the PRL journal option.',url:'https://ctan.org/pkg/revtex'},
  {id:'physical-review-a',name:'Physical Review A',publisher:'APS',className:'revtex4-2',options:'aps,pra,reprint',description:'Publisher REVTeX class with the PRA journal option.',url:'https://ctan.org/pkg/revtex'},
  {id:'physical-review-b',name:'Physical Review B',publisher:'APS',className:'revtex4-2',options:'aps,prb,reprint',description:'Publisher REVTeX class with the PRB journal option.',url:'https://ctan.org/pkg/revtex'},
  {id:'aip',name:'The Journal of Chemical Physics',publisher:'AIP',className:'revtex4-2',options:'aip,jcp,reprint',description:'Publisher REVTeX class with the JCP journal option.',url:'https://ctan.org/pkg/revtex'},
  {id:'acs',name:'ACS achemso (legacy)',publisher:'ACS — legacy',className:'achemso',options:'journal=jacsat,manuscript=article',description:'Legacy class retained for existing documents; consult current ACS submission guidance.',url:'https://ctan.org/pkg/achemso'},
  {id:'ams',name:'AMS article',publisher:'AMS',className:'amsart',options:'11pt',description:'Mathematics journal article with AMS structure.',url:'https://ctan.org/pkg/amscls'},
  {id:'mnras',name:'MNRAS',publisher:'Royal Astronomical Society',className:'mnras',options:'',description:'Monthly Notices astronomy paper.',url:'https://ctan.org/pkg/mnras'},
  {id:'oup',name:'Oxford journal',publisher:'Oxford University Press',className:'oup-authoring-template',options:'unnumsec,webpdf,contemporary,large',description:'Contemporary OUP journal authoring format.',url:'https://ctan.org/pkg/oup-authoring-template'},
  {id:'bioinformatics',name:'Bioinformatics',publisher:'Oxford University Press',className:'oup-authoring-template',options:'unnumsec,webpdf,contemporary,large',description:'OUP authoring template recommended by the journal; shared publisher class.',url:'https://academic.oup.com/bioinformatics/pages/author-guidelines'},
  {id:'briefings-bioinformatics',name:'Briefings in Bioinformatics',publisher:'Oxford University Press',className:'oup-authoring-template',options:'unnumsec,webpdf,contemporary,large',description:'OUP authoring template linked by the journal; shared publisher class.',url:'https://academic.oup.com/bib/pages/msprep_submission'},
];
export const universities = [
  {id:'tudarmstadt',name:'TU Darmstadt',label:'University corporate design',description:'TUDa corporate Beamer class. Logos omitted; institution branding rules still apply.',url:'https://ctan.org/pkg/tuda-ci',source:String.raw`% Compile with LuaLaTeX.
\documentclass[english,aspectratio=169,accentcolor=9c,logo=false,accept-missing-logos=true]{tudabeamer}
\usepackage[english]{babel}
\title{Ideas worth sharing}
\subtitle{A research presentation}
\author{Your name}
\institute{Your institute}
\date{\today}
\begin{document}
\maketitle
\begin{frame}{A clear research question}
\begin{itemize}
\item Introduce the problem and why it matters.
\pause
\item Explain your approach.
\pause
\item Share your main finding.
\end{itemize}
\end{frame}
\begin{frame}{Results}
\begin{block}{The main contribution}
Replace this with your result.
\end{block}
\end{frame}
\end{document}`},
  {id:'saintpetersburg',name:'Saint Petersburg',label:'Community-maintained theme',description:'SaintPetersburg Beamer theme, without university logos. Editable LaTeX and PDF preview.',url:'https://ctan.org/pkg/beamertheme-saintpetersburg',source:String.raw`% Compile with pdfLaTeX.
\documentclass[aspectratio=169]{beamer}
\usetheme[nologo]{SaintPetersburg}
\usepackage[english]{babel}
\title{Ideas worth sharing}
\subtitle{A research presentation}
\author{Your name}
\institute{Your institute}
\date{\today}
\begin{document}
\begin{frame}\titlepage\end{frame}
\section{Introduction}
\begin{frame}{A clear research question}
\begin{itemize}
\item Introduce the problem and why it matters.
\pause
\item Explain your approach.
\pause
\item Share your main finding.
\end{itemize}
\end{frame}
\section{Results}
\begin{frame}{Results}
\begin{block}{The main contribution}Replace this with your result.\end{block}
\end{frame}
\end{document}`},
];
export const publisherById=id=>publishers.find(p=>p.id===id)||publishers[0];

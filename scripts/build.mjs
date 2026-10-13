import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import YAML from 'yaml';
import {loadJournal,journalDirectory,journalArticle,journalUrl,extractJournalImages} from './journal.mjs';
import {loadTravel,travelPage} from './travel.mjs';
import {wanderPage,wanderData} from './play.mjs';
import {labPage,gamePage} from './games.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const site = JSON.parse(await fs.readFile(path.join(root, 'content/site.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const langs = ['zh','en'];
const md = new MarkdownIt({html:false, linkify:true, typographer:true}).use(texmath, {engine:katex, delimiters:'dollars', katexOptions:{throwOnError:true, trust:false}});
const notes = [];
const journal = await loadJournal(root);
const travel = await loadTravel(root);
for (const entry of await fs.readdir(path.join(root, 'content/notes'), {withFileTypes:true})) {
  if (!entry.isDirectory()) continue;
  const slug=entry.name;
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Invalid article folder: ${slug}`);
  for (const lang of langs) {
    const source = path.join(root, 'content/notes', slug, `${lang}.md`);
    let raw;
    try {raw = await fs.readFile(source, 'utf8');} catch (e) {if (e.code === 'ENOENT') continue; throw e;}
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) throw new Error(`Missing front matter: ${source}`);
    const data = YAML.parse(match[1]);
    if (data.draft === true) continue;
    if (!data.title || !data.description || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.date)) || !Array.isArray(data.tags)) throw new Error(`Invalid metadata: ${source}`);
    if (data.pdf && (!/^\/lectures\/[a-zA-Z0-9_./-]+\.pdf$/.test(data.pdf) || data.pdf.includes('..'))) throw new Error(`Invalid PDF path: ${source}`);
    if (data.pdf) await fs.access(path.join(root, 'public', data.pdf));
    let body = match[2];
    const chapterTitles = new Map();
    let chapterCount = 0;
    if (data.chapters === true) {
      const chapterDir = path.join(root, 'content/notes', slug, 'chapters');
      const files = (await fs.readdir(chapterDir)).filter(f=>/^\d{2}-.+\.md$/.test(f)).sort();
      if (!files.length) throw new Error(`No chapters: ${source}`);
      const chapterLinks = new Map(files.map(f=>[f, f.startsWith('00-')?'overview':`chapter-${f.slice(0,2)}`]));
      for (const file of files) {
        const content = await fs.readFile(path.join(chapterDir,file),'utf8');
        const title = content.match(/^# (.+)$/m)?.[1];
        if (!title) throw new Error(`Missing chapter title: ${file}`);
        const id = chapterLinks.get(file);
        chapterTitles.set(title,id);
        if (id !== 'overview') chapterCount++;
        const transformed = content.replace(/^(#{1,5}) /gm,'#$1 ').replace(/\]\(([^)]+\.md)\)/g,(link,target)=>chapterLinks.has(target)?`](#${chapterLinks.get(target)})`:link);
        body += '\n\n'+transformed;
      }
    }
    // Chinese punctuation before a bold delimiter needs a following boundary.
    const renderBody=body.replace(/\*\*([^*\n]+[：:])\*\*(?=\S)/g,'**$1** ');
    const tokens = md.parse(renderBody, {});
    const headings = []; let n=0, chapterId='', chapterSection=0;
    for (let i=0;i<tokens.length;i++) {
      if (tokens[i].type === 'heading_open') {
        let id=`section-${++n}`;
        if (chapterTitles.has(tokens[i+1].content)) {
          id=chapterTitles.get(tokens[i+1].content); chapterId=id; chapterSection=0;
        } else if (chapterId) id=`${chapterId}-section-${++chapterSection}`;
        tokens[i].attrSet('id', id); tokens[i].attrSet('tabindex','-1');
        if (chapterTitles.has(tokens[i+1].content)) tokens[i].attrSet('class','chapter-heading');
        headings.push({id,text:tokens[i+1].content,level:tokens[i].tag});
      }
    }
    const html = md.renderer.render(tokens,md.options,{});
    const contentLang = data.contentLang || lang;
    const count = contentLang === 'zh' ? (body.match(/[\u3400-\u9fff]/g)||[]).length : body.split(/\s+/).length;
    notes.push({...data,slug,lang,entryCount:data.collection==='journal'?journal.length:0,raw:match[0].slice(0,match[0].length-match[2].length)+body,body,html,headings,chapterCount,minutes:Math.max(1,Math.ceil(count/(contentLang==='zh'?350:200))),url:`/${lang}/notes/${slug}/`});
  }
}
notes.sort((a,b)=>String(b.date).localeCompare(String(a.date)) || a.slug.localeCompare(b.slug));
// Only remove generated output, never source files.
if (dist !== path.join(root,'dist')) throw new Error('Unexpected output directory');
await fs.rm(dist,{recursive:true,force:true});
await fs.mkdir(dist,{recursive:true});
await fs.cp(path.join(root,'public'), dist,{recursive:true,filter:source=>source!==path.join(root,'public','journal')});
await extractJournalImages(root,dist);
await fs.cp(path.join(root,'node_modules/katex/dist'),path.join(dist,'assets/katex'),{recursive:true});
const put=async(p,content)=>{const dest=path.join(dist,p); await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,content);};
const arrow='<span aria-hidden="true">↗</span>';
await put('travel/data.json',JSON.stringify(travel));
await put('travel/footprints.txt',await fs.readFile(path.join(root,'content/travel/footprints.txt'),'utf8'));
const languagePath=(lang,route)=>`/${lang}/${route ? route+'/' : ''}`;
function lectureSearch(lang) {
  const zh=lang==='zh';
  return `<section class="shell lecture-search" hidden aria-label="${zh?'讲义全文搜索':'Search lecture text'}"><form class="lecture-search-form" role="search"><label for="lecture-query">${zh?'搜索讲义':'Search these notes'}</label><div class="lecture-search-input"><input id="lecture-query" type="search" maxlength="100" autocomplete="off" placeholder="${zh?'输入关键词，如：记忆、条件作用':'Search keywords in the lecture text'}" aria-controls="lecture-results"><button type="button" id="lecture-clear">${zh?'清除':'Clear'}</button></div><div class="lecture-search-tools"><output id="lecture-search-status" aria-live="polite">${zh?'搜索全部章节':'Search all chapters'}</output><button type="button" id="lecture-prev" disabled aria-label="${zh?'上一个匹配':'Previous match'}">↑</button><button type="button" id="lecture-next" disabled aria-label="${zh?'下一个匹配':'Next match'}">↓</button></div></form><div id="lecture-results" hidden><div class="lecture-result-list"></div><button type="button" id="lecture-more" hidden>${zh?'显示更多结果':'Show more results'}</button></div></section>`;
}
function renderToc(note,lang) {
  const groups=[];
  for(const heading of note.headings.filter(h=>h.level==='h2'||h.level==='h3')) {
    if(heading.level==='h2'||!groups.length) groups.push({...heading,children:[]});
    else groups.at(-1).children.push(heading);
  }
  const link=h=>`<a href="#${h.id}">${esc(h.text)}</a>`;
  return `<details class="toc-panel" open><summary class="toc-title">${site.languages[lang].toc}<span class="mono">${note.chapterCount?`${note.chapterCount} ${lang==='zh'?'章':'chapters'}`:''}</span></summary><nav class="toc-scroll" aria-label="${lang==='zh'?'章节与小节':'Chapters and sections'}">${groups.map(group=>group.children.length?`<details class="toc-group"><summary>${link(group)}</summary><div class="toc-sections">${group.children.map(link).join('')}</div></details>`:link(group)).join('')}</nav></details>`;
}
function layout(lang,route,body,opts={}) {
  const t=site.languages[lang], other=lang==='zh'?'en':'zh';
  const routes=['','notes','archive','about','travel','lab'];
  const navLabels=[...t.nav,lang==='zh'?'实验室':'Lab'];
  const current=languagePath(lang,route), counterpart=opts.counterpart ?? languagePath(other,route);
  const title=opts.title ? `${opts.title} · talenttao` : t.title;
  return `<!doctype html><html lang="${t.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(opts.description||t.description)}"><meta name="color-scheme" content="light dark"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="canonical" href="${site.origin+current}"><link rel="alternate" hreflang="${t.lang}" href="${site.origin+current}">${opts.missing?'':`<link rel="alternate" hreflang="${site.languages[other].lang}" href="${site.origin+counterpart}">`}<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(opts.description||t.description)}"><meta property="og:type" content="${opts.article?'article':'website'}"><meta property="og:url" content="${site.origin+current}"><meta property="og:image" content="${site.origin}/assets/social.svg"><link rel="alternate" type="application/rss+xml" title="${esc(t.rss)}" href="/${lang}/feed.xml"><link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/sculpture.css"><link rel="stylesheet" href="/assets/lectures.css">${opts.article?'<link rel="stylesheet" href="/assets/katex/katex.min.css">':''}<script>try{document.documentElement.dataset.theme=localStorage.getItem('talenttao-theme')||'light'}catch{}</script><script src="/assets/app.js" defer></script><script src="/assets/lectures.js" defer></script>${opts.orbit?'<link rel="stylesheet" href="/assets/orbit.css"><script type="module" src="/assets/orbit.js"></script>':''}${opts.games?'<script type="module" src="/assets/games.js"></script>':''}${opts.play?'<link rel="stylesheet" href="/assets/play.css"><script type="module" src="/assets/play.js"></script>':''}${opts.travel?'<link rel="stylesheet" href="/assets/travel.css"><script type="module" src="/assets/travel.js"></script>':''}${opts.article && !opts.journal?'<link rel="stylesheet" href="/assets/lecture-search.css"><script src="/assets/lecture-search.js" defer></script>':''}${opts.journal?'<link rel="stylesheet" href="/assets/journal.css"><script src="/assets/journal.js" defer></script>':''}</head><body data-lang="${lang}"><a class="skip" href="#main">${t.skip}</a><header class="header"><a class="brand" href="/${lang}/" aria-label="talenttao"><span class="brand-mark" aria-hidden="true">✳</span>talenttao<span class="brand-dot">.</span></a><button class="menu-toggle" aria-label="${t.menu}" aria-expanded="false" aria-controls="navigation">☰</button><nav id="navigation" aria-label="${lang==='zh'?'主导航':'Main navigation'}">${routes.map((r,i)=>`<a href="${languagePath(lang,r)}" ${route.split('/')[0]===r?'aria-current="page"':''}>${navLabels[i]}</a>`).join('')}</nav><div class="header-tools"><a class="language" href="${counterpart}" lang="${other}" aria-label="${t.language}" ${opts.missing?`title="${t.translationMissing}"`:''}>${other==='en'?'EN':'中文'} <span aria-hidden="true">↗</span></a><span class="tool-divider"></span><button class="theme-toggle" aria-label="${t.theme}" title="${t.theme}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 5a7 7 0 0 1 0 14Z" fill="currentColor"/></svg></button></div></header><main id="main">${body}</main><footer class="footer"><a class="brand" href="/${lang}/">talenttao.</a><p>${t.footer}</p><div><a href="${site.github}" target="_blank" rel="noopener noreferrer">GitHub ${arrow}</a><a href="/${lang}/feed.xml">RSS ${arrow}</a><span>© 2026</span></div></footer></body></html>`;
}
function rows(lang,list) {const t=site.languages[lang];return list.map((note,i)=>`<a class="note-row" href="${note.url}" data-note data-search="${esc((note.title+' '+note.description+' '+note.tags.join(' ')).toLocaleLowerCase())}" data-tags="${esc(JSON.stringify(note.tags))}"><span class="note-number">${String(i+1).padStart(2,'0')}</span><div class="note-copy"><div class="note-meta"><time datetime="${note.date}">${note.date.replaceAll('-','.')}</time>${note.demo?`<span class="demo-badge">${t.demo}</span>`:''}</div><h3>${esc(note.title)}</h3><p>${esc(note.description)}</p><div class="note-tags">${note.tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></div><span class="note-read">${note.entryCount ? `${note.entryCount} ${lang==='zh'?'篇' : 'essays'}` : note.chapterCount ? `${note.chapterCount} ${lang==='zh'?'章':'chapters'}` : `${note.minutes} ${t.minutes}`}<span class="row-arrow" aria-hidden="true">↗</span></span></a>`).join('');}
function field(lang){const t=site.languages[lang];return `<div class="sculpture-panel"><div class="sculpture-top mono"><span>FORM / <span id="form-id">001</span></span><span>GENERATIVE OBJECT</span></div><div class="sculpture-stage"><canvas id="sculpture" tabindex="0" role="img" aria-label="${t.fieldLabel}">${t.fieldFallback}</canvas><div class="sculpture-corner mono">X / Y / Z</div><div class="sculpture-hint">${t.fieldHint}</div></div><div class="sculpture-bottom"><div class="sculpture-heading"><h2>${t.fieldTitle}</h2><button id="save-form" aria-label="${t.save}" title="${t.save}">↓ PNG</button></div><form id="seed-form"><label class="sr-only" for="seed-word">${t.seedLabel}</label><input id="seed-word" value="talenttao" maxlength="48" placeholder="${t.seedPlaceholder}" autocomplete="off" spellcheck="false"><button type="submit">${t.generate} ↗</button></form><div class="sculpture-controls"><div class="form-tabs" role="group" aria-label="${lang==='zh'?'形态':'Form'}">${t.formNames.map((name,i)=>`<button type="button" data-form="${i}" aria-pressed="${i===0}">${name}</button>`).join('')}</div><label for="morph">${t.morph}</label><input id="morph" type="range" min="0" max="100" value="35"><button id="pause" aria-label="${t.pause}" aria-pressed="false">Ⅱ</button><button id="reset" aria-label="${t.reset}" title="${t.reset}">↺</button></div><span id="form-message" role="status" class="sr-only"></span></div></div>`;}
const generated=[];
for(const lang of langs){
  const t=site.languages[lang], list=notes.filter(n=>n.lang===lang);
  const home=`<section class="hero shell hero-v2"><div class="hero-copy"><div class="eyebrow mono">${t.eyebrow}</div><h1>${t.hero}</h1><p class="hero-intro">${t.intro}</p><div class="hero-actions"><a class="button" href="/${lang}/notes/">${t.explore}${arrow}</a><a class="text-link" href="/${lang}/travel/">${lang==='zh'?'足迹地图':'Footprints'} ${arrow}</a></div><div class="play-home-links"><a href="/${lang}/wander/">${lang==='zh'?'随便逛逛':'Wander a little'} ↝</a><a href="/${lang}/lab/">${lang==='zh'?'小型实验室':'Small laboratory'} ↗</a></div><a class="hero-index mono" href="/${lang}/archive/">02 / ${t.nav[2]} →</a></div>${field(lang)}</section><section class="shell section recent-section"><div class="section-heading"><div><span class="eyebrow mono">01 / ${lang==='zh'?'NOTES':'NOTES'}</span><h2>${t.notesTitle}</h2></div><a class="text-link" href="/${lang}/notes/">${t.allNotes}${arrow}</a></div><div class="note-list">${list.length?rows(lang,list.slice(0,3)):`<p class="quiet-empty">${t.emptyNotes}</p>`}</div></section>`;
  await put(`play/wander-${lang}.json`,JSON.stringify(wanderData(journal,notes,lang)));
  for(const [route,body,title] of [['lab',labPage(lang),lang==='zh'?'小型实验室':'Small laboratory'],['lab/orbit',gamePage(lang,'orbit'),lang==='zh'?'轨道捕手':'Orbit catcher'],['lab/shadow',gamePage(lang,'shadow'),lang==='zh'?'影子拼图':'Shadow puzzle'],['wander',wanderPage(lang),lang==='zh'?'随便逛逛':'Wander a little']]){
    await put(`${lang}/${route}/index.html`,layout(lang,route,body,{play:true,title,games:route==='lab/shadow',orbit:route==='lab/orbit'}));generated.push(`/${lang}/${route}/`);
  }
  const tags=[...new Set(list.flatMap(n=>n.tags))];
  const notePage=`<section class="shell page-head"><span class="eyebrow mono">01 / NOTES</span><h1>${t.notesTitle}</h1><p>${t.notesIntro}</p></section><section class="shell notes-page">${list.length?`<div class="search-box"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="${t.search}" aria-label="${t.search}" autocomplete="off"></div><div class="filters" role="group" aria-label="${lang==='zh'?'按标签筛选':'Filter by tag'}"><button class="active" data-filter="" aria-pressed="true">${t.all}</button>${tags.map(tag=>`<button data-filter="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`).join('')}<span id="result-count" aria-live="polite">${list.length} ${t.results}</span></div><div class="note-list">${rows(lang,list)}</div><p id="no-results" class="empty" hidden>${t.noResults}</p>`:`<div class="quiet-empty">${t.emptyNotes}</div>`}</section>`;
  const archive=`<section class="shell page-head"><span class="eyebrow mono">02 / ARCHIVE</span><h1>${t.archiveTitle}</h1><p>${t.archiveIntro}</p></section><section class="shell archive-page">${list.length?`<div class="archive-list">${list.map(note=>`<div class="archive-row"><time datetime="${note.date}" class="mono">${note.date}</time><a href="${note.url}">${esc(note.title)} ↗</a>${note.pdf?`<a class="mono" href="${esc(note.pdf)}" download>PDF ↓</a>`:''}</div>`).join('')}</div>`:`<p class="quiet-empty">${t.archiveEmpty}</p>`}</section>`;
  const about=`<section class="shell page-head"><span class="eyebrow mono">03 / ABOUT</span><h1>${t.aboutTitle}</h1></section><section class="shell about-simple"><h2>talenttao.</h2><p>${t.aboutBody}</p><a class="text-link" href="${site.github}" target="_blank" rel="noopener noreferrer">${t.githubLabel}${arrow}</a></section>`;
  for(const [route,body] of [['',home],['notes',notePage],['archive',archive],['about',about],['travel',travelPage(lang,travel)]]){const url=languagePath(lang,route);await put(url+'index.html',layout(lang,route,body,{play:route==='',travel:route==='travel',title:route==='travel'?(lang==='zh'?'足迹':'Footprints'):undefined}));generated.push(url);}
  for(const note of list){
    if(note.collection==='journal'){
      await put(note.url+'index.html',layout(lang,'notes/journal',journalDirectory(journal,lang),{title:note.title,description:note.description,journal:true}));
      generated.push(note.url);
      for(let index=0;index<journal.length;index++){
        const entry=journal[index],url=journalUrl(lang,entry);
        await put(url+'index.html',layout(lang,`notes/journal/${entry.slug}`,journalArticle(journal,index,lang,renderToc(entry,lang)),{title:entry.title,description:`${entry.title} · ${entry.date}`,article:true,journal:true,counterpart:journalUrl(lang==='zh'?'en':'zh',entry)}));
        generated.push(url);
      }
      continue;
    }
    const counterpart=notes.find(n=>n.slug===note.slug && n.lang!==lang);
    const toc=renderToc(note,lang);
    const body=`<section class="shell article-head"><a class="text-link back" href="/${lang}/notes/">← ${t.backNotes}</a><div class="note-meta"><time datetime="${note.date}">${note.date.replaceAll('-','.')}</time><span>${note.minutes} ${t.minutes}</span>${note.demo?`<span class="demo-badge">${t.demo}</span>`:''}</div><h1>${esc(note.title)}</h1><p>${esc(note.description)}</p><div class="note-tags">${note.tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></section>${note.chapterCount?lectureSearch(lang):''}<div class="shell article-layout"><article class="prose"${note.contentLang==='zh'?' lang="zh-CN"':''}>${note.demo?`<aside class="demo-notice">${t.demoNotice}</aside>`:''}${note.contentLang && note.contentLang!==lang?`<p class="language-notice">${lang==='en'?'These lecture notes are in Chinese. An English translation is not available yet.':'讲义正文为英文。'}</p>`:''}${note.html}<div class="article-download"><a href="${note.url}${lang}.md" download>${t.download} ↓</a>${note.pdf?`<a href="${esc(note.pdf)}" download>${t.pdf} ↓</a>`:''}</div></article><aside class="toc">${toc}${counterpart?'':`<p class="missing-translation">${t.translationMissing}</p>`}</aside></div>`;
    await put(note.url+'index.html',layout(lang,`notes/${note.slug}`,body,{title:note.title,description:note.description,article:true,counterpart:counterpart?.url||`/${lang==='zh'?'en':'zh'}/notes/`,missing:!counterpart}));
    await put(note.url+`${lang}.md`,note.raw);generated.push(note.url);
  }
  const rss=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(t.title)}</title><link>${site.origin}/${lang}/notes/</link><description>${esc(t.description)}</description><language>${t.lang}</language>${list.map(n=>`<item><title>${esc(n.title)}</title><link>${site.origin+n.url}</link><guid>${site.origin+n.url}</guid><pubDate>${new Date(n.date+'T00:00:00+08:00').toUTCString()}</pubDate><description>${esc(n.description)}</description></item>`).join('')}</channel></rss>`;
  await put(`${lang}/feed.xml`,rss);
}
await put('index.html',`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>talenttao</title><meta http-equiv="refresh" content="0;url=/zh/"><script>try{if(localStorage.getItem('talenttao-lang')==='en')location.replace('/en/');else location.replace('/zh/')}catch{location.replace('/zh/')}</script></head><body><a href="/zh/">进入网站 · 中文</a> / <a href="/en/">English</a></body></html>`);
await put('404.html',layout('zh','404',`<section class="shell page-head not-found"><span class="eyebrow mono">404 / NOT FOUND</span><h1>${site.languages.zh.notFound}</h1><p>${site.languages.zh.notFoundBody}</p><a class="button" href="/zh/">回到首页 →</a><a class="text-link" href="/en/">English home →</a></section>`,{counterpart:'/en/'}));
await put('.nojekyll','');
await put('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
await put('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${generated.map(url=>`<url><loc>${site.origin+url}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${generated.length} bilingual pages and ${notes.length} article versions in dist/`);

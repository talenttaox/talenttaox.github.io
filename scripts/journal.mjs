import fs from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import {gunzipSync} from 'node:zlib';
const md=new MarkdownIt({html:true,linkify:true});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function loadJournal(root){
  const entries=JSON.parse(await fs.readFile(path.join(root,'content/journal/index.json'),'utf8'));
  for(const entry of entries){
    const raw=await fs.readFile(path.join(root,'content/journal',entry.slug+'.md'),'utf8');
    const tokens=md.parse(raw,{});entry.headings=[];
    for(let i=0;i<tokens.length;i++)if(tokens[i].type==='heading_open'){
      const id=`section-${entry.headings.length+1}`;tokens[i].attrSet('id',id);tokens[i].attrSet('tabindex','-1');
      entry.headings.push({id,text:tokens[i+1].content,level:tokens[i].tag});
    }
    entry.html=md.renderer.render(tokens,md.options,{});
  }
  return entries;
}
export const journalUrl=(lang,entry)=>`/${lang}/notes/journal/${entry.slug}/`;
export async function extractJournalImages(root,dist){
  const folder=path.join(root,'content/journal/images');
  await fs.mkdir(path.join(dist,'journal'),{recursive:true});
  for(const file of (await fs.readdir(folder)).filter(f=>/^\d{2}\.json\.gz$/.test(f)).sort()){
    const images=JSON.parse(gunzipSync(await fs.readFile(path.join(folder,file))).toString('utf8'));
    for(const image of images){
      if(!/^[a-f0-9]{16}\.webp$/.test(image.name))throw new Error('Invalid journal image name');
      await fs.writeFile(path.join(dist,'journal',image.name),Buffer.from(image.content,'base64'));
    }
  }
}
const dateLabel=e=>e.date===e.endDate?e.date.replaceAll('-','.'):e.date.replaceAll('-','.')+' — '+e.endDate.replaceAll('-','.');
export function journalDirectory(entries,lang){
  const zh=lang==='zh';
  return `<section class="shell article-head"><a class="text-link back" href="/${lang}/notes/">← ${zh?'返回笔记':'Back to notes'}</a><span class="eyebrow mono">JOURNAL / ${String(entries.length).padStart(2,'0')}</span><h1>${zh?'随记':'Journal'}</h1><p>${zh?'沿途见闻，日常片刻。':'Places, moments, and reflections.'}</p>${zh?'':'<p class="language-notice">The essays are written in Chinese.</p>'}</section><section class="shell journal-directory"><label class="sr-only" for="journal-query">${zh?'搜索随记目录':'Search the journal index'}</label><div class="search-box"><span aria-hidden="true">⌕</span><input id="journal-query" type="search" placeholder="${zh?'搜索标题、小节或日期':'Search titles, sections, or dates'}" autocomplete="off" aria-controls="journal-index"></div><div class="journal-index-meta"><span>${zh?'按原文顺序':'In document order'}</span><output id="journal-count" aria-live="polite">${entries.length} ${zh?'篇随记':'essays'}</output></div><div id="journal-index">${entries.map((e,i)=>`<div class="journal-entry" data-journal-entry data-search="${esc([e.title,...e.sections,e.date,e.endDate,dateLabel(e)].join(' ').toLocaleLowerCase())}"><a class="journal-entry-link" href="${journalUrl(lang,e)}"><span class="mono journal-number">${String(i+1).padStart(2,'0')}</span><h2>${esc(e.title)}</h2><time datetime="${e.date}">${dateLabel(e)}</time><span aria-hidden="true">↗</span></a>${e.headings.length?`<details class="journal-sections"><summary>${e.headings.length} ${zh?'个小节':'sections'}</summary><nav aria-label="${esc(e.title)}">${e.headings.map(h=>`<a href="${journalUrl(lang,e)}#${h.id}">${esc(h.text)} <span aria-hidden="true">↗</span></a>`).join('')}</nav></details>`:''}</div>`).join('')}</div><p id="journal-empty" class="quiet-empty" hidden>${zh?'没有匹配的标题、小节或日期。':'No matching titles, sections, or dates.'}</p></section>`;
}
export function journalArticle(entries,index,lang,toc){
  const e=entries[index],zh=lang==='zh',prev=entries[index-1],next=entries[index+1];
  const pager=(item,label)=>item?`<a href="${journalUrl(lang,item)}"><span class="mono">${label}</span><strong>${esc(item.title)}</strong></a>`:'<span></span>';
  return `<section class="shell article-head"><a class="text-link back" href="/${lang}/notes/journal/">← ${zh?'随记目录':'Journal index'}</a><div class="note-meta"><span>${zh?'随记':'Journal'} / ${String(index+1).padStart(2,'0')}</span><time datetime="${e.date}">${dateLabel(e)}</time></div><h1>${esc(e.title)}</h1></section><div class="shell article-layout journal-article ${e.headings.length?'':'journal-no-toc'}"><article class="prose" lang="zh-CN">${zh?'':'<p class="language-notice">This essay is in Chinese. An English translation is not available yet.</p>'}${e.html}<nav class="journal-pager" aria-label="${zh?'随记翻页':'Essay navigation'}">${pager(prev,zh?'← 上一篇':'← Previous')}${pager(next,zh?'下一篇 →':'Next →')}</nav><a class="text-link journal-back" href="/${lang}/notes/journal/">${zh?'返回随记目录':'Back to journal index'} ↗</a></article>${e.headings.length?`<aside class="toc">${toc}</aside>`:''}</div>`;
}

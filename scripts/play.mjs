export function wanderPage(lang) {
  const t = (a,b) => lang === 'zh' ? a : b;
  return `<section class="shell page-head"><span class="eyebrow mono">SERENDIPITY / WORDS</span><h1>${t('随便逛逛','Wander a little')}</h1><p>${t('不找什么，看看会遇见什么。','No destination. See what you find.')}</p></section><section class="shell wander-page"><div id="wander-card" class="wander-card" aria-live="polite" aria-busy="true"><span class="eyebrow mono" id="wander-meta"></span><blockquote id="wander-excerpt">${t('正在翻开一页…','Opening a page…')}</blockquote><a id="wander-link" class="text-link" href="/${lang}/notes/">${t('阅读全文','Read the full text')} ↗</a></div><div class="wander-tools"><button type="button" class="button" id="wander-next" disabled>${t('再逛一处','Another discovery')} ↻</button><a class="text-link" href="/${lang}/lab/">${t('去实验室玩一会儿','Visit the laboratory')} ↗</a><output id="wander-count" class="mono"></output></div>${lang==='en'?'<p class="play-note">Journal excerpts and psychology notes are in Chinese.</p>':''}</section>`;
}

export function wanderData(journal, notes, lang) {
  const clean = html => html.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
  const excerpt = html => [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>clean(m[1])).find(s=>s.length>=45 && !s.includes('!['))?.slice(0,260) || '';
  return [...journal.map(e=>({title:e.title,date:e.date,text:excerpt(e.html),url:`/${lang}/notes/journal/${e.slug}/`,kind:lang==='zh'?'随记':'JOURNAL'})),...notes.filter(n=>n.lang===lang && n.collection!=='journal').map(n=>({title:n.title,date:n.date,text:excerpt(n.html)||n.description,url:n.url,kind:lang==='zh'?'笔记':'NOTES'}))].filter(e=>e.text);
}

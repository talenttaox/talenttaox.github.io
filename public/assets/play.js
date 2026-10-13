const zh = document.body.dataset.lang === 'zh', t = (a,b) => zh ? a : b;
const $ = id => document.getElementById(id);

if ($('wander-card')) {
  (async()=>{
    const r=await fetch(`/play/wander-${zh?'zh':'en'}.json`);if(!r.ok)throw Error('load');const entries=await r.json();
    let bag=[],count=0;
    function next(){if(!bag.length){bag=[...entries];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}const e=bag.pop();if(!e)return;
      $('wander-meta').textContent=`${e.kind} / ${e.date}`;$('wander-excerpt').textContent=e.text+ (e.text.length===260?'…':'');$('wander-link').textContent=`${e.title} ↗`;$('wander-link').href=e.url;$('wander-count').textContent=`${String(++count).padStart(2,'0')} / ${t('偶然相遇','DISCOVERIES')}`;$('wander-card').setAttribute('aria-busy','false');
    }
    $('wander-next').disabled=false;$('wander-next').addEventListener('click',next);next();
  })().catch(()=>{$('wander-excerpt').textContent=t('这页暂时没能翻开，请刷新重试。','Could not open a page. Please refresh to try again.');$('wander-card').setAttribute('aria-busy','false');});
}

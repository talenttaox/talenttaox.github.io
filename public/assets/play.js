const zh = document.body.dataset.lang === 'zh', t = (a,b) => zh ? a : b;
const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
function node(tag, attrs, parent, text) { const n=document.createElementNS(ns,tag); for(const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); if(text!==undefined)n.textContent=text;parent.append(n);return n; }

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

if ($('city-map')) {
  const map=$('city-map'), key=`talenttao-imaginary-city-${zh?'zh':'en'}-v1`;
  let words=[t('雨','Rain'),t('离别','Farewell'),t('凌晨','Dawn')],edition=1,edits={},seen=new Set(),selected=0;
  const stations=zh?['旧车站','河岸','小巷','书店','广场','邮局','钟楼','渡口']:['Old station','Riverbank','Alley','Bookshop','Square','Post office','Clock tower','Ferry'];
  const kinds=zh?['抵达','停留','偶遇','阅读','相逢','寄往远方','时间','离开']:['ARRIVAL','PAUSE','ENCOUNTER','READING','MEETING','LETTERS','TIME','DEPARTURE'];
  const positions=[[150,145],[370,180],[655,130],[755,310],[555,350],[220,365],[340,500],[675,520]];
  let points=[];
  function fitLabels(){
    const scale=900/map.getBoundingClientRect().width;
    map.querySelectorAll('.city-node').forEach((g,i)=>{
      const label=g.querySelector('text'),left=points[i][0]>600;
      label.setAttribute('font-size',11*scale);label.style.fontSize=`${11*scale}px`;label.style.strokeWidth=1.5*scale;
      label.setAttribute('x',(left?-8:8)*scale);label.setAttribute('y',4*scale);label.setAttribute('text-anchor',left?'end':'start');
      g.querySelector('.city-marker').setAttribute('r',(i===selected?4.5:3.5)*scale);
      g.querySelector('.city-marker').style.vectorEffect='non-scaling-stroke';
      g.querySelector('.city-hit').setAttribute('r',15*scale);
    });
  }
  function save(){try{localStorage.setItem(key,JSON.stringify({words,edition,edits,seen:[...seen],selected}));return true;}catch{$('city-message').textContent=t('浏览器无法保存，离开前可导出地图。','Browser storage is unavailable. Export your map before leaving.');return false;}}
  function validWords(value){return Array.isArray(value)&&value.length===3&&value.every(w=>typeof w==='string'&&w.trim().length>0&&w.length<=16);}
  function load(){try{const params=new URLSearchParams(location.search);if(params.has('words')){const w=JSON.parse(params.get('words'));if(validWords(w)){words=w.map(w=>w.trim());edition=Math.max(1,Math.min(9999,Number(params.get('edition'))||1));return;}}const s=JSON.parse(localStorage.getItem(key));if(s&&validWords(s.words)){words=s.words;edition=Number.isInteger(s.edition)?Math.max(1,Math.min(9999,s.edition)):1;edits=Object.fromEntries(Object.entries(s.edits||{}).filter(([k,v])=>/^[0-7]$/.test(k)&&typeof v==='string'&&v.length<=800));seen=new Set((Array.isArray(s.seen)?s.seen:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<8));selected=Number.isInteger(s.selected)&&s.selected>=0&&s.selected<8?s.selected:0;}}catch{}}
  function randomFor(seed){let x=2166136261;for(const c of seed){x^=c.codePointAt(0);x=Math.imul(x,16777619);}return()=>{x+=0x6D2B79F5;let n=x;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};}
  function story(i){if(Object.hasOwn(edits,i))return edits[i];const [a,b,c]=words;
    const texts=zh?[
      `末班车停在${a}站，时刻表却只写着“${c}”。你没有找到来接你的人，长椅上放着一封署名为${b}的信。`,
      `河水从${a}街的尽头流过。有人把${b}写在石阶上，涨潮时只剩下最后一笔。你决定在这里坐到${c}。`,
      `这条巷子没有门牌。转过第三个弯，你听见有人轻声念着“${a}”。窗内的灯还亮着，像在等一场${b}。`,
      `店主递给你一本没有结尾的书。第一页写着${a}，最后一页夹着一张去往${b}的车票。你在空白处写下${c}。`,
      `广场中央没有雕像，只有一把朝向${a}街的椅子。这里的人约定：关于${b}的事，都留到${c}再说。`,
      `邮局只接收没有地址的信。你写下${a}，又划掉${b}。邮递员说，不必着急，这座城的${c}很长。`,
      `钟楼的指针每天只走一格。${a}到来时，人们叫它早晨；${b}经过时，人们叫它黄昏。只有${c}没有名字。`,
      `摆渡人问你要去哪里。你说，去${a}的另一边。他把船靠岸，告诉你：带着${b}的人，总会在${c}找到新的入口。`
    ]:[
      `The last train stops at ${a} station. The timetable says only “${c}”. Nobody is waiting, but a letter signed ${b} rests on the bench.`,
      `The river passes the end of ${a} Street. Someone wrote ${b} on the steps. The tide leaves a single stroke. You decide to stay until ${c}.`,
      `This alley has no numbers. Around the third corner someone whispers “${a}”. A window stays lit, waiting for ${b}.`,
      `The bookseller offers a book without an ending. It begins with ${a}; a ticket to ${b} marks the final page. In the margin you write ${c}.`,
      `There is no statue, just a chair facing ${a} Street. Here, everything about ${b} is left until ${c}.`,
      `The post office accepts letters without addresses. You write ${a}, cross out ${b}. There is no hurry: ${c} lasts a long time here.`,
      `The clock moves once a day. People call ${a} morning and ${b} evening. Only ${c} has no name.`,
      `The ferryman asks where you are going. Beyond ${a}, you say. He tells you that anyone carrying ${b} will find another entrance at ${c}.`
    ];return texts[i];}
  function select(i, persist=true){selected=i;seen.add(i);map.querySelectorAll('.city-node').forEach((g,n)=>g.setAttribute('aria-pressed',String(n===i)));$('city-kind').textContent=`0${i+1} / ${kinds[i]}`;$('city-place').textContent=`${words[i%3]} · ${stations[i]}`;$('city-story-text').textContent=story(i);$('city-coordinate').textContent=`${points[i].map(n=>n.toFixed(0).padStart(3,'0')).join(' / ')}`;$('city-explored').textContent=`${seen.size} / 8 ${t('处已探索','PLACES EXPLORED')}`;$('city-editor').hidden=true;$('city-edit').hidden=false;fitLabels();if(persist)save();}
  function render(){
    map.replaceChildren();const rnd=randomFor(words.join('|')+edition);
    $('city-name').textContent=zh?`${words[0]}之城`:`City of ${words[0]}`;$('city-edition').textContent=`ATLAS / ${String(edition).padStart(3,'0')}`;
    const blocks=node('g',{'aria-hidden':'true'},map);
    for(let row=0;row<10;row++)for(let col=0;col<14;col++){const x=45+col*59+(rnd()-.5)*13,y=45+row*57+(rnd()-.5)*13;if(Math.abs(x-(435+y*.12))<48)continue;node('rect',{x,y,width:22+rnd()*25,height:18+rnd()*23,rx:2,class:'city-block',transform:`rotate(${(rnd()-.5)*10} ${x} ${y})`},blocks);}
    const roads=node('g',{'aria-hidden':'true'},map);
    for(let i=0;i<7;i++){const y=65+i*82;node('path',{d:`M25 ${y} Q430 ${y+35*(rnd()-.5)} 875 ${y+20}`,class:'city-street'},roads);}
    for(let i=0;i<9;i++){const x=55+i*100;node('path',{d:`M${x} 25 Q${x+55} 340 ${x-15} 625`,class:'city-street'},roads);}
    const river='M455 -20 C365 150 535 280 465 390 S530 560 440 680';node('path',{d:river,class:'city-river'},roads);node('path',{d:river,class:'city-river-edge'},roads);
    for(const [x,y] of [[432,150],[479,335],[485,525]])node('line',{x1:x-25,y1:y,x2:x+25,y2:y-5,class:'city-bridge'},roads);
    node('text',{x:65,y:600,class:'city-road-name'},roads,`${words[0]} / ${t('大道','AVENUE')}`);node('text',{x:680,y:65,class:'city-road-name'},roads,`${words[1]} / ${t('街','STREET')}`);node('text',{x:490,y:255,class:'city-road-name',transform:'rotate(80 490 255)'},roads,`${words[2]} / ${t('河','RIVER')}`);
    points=positions.map(([x,y])=>[x+(rnd()-.5)*45,y+(rnd()-.5)*40]);
    points.forEach(([x,y],i)=>{const g=node('g',{class:'city-node',transform:`translate(${x},${y})`,tabindex:0,role:'button','aria-label':`${words[i%3]} · ${stations[i]}`,'aria-pressed':false},map);node('circle',{r:23,class:'city-hit'},g);node('circle',{r:5,class:'city-marker'},g);node('text',{x:11,y:5},g,stations[i]);node('title',{},g,`${words[i%3]} · ${stations[i]}`);g.addEventListener('click',()=>select(i));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i);}});});
    select(selected);words.forEach((w,i)=>$(`city-word-${i}`).value=w);
  }
  function rebuild(next){words=next;edits={};seen.clear();selected=0;$('city-message').textContent='';history.replaceState(null,'',location.pathname);render();}
  $('city-form').addEventListener('submit',e=>{e.preventDefault();const next=[0,1,2].map(i=>$(`city-word-${i}`).value.trim());if(!validWords(next)){$('city-message').textContent=t('请填入三个词，每个最多 16 字。','Enter three words, each up to 16 characters.');return;}edition=1;rebuild(next);});
  $('city-rebuild').addEventListener('click',()=>{edition=edition%9999+1;rebuild(words);});
  $('city-edit').addEventListener('click',()=>{$('city-text').value=story(selected);$('city-editor').hidden=false;$('city-edit').hidden=true;$('city-text').focus();});
  $('city-cancel').addEventListener('click',()=>{$('city-editor').hidden=true;$('city-edit').hidden=false;});
  $('city-editor').addEventListener('submit',e=>{e.preventDefault();edits[selected]=$('city-text').value.trim();select(selected);});
  $('city-share').addEventListener('click',async()=>{const url=new URL(location.pathname,location.origin);url.searchParams.set('words',JSON.stringify(words));url.searchParams.set('edition',edition);try{await navigator.clipboard.writeText(url.href);$('city-message').textContent=t('城市链接已复制，不包含个人改写。','City link copied, without personal edits.');}catch{$('city-message').textContent=url.href;}});
  $('city-download').addEventListener('click',()=>{
    const out=document.createElementNS(ns,'svg');out.setAttribute('xmlns',ns);out.setAttribute('viewBox','0 0 900 1600');out.setAttribute('width',900);out.setAttribute('height',1600);
    const style=getComputedStyle(map),bg=style.backgroundColor;node('rect',{width:900,height:1600,fill:bg},out);
    node('text',{x:35,y:35,fill:getComputedStyle($('city-name')).color,'font-size':20},out,$('city-name').textContent+` / ${edition}`);
    const drawing=map.cloneNode(true);drawing.setAttribute('x',0);drawing.setAttribute('y',50);drawing.setAttribute('width',900);drawing.setAttribute('height',650);
    [...drawing.querySelectorAll('*')].forEach((n,i)=>{const cs=getComputedStyle(map.querySelectorAll('*')[i]);for(const prop of ['fill','stroke','stroke-width','stroke-opacity','font-size','font-family','paint-order','stroke-linejoin'])n.style.setProperty(prop,cs.getPropertyValue(prop));n.removeAttribute('tabindex');n.removeAttribute('role');});out.append(drawing);
    const ink=getComputedStyle($('city-place')).color;
    for(let i=0;i<8;i++){const y=745+i*102;node('text',{x:35,y,fill:ink,'font-size':17},out,`${words[i%3]} · ${stations[i]}`);const chars=Array.from(story(i));const size=zh?52:105;for(let j=0;j<Math.min(3,Math.ceil(chars.length/size));j++)node('text',{x:35,y:y+24+j*20,fill:ink,'font-size':14},out,chars.slice(j*size,(j+1)*size).join('')+(j===2&&chars.length>size*3?'…':''));}
    node('text',{x:35,y:1580,fill:ink,'font-size':11},out,t('不存在的城市 · talenttao · 虚构地图','A city that never was · talenttao · Fictional map'));
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(out)],{type:'image/svg+xml;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='imaginary-city.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('city-message').textContent=t('地图已导出，附带各地点的故事（长文节选）。','Map exported with stories (long texts are excerpted).');
  });
  load();render();new ResizeObserver(fitLabels).observe(map);
}

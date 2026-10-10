(() => {
  const zh=document.body.dataset.lang==='zh';
  const text=zh?{pause:'暂停',play:'继续',copy:'复制代码',copied:'已复制',copyError:'请选中代码手动复制',count:'篇笔记'}:{pause:'Pause',play:'Resume',copy:'Copy code',copied:'Copied',copyError:'Select the code to copy it manually',count:'notes'};
  try{localStorage.setItem('talenttao-lang',zh?'zh':'en');}catch{}
  document.querySelector('.theme-toggle')?.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem('talenttao-theme',next);}catch{}
  });
  const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu?.setAttribute('aria-expanded','false');nav?.classList.remove('open');}});
  const search=document.querySelector('#search');
  if(search){
    const rows=[...document.querySelectorAll('[data-note]')],filters=[...document.querySelectorAll('[data-filter]')];let tag='';
    function filter(){const query=search.value.trim().toLocaleLowerCase();let count=0;
      rows.forEach(row=>{const show=row.dataset.search.includes(query)&&(!tag||JSON.parse(row.dataset.tags).includes(tag));row.hidden=!show;if(show)count++;});
      document.querySelector('#result-count').textContent=`${count} ${text.count}`;
      document.querySelector('#no-results').hidden=count!==0;
    }
    filters.forEach(button=>button.addEventListener('click',()=>{tag=button.dataset.filter;filters.forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});filter();}));
    search.addEventListener('input',filter);
  }
  document.querySelectorAll('.prose pre').forEach(pre=>{
    const code=pre.querySelector('code'),button=document.createElement('button');if(!code)return;
    button.className='copy-code';button.textContent=text.copy;pre.append(button);
    button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.textContent);button.textContent=text.copied;setTimeout(()=>button.textContent=text.copy,1800);}catch{button.textContent=text.copyError;}});
  });
  if('IntersectionObserver' in window){
    const links=[...document.querySelectorAll('.toc a')];
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){links.forEach(link=>link.classList.toggle('active',link.hash===`#${entry.target.id}`));}}},{rootMargin:'-10% 0px -70% 0px'});
    document.querySelectorAll('.prose h2,.prose h3').forEach(h=>observer.observe(h));
  }
  const canvas=document.querySelector('#sculpture');if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const TAU=Math.PI*2,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause=document.querySelector('#pause'),slider=document.querySelector('#morph'),word=document.querySelector('#seed-word'),tabs=[...document.querySelectorAll('[data-form]')];
  let width=0,height=0,paused=reduced,visible=true,frame=0,last=0,rx=-.42,ry=.65,drag=null,form=0,curves=[],seed=0,morph=.35;
  function hash(value){let h=2166136261;for(const c of value){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function geometry(){
    seed=hash(word.value.trim()||'talenttao');morph=Number(slider.value)/100;
    const pairs=[[2,3],[3,4],[3,5],[2,5],[4,5]],pair=pairs[seed%pairs.length],phase=(seed%1000)/1000*TAU;
    const count=44,steps=220;curves=[];
    for(let i=0;i<count;i++){
      const phi=i/count*TAU,line=[];
      for(let j=0;j<=steps;j++){
        const t=j/steps*TAU;let x,y,z;
        if(form===0){
          const [p,q]=pair,major=1.15,minor=.37+morph*.25;
          const a=p*t,b=q*t+phase,radial=major+minor*Math.cos(b),tube=.07+.12*morph;
          const braid=phi+t*(2+(seed%3));
          x=(radial+tube*Math.cos(braid))*Math.cos(a);
          y=(radial+tube*Math.cos(braid))*Math.sin(a);
          z=minor*Math.sin(b)+tube*Math.sin(braid);
        }else if(form===1){
          const latitude=-1.4+i/(count-1)*2.8;
          const ribs=3+seed%5,shape=1+.17*morph*Math.cos(ribs*t+phase)*Math.cos(latitude*2);
          const twist=.8*morph*Math.sin(latitude*2);
          x=shape*Math.cos(latitude)*Math.cos(t+twist);
          y=shape*Math.cos(latitude)*Math.sin(t+twist);
          z=1.22*Math.sin(latitude)+.15*morph*Math.sin(ribs*t+phase)*Math.cos(latitude);
        }else{
          const swing=phi+phase,tilt=.5+1.25*morph;
          const r=.96+.16*Math.sin(phi*3+phase);
          const localX=r*Math.cos(t),localY=r*Math.sin(t),localZ=.18*morph*Math.sin(3*t+phi);
          const xx=localX,yy=localY*Math.cos(tilt)+localZ*Math.sin(tilt),zz=-localY*Math.sin(tilt)+localZ*Math.cos(tilt);
          x=xx*Math.cos(swing)-yy*Math.sin(swing);y=xx*Math.sin(swing)+yy*Math.cos(swing);z=zz+.28*Math.cos(phi*2);
        }
        line.push([x,y,z]);
      }
      curves.push(line);
    }
    document.querySelector('#form-id').textContent=(seed%1000).toString().padStart(3,'0');
    draw();
  }
  function render(context,w,h){
    context.fillStyle='#1c1d20';context.fillRect(0,0,w,h);
    context.strokeStyle='rgba(220,220,224,.10)';context.lineWidth=.6;
    const cx=w/2,cy=h/2,scale=Math.min(w,h)*(form===0?.22:.29),sx=Math.sin(rx),cosx=Math.cos(rx),sy=Math.sin(ry),cosy=Math.cos(ry);
    const project=point=>{const [x,y,z]=point,xx=x*cosy+z*sy,zz=-x*sy+z*cosy,yy=y*cosx-zz*sx,depth=y*sx+zz*cosx,perspective=4.7/(4.7-depth);return [cx+xx*scale*perspective,cy+yy*scale*perspective,depth];};
    const sorted=curves.map(line=>{const points=line.map(project);return{points,depth:points.reduce((s,p)=>s+p[2],0)/points.length};}).sort((a,b)=>a.depth-b.depth);
    for(const {points,depth} of sorted){
      const alpha=Math.max(.13,Math.min(.75,.42+depth*.17));
      context.strokeStyle=`rgba(225,227,236,${alpha})`;context.lineWidth=.7;
      context.beginPath();points.forEach((p,i)=>i?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));context.stroke();
    }
    // A small orientation glyph makes the drag response visible without a grid.
    const base=[w-32,h-28];context.lineWidth=.7;
    [[.22,0,0],[0,.22,0],[0,0,.22]].forEach((axis,i)=>{const p=project(axis);context.strokeStyle=['#95969c','#76777d','#babcc3'][i];context.beginPath();context.moveTo(...base);context.lineTo(base[0]+(p[0]-cx)*.8,base[1]+(p[1]-cy)*.8);context.stroke();});
  }
  function draw(){if(width&&height)render(ctx,width,height);}
  function size(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  function tick(now){frame=0;if(paused||!visible||document.hidden){last=0;return;}const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!drag)ry+=dt*.15;draw();frame=requestAnimationFrame(tick);}
  function schedule(){if(!paused&&visible&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);}
  function updatePause(){pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-label',paused?text.play:text.pause);pause.setAttribute('aria-pressed',String(paused));pause.title=paused?text.play:text.pause;}
  function selectForm(next){form=next;tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===form)));geometry();}
  tabs.forEach((tab,i)=>tab.addEventListener('click',()=>selectForm(i)));
  document.querySelector('#seed-form').addEventListener('submit',e=>{e.preventDefault();if(!word.value.trim())word.value='talenttao';rx=-.42;ry=.65;geometry();});
  slider.addEventListener('input',geometry);
  pause.addEventListener('click',()=>{paused=!paused;last=0;updatePause();schedule();});
  document.querySelector('#reset').addEventListener('click',()=>{word.value='talenttao';slider.value='35';rx=-.42;ry=.65;selectForm(0);});
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;ry+=(e.clientX-drag.x)*.008;rx+=(e.clientY-drag.y)*.008;drag.x=e.clientX;drag.y=e.clientY;draw();});
  const endDrag=()=>{drag=null;canvas.classList.remove('dragging');};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('dblclick',()=>selectForm((form+1)%3));
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)){
    e.preventDefault();if(e.key===' '){paused=!paused;updatePause();schedule();}else{if(e.key==='ArrowLeft')ry-=.12;if(e.key==='ArrowRight')ry+=.12;if(e.key==='ArrowUp')rx-=.12;if(e.key==='ArrowDown')rx+=.12;draw();}
  }});
  document.querySelector('#save-form').addEventListener('click',()=>{
    const exportCanvas=document.createElement('canvas');exportCanvas.width=1600;exportCanvas.height=1600;
    const context=exportCanvas.getContext('2d');render(context,1600,1600);context.fillStyle='#a8a9b0';context.font='18px monospace';context.fillText('talenttao / FORM '+(seed%1000).toString().padStart(3,'0'),50,1540);
    exportCanvas.toBlob(blob=>{if(!blob){document.querySelector('#form-message').textContent=zh?'保存失败，请重试':'Could not save. Try again.';return;}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`talenttao-form-${seed%1000}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    },'image/png');
  });
  new ResizeObserver(size).observe(canvas);
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;schedule();}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=0;schedule();});
  geometry();updatePause();size();schedule();
})();

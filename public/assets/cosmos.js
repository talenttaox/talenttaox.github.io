import {STEP,MAX_BODIES,preset,clone,body,radius,center,advance,diagnostics,validateScene} from './cosmos-model.js';
const $=id=>document.getElementById('cosmos-'+id),zh=document.body.dataset.lang==='zh',t=(a,b)=>zh?a:b;
const canvas=$('canvas'),ctx=canvas.getContext('2d'),stage=canvas.parentElement,edit=$('edit'),slider=$('time-slider');
const STORAGE='talenttao-cosmos-v1',SNAP=.25,HISTORY=2401;
let state=preset(),initial=clone(state),history=[clone(state)],cursor=0,trailStart=0,version=0;
let playing=false,placing=false,selected=null,reference='fixed',refKey='',pointer=null,branchCount=0;
let camera={x:0,y:0,scale:1},width=1,height=1,dpr=1,dirty=true,last=0,nextSample=SNAP,trailCache=null;
let energyBase=diagnostics(state).energy,lastCount=state.bodies.length,autosaveAt=0,hadSaved=false;
try{const s=localStorage.getItem(STORAGE);if(s){state=validateScene(JSON.parse(s));initial=clone(state);history=[clone(state)];nextSample=state.t+SNAP;energyBase=diagnostics(state).energy;lastCount=state.bodies.length;hadSaved=true;}}catch{}
function message(s){$('message').textContent=s;}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({version:1,state}));}catch{}}
function frame(s){if(reference==='center')return center(s);if(reference.startsWith('body:')){const b=s.bodies.find(b=>b.id===Number(reference.slice(5)));if(b)return b;}return {x:0,y:0};}
function screen(x,y,s=state){const f=frame(s);return {x:width/2+(x-f.x-camera.x)*camera.scale,y:height/2-(y-f.y-camera.y)*camera.scale};}
function world(x,y){const f=frame(state);return {x:(x-width/2)/camera.scale+camera.x+f.x,y:-(y-height/2)/camera.scale+camera.y+f.y};}
function syncPlay(){ $('play').textContent=playing?t('Ⅱ 暂停','Ⅱ Pause'):t('▶ 开始演化','▶ Play');$('play').setAttribute('aria-pressed',String(playing));}
function setPlaying(value){if(value){branch();if(!state.bodies.length){message(t('先放入一颗天体。','Place a body first.'));return;}}else if(playing&&state.t>history[cursor].t+1e-9){record();}playing=value;last=0;syncPlay();dirty=true;}
function branch(){
 if(cursor<history.length-1){history=history.slice(0,cursor+1);trailStart=Math.min(trailStart,state.t);version++;branchCount++;message(t(`已从 T = ${state.t.toFixed(2)} 创建分支 ${branchCount}，原来的未来已替换。`,`Branch ${branchCount} created at T = ${state.t.toFixed(2)}; previous future replaced.`));}
 nextSample=state.t+SNAP;
}
function record(){
 history.push(clone(state));while(history.length>HISTORY||(history.length>1&&history[0].t<state.t-600)){history.shift();trailStart=Math.max(history[0].t,trailStart);}cursor=history.length-1;version++;dirty=true;
}
function changed(){branch();history[cursor]=clone(state);version++;energyBase=diagnostics(state).energy;lastCount=state.bodies.length;save();refresh();dirty=true;}
function refresh(){
 slider.max=String(history.length-1);slider.value=String(cursor);slider.disabled=history.length<2;
 $('history-start').textContent=history[0].t.toFixed(1);$('time').textContent='T / '+state.t.toFixed(2);
 $('count').textContent=`${state.bodies.length} / ${MAX_BODIES} `+t('天体','BODIES');
 const signature=state.bodies.map(b=>b.id).join(',');
 if(signature!==refKey){
  refKey=signature;const sel=$('reference');sel.querySelectorAll('[data-body]').forEach(o=>o.remove());
  for(const b of state.bodies){const o=document.createElement('option');o.value='body:'+b.id;o.dataset.body='';o.textContent=t('跟随天体 #','Follow body #')+b.id;sel.append(o);}
  if(![...sel.options].some(o=>o.value===reference)){reference='center';camera.x=0;camera.y=0;message(t('跟随的天体已合并，切换到质心参考系。','Followed body merged. Switched to centre of mass.'));}
  sel.value=reference;
 }
 $('frame-label').textContent=reference==='fixed'?t('固定空间','FIXED SPACE'):reference==='center'?t('系统质心','CENTRE OF MASS'):t('跟随天体 #','FOLLOW #')+reference.slice(5);
 $('collision').value=state.collision;
 const b=state.bodies.find(b=>b.id===selected);
 if(!b)selected=null;
 edit.hidden=!b;$('select-hint').hidden=!!b;$('selection').textContent=b?'#'+b.id:'—';
 if(b){
  if(!edit.contains(document.activeElement))for(const k of ['m','vx','vy'])edit.elements[k].value=Number(b[k].toFixed(5));
  $('body-info').textContent=`X ${b.x.toFixed(1)} / Y ${b.y.toFixed(1)} · |V| ${Math.hypot(b.vx,b.vy).toFixed(2)}`;
 }
 $('history-note').textContent=cursor<history.length-1?t('正在回看过去。继续播放或编辑，会替换此后的演化。','Viewing the past. Playing or editing replaces its future.'):t('拖动时间轴回看；从过去继续，会生成新的演化分支。','Scrub to rewind. Resume in the past to create a new branch.');
 const d=diagnostics(state),drift=energyBase?Math.abs((d.energy-energyBase)/energyBase)*100:0;
 $('energy').textContent=t('总质量 ','MASS ')+d.mass.toFixed(2)+(state.collision==='pass'?t(' · 能量偏差 ',' · ΔE ')+drift.toFixed(3)+'%':'');
 $('delete').disabled=!b;
}
function fit(){
 const f=frame(state),bs=state.bodies;
 if(!bs.length){camera={x:0,y:0,scale:Math.min(width/1300,height/900)};dirty=true;return;}
 const minX=Math.min(...bs.map(b=>b.x-radius(b.m))),maxX=Math.max(...bs.map(b=>b.x+radius(b.m)));
 const minY=Math.min(...bs.map(b=>b.y-radius(b.m))),maxY=Math.max(...bs.map(b=>b.y+radius(b.m)));
 const rangeX=Math.max(maxX-minX,400),rangeY=Math.max(maxY-minY,400);
 camera={x:(minX+maxX)/2-f.x,y:(minY+maxY)/2-f.y,scale:Math.max(.00001,Math.min((width-80)/(rangeX*1.5),(height-160)/(rangeY*1.5),8))};dirty=true;
}
function load(s,label){
 playing=false;state=clone(s);initial=clone(s);history=[clone(s)];cursor=0;trailStart=s.t;nextSample=s.t+SNAP;version++;selected=null;branchCount=0;refKey='';
 energyBase=diagnostics(state).energy;lastCount=state.bodies.length;syncPlay();refresh();fit();save();if(label)message(label);
}
function trailPaths(){
 const mode=$('trails').value;if(mode==='off')return [];
 const key=`${version}/${cursor}/${reference}/${mode}/${trailStart}`;if(trailCache?.key===key)return trailCache.paths;
 const paths=new Map(),low=Math.max(trailStart,mode==='fade'?state.t-90:-Infinity);
 for(let i=0;i<=cursor;i++){
  const s=history[i];if(s.t<low)continue;
  const f=frame(s);
  for(const b of s.bodies){let p=paths.get(b.id);if(!p){p={id:b.id,color:b.color,path:new Path2D(),coords:[]};paths.set(b.id,p);}
   const x=b.x-f.x,y=b.y-f.y;if(!p.coords.length)p.path.moveTo(x,y);else p.path.lineTo(x,y);p.coords.push([x,y]);
  }
 }
 const list=[...paths.values()].filter(p=>p.coords.length>1);trailCache={key,paths:list};return list;
}
function paint(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101b29';ctx.fillRect(0,0,width,height);
 // Fixed decorative stars, independent from the physical bodies.
 for(let i=0;i<95;i++){ctx.fillStyle=i%4?'#68809738':'#89a1b15c';ctx.fillRect(((i*197.37)%997)/997*width,((i*373.91)%991)/991*height,i%4?1:1.5,i%4?1:1.5);}
 const spacing=10**Math.floor(Math.log10(140/camera.scale));
 const cell=spacing*camera.scale,ox=width/2-camera.x*camera.scale,oy=height/2+camera.y*camera.scale;
 ctx.strokeStyle='#637b9312';ctx.lineWidth=1;ctx.beginPath();
 for(let x=((ox%cell)+cell)%cell;x<width;x+=cell){ctx.moveTo(x,0);ctx.lineTo(x,height);}
 for(let y=((oy%cell)+cell)%cell;y<height;y+=cell){ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();
 ctx.save();ctx.translate(width/2-camera.x*camera.scale,height/2+camera.y*camera.scale);ctx.scale(camera.scale,-camera.scale);
 ctx.lineWidth=1.1/camera.scale;ctx.globalAlpha=.62;
 for(const p of trailPaths()){ctx.strokeStyle=p.color;ctx.stroke(p.path);}ctx.restore();
 const com=center(state),c=screen(com.x,com.y);ctx.strokeStyle='#94a8b966';ctx.beginPath();ctx.moveTo(c.x-5,c.y);ctx.lineTo(c.x+5,c.y);ctx.moveTo(c.x,c.y-5);ctx.lineTo(c.x,c.y+5);ctx.stroke();
 for(const b of state.bodies){
  const p=screen(b.x,b.y),r=Math.max(3,radius(b.m)*camera.scale);if(p.x+r<0||p.x-r>width||p.y+r<0||p.y-r>height)continue;
  ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  if(b.id===selected){ctx.strokeStyle='#edf4fc';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,r+7,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#cad9e5';ctx.font='10px monospace';ctx.fillText('#'+b.id,p.x+r+8,p.y-5);
 }
 if(pointer?.kind==='add'){
  const a=screen(pointer.start.x,pointer.start.y),b=pointer.end;
  ctx.strokeStyle='#dceaf2';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
  const ang=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x-10*Math.cos(ang-.4),b.y-10*Math.sin(ang-.4));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-10*Math.cos(ang+.4),b.y-10*Math.sin(ang+.4));ctx.stroke();
  ctx.strokeStyle='#edbd7b';ctx.beginPath();ctx.arc(a.x,a.y,Math.max(3,radius(Number($('mass').value)||1000)*camera.scale),0,Math.PI*2);ctx.stroke();
  const v=Math.hypot(b.x-a.x,b.y-a.y)/camera.scale/8;ctx.fillStyle='#e1eaf2';ctx.fillText('|V| '+v.toFixed(2),b.x+10,b.y-12);
 }
 $('scale').textContent=spacing.toLocaleString()+t(' 单位',' units');$('scale').style.width=cell+'px';
}
function resize(){const rect=stage.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);dirty=true;}
new ResizeObserver(resize).observe(stage);resize();fit();refresh();syncPlay();
if(hadSaved)message(t('已恢复上次的场景。按播放继续。','Restored your previous scene. Press play to continue.'));
function gestureEnd(cancel=false){
 if(!pointer)return;const p=pointer;pointer=null;
 if(!cancel&&p.kind==='add'){
  const end=world(p.end.x,p.end.y),m=Number($('mass').value);
  if(state.bodies.length>=MAX_BODIES)message(t('最多放置 64 个天体。','Maximum of 64 bodies.'));
  else if(!Number.isFinite(m)||m<.01||m>100000)message(t('质量范围为 0.01–100000。','Mass must be between 0.01 and 100000.'));
  else{const b=body(state.nextId++,p.start.x,p.start.y,(end.x-p.start.x)/8,(end.y-p.start.y)/8,m);state.bodies.push(b);selected=b.id;changed();message(t(`已投放天体 #${b.id}。`,`Placed body #${b.id}.`));}
 }else if(!cancel&&p.kind==='pan'&&Math.hypot(p.end.x-p.down.x,p.end.y-p.down.y)<6){
  let best=null,dist=Infinity;for(const b of state.bodies){const s=screen(b.x,b.y),d=Math.hypot(s.x-p.end.x,s.y-p.end.y);if(d<Math.max(15,radius(b.m)*camera.scale+7)&&d<dist){best=b.id;dist=d;}}
  selected=best;refresh();
 }
 if(p.resume)setPlaying(true);dirty=true;
}
function pos(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{
 if(pointer||e.button!==0)return;const p=pos(e),resume=playing;
 if(placing)setPlaying(false);
 pointer={id:e.pointerId,kind:placing?'add':'pan',down:p,end:p,start:world(p.x,p.y),camera:{...camera},resume:placing&&resume};canvas.setPointerCapture(e.pointerId);dirty=true;
});
canvas.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;pointer.end=pos(e);if(pointer.kind==='pan'){camera.x=pointer.camera.x-(pointer.end.x-pointer.down.x)/camera.scale;camera.y=pointer.camera.y+(pointer.end.y-pointer.down.y)/camera.scale;}dirty=true;});
canvas.addEventListener('pointerup',e=>{if(pointer?.id===e.pointerId)gestureEnd();});
canvas.addEventListener('pointercancel',()=>gestureEnd(true));
function zoom(factor,p={x:width/2,y:height/2}){if(pointer)return;const before=world(p.x,p.y);camera.scale=Math.max(.00001,Math.min(15,camera.scale*factor));const after=world(p.x,p.y);camera.x+=before.x-after.x;camera.y+=before.y-after.y;dirty=true;}
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.001),pos(e));},{passive:false});
$('zoom-in').onclick=()=>zoom(1.3);$('zoom-out').onclick=()=>zoom(1/1.3);$('fit').onclick=fit;
$('add').onclick=()=>{placing=!placing;$('add').setAttribute('aria-pressed',String(placing));stage.classList.toggle('placing',placing);$('stage-hint').textContent=placing?t('拖动投放天体 · 箭头长度决定速度','Drag to place a body · Arrow length sets speed'):t('拖动平移 · 滚轮缩放 · 点选天体','Drag to pan · Scroll to zoom · Select a body');};
document.querySelectorAll('[data-mass]').forEach(b=>b.onclick=()=>{$('mass').value=b.dataset.mass;});
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{load(preset(b.dataset.preset),t('预设已载入。按播放开始，或继续自由搭建。','Preset loaded. Press play or keep building.'));document.querySelectorAll('[data-preset]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('play').onclick=()=>setPlaying(!playing);
function tick(duration){
 try{advance(state,duration);}catch{state=clone(history[cursor]);setPlaying(false);message(t('近距离相遇过于剧烈，已暂停并恢复到最近记录。可降低质量或拉开距离。','Encounter too extreme. Paused at the latest recorded state. Reduce mass or increase separation.'));return false;}
 if(state.bodies.some(b=>!Number.isFinite(b.x+b.y+b.vx+b.vy)||Math.abs(b.x)>1e9||Math.abs(b.y)>1e9)){
  state=clone(history[cursor]);setPlaying(false);message(t('参数超出可稳定模拟的范围，已恢复到最近记录。','Parameters exceeded the simulation range. Restored the latest recorded state.'));return false;
 }
 if(state.bodies.length!==lastCount){energyBase=diagnostics(state).energy;lastCount=state.bodies.length;message(t('发生碰撞合并：质量与动量已保留。','Collision: bodies merged, preserving mass and momentum.'));}
 if(state.t>=nextSample-1e-9){record();nextSample=state.t+SNAP;}
 dirty=true;return true;
}
$('step').onclick=()=>{setPlaying(false);branch();tick(SNAP);if(history[cursor].t!==state.t)record();refresh();save();};
$('reset').onclick=()=>load(initial,t('已回到本次场景的初始状态。','Returned to the initial state of this scene.'));
slider.oninput=()=>{const target=Number(slider.value);setPlaying(false);cursor=target;state=clone(history[cursor]);energyBase=diagnostics(state).energy;refresh();dirty=true;};
$('live').onclick=()=>{setPlaying(false);cursor=history.length-1;state=clone(history[cursor]);refresh();dirty=true;};
$('reference').onchange=()=>{reference=$('reference').value;camera.x=0;camera.y=0;refresh();dirty=true;};
$('trails').onchange=()=>{dirty=true;};
$('collision').onchange=()=>{state.collision=$('collision').value;changed();};
edit.onsubmit=e=>{e.preventDefault();const b=state.bodies.find(b=>b.id===selected);if(!b)return;const v=Object.fromEntries(['m','vx','vy'].map(k=>[k,Number(edit.elements[k].value)]));if(!edit.reportValidity()||Object.values(v).some(x=>!Number.isFinite(x)))return;Object.assign(b,v);changed();message(t('参数已更新，后续演化从这里继续。','Parameters updated. Evolution continues from here.'));};
$('delete').onclick=()=>{state.bodies=state.bodies.filter(b=>b.id!==selected);selected=null;changed();};
$('clear').onclick=()=>{trailStart=state.t;version++;dirty=true;message(t('轨迹已清空，时间回看记录仍然保留。','Trails cleared. Rewind history is preserved.'));};
function download(data,type,name){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>download(JSON.stringify({version:1,state},null,2),'application/json','celestial-scene.json');
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;try{if(file.size>500000)throw Error('size');const s=validateScene(JSON.parse(await file.text()));load(s,t('场景已导入。','Scene imported.'));}catch{message(t('无法导入：请选择有效的场景 JSON 文件（最多 64 个天体）。','Import failed: choose a valid scene JSON file (up to 64 bodies).'));}finally{$('file').value='';}};
$('export').onclick=()=>{
 const W=Math.round(width),H=Math.round(height),f=frame(state),points=trailPaths();
 const xy=(x,y)=>`${(W/2+(x-camera.x)*camera.scale).toFixed(2)},${(H/2-(y-camera.y)*camera.scale).toFixed(2)}`;
 const paths=points.map(p=>`<polyline fill="none" stroke="${p.color}" stroke-width="1.3" opacity=".75" points="${p.coords.map(c=>xy(...c)).join(' ')}"/>`).join('');
 const bodies=state.bodies.map(b=>{const [x,y]=xy(b.x-f.x,b.y-f.y).split(',');return `<circle cx="${x}" cy="${y}" r="${Math.max(3,radius(b.m)*camera.scale).toFixed(2)}" fill="${b.color}"/><text x="${Number(x)+12}" y="${Number(y)-8}" fill="#dce6ee" font-family="monospace" font-size="10">#${b.id}</text>`;}).join('');
 const metadata=JSON.stringify({version:1,state,reference}).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 download(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><metadata>${metadata}</metadata><rect width="100%" height="100%" fill="#101b29"/>${paths}${bodies}<text x="20" y="${H-20}" fill="#92aabb" font-size="11" font-family="monospace">CELESTIAL SANDBOX / T ${state.t.toFixed(2)} / ${reference}</text></svg>`,'image/svg+xml','celestial-trails.svg');
 message(t('已导出当前视野与参考系下的轨迹图。','Exported trails in the current view and reference frame.'));
};
function panel(open){$('panel').classList.toggle('open',open);$('controls').setAttribute('aria-expanded',String(open));if(open)$('close').focus();}
$('controls').onclick=()=>panel(!$('panel').classList.contains('open'));$('close').onclick=()=>panel(false);
document.addEventListener('pointerdown',e=>{if(innerWidth<=760&&$('panel').classList.contains('open')&&!$('panel').contains(e.target)&&!$('controls').contains(e.target))panel(false);});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('canvas').closest('.cosmos-deck').requestFullscreen();}catch{message(t('当前浏览器不支持全屏。','Fullscreen is unavailable in this browser.'));}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?t('退出全屏','Exit fullscreen'):t('全屏','Fullscreen');});
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,button,a'))return;if(e.key===' '){e.preventDefault();setPlaying(!playing);}if(e.key==='Escape'){panel(false);if(placing)$('add').click();}if(e.key==='Delete'&&selected)$('delete').click();});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)save();});
window.addEventListener('pagehide',()=>{playing=false;save();});
let running=true;window.addEventListener('pagehide',()=>{running=false;});window.addEventListener('pageshow',e=>{if(e.persisted){running=true;last=0;syncPlay();requestAnimationFrame(loop);}});
function loop(now){
 if(!running)return;
 if(playing&&!document.hidden){
  let duration=Math.min(.06,last?(now-last)/1000:0)*Number($('speed').value),start=performance.now();
  while(duration>1e-9&&performance.now()-start<11){const h=Math.min(STEP,duration);if(!tick(h))break;duration-=h;}
  refresh();if(now-autosaveAt>2500){save();autosaveAt=now;}
 }
 last=now;if(dirty){paint();dirty=false;}requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

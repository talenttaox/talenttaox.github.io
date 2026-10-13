import {WORLD,DT,generateMap,launch,step,status} from './orbit-model.js';
const app=document.querySelector('[data-game="orbit"]');
if(app){
 const zh=document.body.dataset.lang==='zh',t=(a,b)=>zh?a:b,$=id=>document.getElementById(id),canvas=$('orbit-canvas'),ctx=canvas.getContext('2d');
 let map,ball=null,trails=[],active=null,shots=0,frame=0,last=0,carry=0,nearest=Infinity,aiming=false;
 const palette=['#80c9dc','#e9b67f','#b1a5e9','#8ccfae','#db99b1'];
 const angle=()=>Number($('orbit-angle').value),power=()=>Number($('orbit-power').value);
 const randSeed=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0];};
 function controls(){ $('orbit-angle-value').textContent=`${angle()}°`;$('orbit-power-value').textContent=power();paint(); }
 function stop(){cancelAnimationFrame(frame);frame=0;ball=null;aiming=false;$('orbit-launch').disabled=false;}
 function make(){stop();$('orbit-message').textContent=t('正在生成星场…','Building a field…');
  map=generateMap({starCount:Number($('orbit-stars').value),wallCount:Number($('orbit-walls').value),seed:randSeed()});trails=[];active=null;shots=0;nearest=Infinity;
  $('orbit-field').textContent=`FIELD / ${map.seed.toString(16).slice(-5).toUpperCase().padStart(5,'0')}`;$('orbit-map-info').textContent=t(`${map.stars.length} 个引力点 · ${map.walls.length} 面墙`,`${map.stars.length} STARS · ${map.walls.length} WALLS`);
  $('orbit-distance').textContent=t(`起终点距离 ${Math.round(Math.hypot(map.target.x-map.spawn[0],map.target.y-map.spawn[1]))}`,`START → GOAL ${Math.round(Math.hypot(map.target.x-map.spawn[0],map.target.y-map.spawn[1]))}`);
  $('orbit-angle').value=Math.round(Math.atan2(map.target.y-map.spawn[1],map.target.x-map.spawn[0])*180/Math.PI);$('orbit-power').value=420;$('orbit-shots').textContent=t('0 次发射','0 LAUNCHES');$('orbit-message').textContent=t('新星场已就绪。试着绕过引力点和墙，抵达终点。','Field ready. Find a path around the stars and walls.');controls();
 }
 function finish(result){
  active.result=result;stop();
  $('orbit-message').textContent=result==='win'?t(`命中了！用了 ${shots} 次发射。可以继续试飞，或生成新地图。`,`Captured in ${shots} launches. Keep experimenting, or generate a new field.`):result==='star'?t('撞上星体了。试着留出更大的绕行空间。','Hit a star. Leave more room to curve around it.'):result==='wall'?t('撞到墙了。换一个方向，或借引力绕过去。','Hit a wall. Change direction, or curve around it with gravity.'):result==='escape'?t('飞出星场了。调整角度或减小力度，再试一次。','Left the field. Adjust the angle or lower the power.'):t('这次飞行结束了。换一种发射方式试试。','Flight ended. Try a different launch.');paint();
 }
 function tick(now){if(document.hidden){last=now;frame=requestAnimationFrame(tick);return;}carry+=Math.min(.1,(now-last)/1000);last=now;while(carry>=DT&&ball){const previous=ball;ball=step(ball,map.stars);carry-=DT;active.points.push([ball.x,ball.y]);nearest=Math.min(nearest,Math.hypot(ball.x-map.target.x,ball.y-map.target.y));const result=status(ball,map,previous);if(result!=='flying'){finish(result);return;}}paint();frame=requestAnimationFrame(tick);}
 function shoot(){if(ball)return;shots++;ball=launch(map,angle(),power());active={points:[[ball.x,ball.y]],color:palette[(shots-1)%palette.length],result:'flying'};trails.push(active);if(trails.length>16)trails.shift();$('orbit-launch').disabled=true;$('orbit-shots').textContent=t(`${shots} 次发射`,`${shots} LAUNCHES`);$('orbit-message').textContent=t('飞行中 · 可以随时回到起点重新瞄准。','In flight · Reset the shot whenever you want.');carry=0;last=performance.now();frame=requestAnimationFrame(tick);}
 function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
 function paint(){if(!map)return;
  const w=WORLD.width,h=WORLD.height;ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#101c2b');sky.addColorStop(.6,'#14263a');sky.addColorStop(1,'#17202e');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  for(let i=0;i<140;i++){const x=((i*167+map.seed%1000)%w),y=((i*i*31+map.seed%700)%h);ctx.globalAlpha=.12+(i%5)*.035;ctx.fillStyle='#b4cde0';circle(x,y,i%7===0?1.8:1);ctx.fill();}ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(158,189,213,.06)';ctx.lineWidth=1;for(let x=100;x<w;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=100;y<h;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  for(const s of map.stars){const glow=ctx.createRadialGradient(s.x,s.y,s.r,s.x,s.y,s.r*3.8);glow.addColorStop(0,'rgba(107,169,191,.16)');glow.addColorStop(1,'rgba(107,169,191,0)');ctx.fillStyle=glow;circle(s.x,s.y,s.r*3.8);ctx.fill();ctx.strokeStyle='rgba(117,182,203,.14)';ctx.lineWidth=1.2;for(const r of [s.r*1.8,s.r*2.8]){circle(s.x,s.y,r);ctx.stroke();}
   const body=ctx.createRadialGradient(s.x-s.r*.35,s.y-s.r*.35,0,s.x,s.y,s.r);body.addColorStop(0,'#658ca2');body.addColorStop(.45,'#354d62');body.addColorStop(1,'#172d41');ctx.fillStyle=body;circle(s.x,s.y,s.r);ctx.fill();ctx.strokeStyle='rgba(154,202,220,.55)';ctx.lineWidth=1.4;ctx.stroke();
  }
  for(const wall of map.walls){ctx.fillStyle='#23384c';ctx.strokeStyle='#8ba4b8';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(wall.x,wall.y,wall.w,wall.h,4);ctx.fill();ctx.stroke();ctx.save();ctx.clip();ctx.strokeStyle='rgba(168,192,211,.28)';for(let x=wall.x-wall.h;x<wall.x+wall.w;x+=18){ctx.beginPath();ctx.moveTo(x,wall.y+wall.h);ctx.lineTo(x+wall.h,wall.y);ctx.stroke();}ctx.restore();}
  trails.forEach((trail,i)=>{ctx.globalAlpha=trail===active?.95:.3+.25*i/Math.max(1,trails.length);ctx.strokeStyle=trail.result==='win'?'#8de1be':trail.color;ctx.lineWidth=trail===active?2.8:1.8;ctx.beginPath();trail.points.forEach(([x,y],n)=>n?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();});ctx.globalAlpha=1;
  const {x:tx,y:ty}=map.target,goal=ctx.createRadialGradient(tx,ty,22,tx,ty,70);goal.addColorStop(0,'rgba(233,182,127,.2)');goal.addColorStop(1,'rgba(233,182,127,0)');ctx.fillStyle=goal;circle(tx,ty,70);ctx.fill();ctx.strokeStyle='#e9b67f';ctx.lineWidth=2.7;circle(tx,ty,30);ctx.stroke();ctx.lineWidth=1;circle(tx,ty,39);ctx.stroke();ctx.fillStyle='#e9b67f';circle(tx,ty,3);ctx.fill();
  const [x,y]=map.spawn,a=angle()*Math.PI/180,len=55+power()*.19;ctx.strokeStyle='#80c9dc';ctx.lineWidth=2.2;ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();ctx.setLineDash([]);const end=[x+Math.cos(a)*len,y+Math.sin(a)*len];ctx.beginPath();ctx.moveTo(end[0]-Math.cos(a-.5)*12,end[1]-Math.sin(a-.5)*12);ctx.lineTo(...end);ctx.lineTo(end[0]-Math.cos(a+.5)*12,end[1]-Math.sin(a+.5)*12);ctx.stroke();ctx.fillStyle='#9cdeeb';circle(x,y,7);ctx.fill();ctx.strokeStyle='rgba(156,222,235,.4)';circle(x,y,17);ctx.stroke();
  ctx.font='18px sans-serif';ctx.fillStyle='#90b7cb';ctx.fillText(t('起点','START'),x-20,y+42);ctx.fillStyle='#e9b67f';ctx.fillText(t('终点','GOAL'),tx-20,ty+65);
  if(ball){ctx.shadowBlur=15;ctx.shadowColor=active.color;ctx.fillStyle=active.color;circle(ball.x,ball.y,6);ctx.fill();ctx.shadowBlur=0;}
 }
 $('orbit-settings').addEventListener('submit',e=>{e.preventDefault();make();});
 for(const id of ['stars','walls'])$(`orbit-${id}`).addEventListener('input',()=>{$(`orbit-${id}-value`).textContent=$(`orbit-${id}`).value;});
 $('orbit-angle').addEventListener('input',controls);$('orbit-power').addEventListener('input',controls);$('orbit-launch').addEventListener('click',shoot);
 $('orbit-retry').addEventListener('click',()=>{if(active&&ball)active.result='reset';stop();$('orbit-message').textContent=t('回到起点了，之前的轨迹保留。','Back at the start. Previous trails remain.');paint();});
 $('orbit-clear').addEventListener('click',()=>{trails=ball?[active]:[];if(!ball)active=null;paint();});
 function aim(e){const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/WORLD.width,r.height/WORLD.height),left=r.left+(r.width-WORLD.width*scale)/2,top=r.top+(r.height-WORLD.height*scale)/2,x=(e.clientX-left)/scale,y=(e.clientY-top)/scale;const dx=x-map.spawn[0],dy=y-map.spawn[1];$('orbit-angle').value=Math.max(-90,Math.min(90,Math.round(Math.atan2(dy,dx)*180/Math.PI)));$('orbit-power').value=Math.max(180,Math.min(620,Math.round(Math.hypot(dx,dy)/5)*5));controls();}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||ball)return;aiming=true;canvas.setPointerCapture(e.pointerId);aim(e);});canvas.addEventListener('pointermove',e=>{if(aiming)aim(e);});canvas.addEventListener('pointerup',()=>{aiming=false;});canvas.addEventListener('pointercancel',()=>{aiming=false;});
 canvas.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();shoot();}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(e.key==='ArrowUp'||e.key==='ArrowDown')$('orbit-power').value=power()+(e.key==='ArrowUp'?5:-5);else $('orbit-angle').value=angle()+(e.key==='ArrowLeft'?-1:1);controls();}});
 $('orbit-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('orbit-mapstage').requestFullscreen();}catch{$('orbit-message').textContent=t('此浏览器不支持全屏，可继续在地图中操作。','Fullscreen is unavailable in this browser. Keep playing here.');}});
 $('orbit-stage-launch').addEventListener('click',shoot);
 $('orbit-exit-fullscreen').addEventListener('click',()=>document.exitFullscreen().catch(()=>{}));
 window.addEventListener('pagehide',stop);make();
}

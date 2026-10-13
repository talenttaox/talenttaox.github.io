import {DT,orbitLevels,launch,stepOrbit,orbitStatus,orbitTarget,shadowVoxels,voxelFaces} from './game-model.js';
const app=document.querySelector('[data-game]');
if(app){
 const zh=document.body.dataset.lang==='zh',t=(a,b)=>zh?a:b,$=id=>document.getElementById(id);
 let level=0,won=false;
 const names=app.dataset.game==='orbit'?orbitLevels.map(l=>l.name):[['钥匙','Key'],['月牙','Crescent'],['闪电','Lightning']];
 function header(){ $('game-level').textContent=`LEVEL / 0${level+1} OF 03`;$('game-title').textContent=names[level][zh?0:1];$('game-next').hidden=true;won=false; }
 function win(message){if(won)return;won=true;$('game-message').textContent=message;$('game-next').textContent=level===2?t('再玩一次 ↻','Play again ↻'):t('下一关 →','Next level →');$('game-next').hidden=false;}
 const colors=()=>{const c=getComputedStyle(app);return{bg:c.getPropertyValue('--bg').trim(),ink:c.getPropertyValue('--ink').trim(),muted:c.getPropertyValue('--muted').trim(),line:c.getPropertyValue('--line').trim(),surface:c.getPropertyValue('--surface').trim(),accent:'#b57450'};};
 let init,paint;
 if(app.dataset.game==='orbit'){
  const canvas=$('orbit-canvas'),ctx=canvas.getContext('2d');let ball=null,trails=[],active=[],shots=0,frame=0,last=0,carry=0,target;
  const angle=()=>Number($('orbit-angle').value),power=()=>Number($('orbit-power').value);
  function controls(){ $('orbit-angle-value').textContent=`${angle()}°`;$('orbit-power-value').textContent=power();paint(); }
  function finish(status){cancelAnimationFrame(frame);frame=0;ball=null;$('orbit-launch').disabled=won;
   if(status==='win'){win(t(`命中了！这一关用了 ${shots} 次发射。`,`Captured! ${shots} launches this level.`));$('orbit-launch').disabled=true;}
   else $('game-message').textContent=status==='collision'?t('撞上了星体。试试更远一点的绕行角度。','Hit a star. Try an angle that passes farther away.'):status==='escape'?t('飞出边界了。调整方向或降低力度，再试一次。','Left the field. Adjust the angle or reduce the power.'):t('暂时没有命中。换个方向，再试一次。','No capture this time. Try another direction.');paint();
  }
  function tick(now){if(document.hidden){last=now;frame=requestAnimationFrame(tick);return;}carry+=Math.min(.1,(now-last)/1000);last=now;
   while(carry>=DT&&ball){ball=stepOrbit(ball,orbitLevels[level].stars);carry-=DT;active.push([ball.x,ball.y]);const status=orbitStatus(ball,orbitLevels[level],target);if(status!=='flying'){finish(status);return;}}
   paint();frame=requestAnimationFrame(tick);
  }
  function shoot(){if(ball||won)return;shots++;$('game-score').textContent=`${shots} ${t('次发射','LAUNCHES')}`;ball=launch(orbitLevels[level],angle(),power());active=[[ball.x,ball.y]];trails.push(active);if(trails.length>14)trails.shift();$('orbit-launch').disabled=true;$('game-message').textContent=t('飞行中…','In flight…');last=performance.now();carry=0;frame=requestAnimationFrame(tick);}
  paint=()=>{const c=colors(),l=orbitLevels[level];if(!target)return;ctx.clearRect(0,0,900,600);ctx.fillStyle=c.bg;ctx.fillRect(0,0,900,600);
   ctx.strokeStyle=c.line;ctx.lineWidth=.6;for(let x=30;x<900;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}for(let y=30;y<600;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
   trails.forEach((trail,i)=>{ctx.strokeStyle=i===trails.length-1?c.accent:c.muted;ctx.globalAlpha=i===trails.length-1?.8:.15+.3*i/Math.max(1,trails.length);ctx.lineWidth=i===trails.length-1?2:1.3;ctx.beginPath();trail.forEach(([x,y],n)=>n?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();});ctx.globalAlpha=1;
   for(const s of l.stars){ctx.strokeStyle=c.line;for(const r of [s.r+28,s.r+65]){ctx.beginPath();ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.stroke();}ctx.fillStyle=c.ink;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.fillStyle=c.bg;ctx.beginPath();ctx.arc(s.x-5,s.y-6,2.5,0,Math.PI*2);ctx.fill();}
   ctx.strokeStyle=c.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(target.x,target.y,20,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(target.x-7,target.y);ctx.lineTo(target.x+7,target.y);ctx.moveTo(target.x,target.y-7);ctx.lineTo(target.x,target.y+7);ctx.stroke();
   const [x,y]=l.spawn,a=angle()*Math.PI/180,len=35+power()/5;ctx.strokeStyle=c.accent;ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c.ink;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
   if(ball){ctx.fillStyle=c.accent;ctx.beginPath();ctx.arc(ball.x,ball.y,5,0,Math.PI*2);ctx.fill();}
  };
  init=()=>{cancelAnimationFrame(frame);frame=0;ball=null;trails=[];active=[];shots=0;header();target=orbitTarget(orbitLevels[level]);$('orbit-angle').value=-45;$('orbit-power').value=220;$('orbit-launch').disabled=false;$('game-score').textContent=t('0 次发射','0 LAUNCHES');$('game-message').textContent=t('让小球进入橙色圆环。先调方向和力度，再发射。','Send the ball into the amber ring. Adjust direction and power, then launch.');controls();};
  $('orbit-angle').addEventListener('input',controls);$('orbit-power').addEventListener('input',controls);$('orbit-launch').addEventListener('click',shoot);
  $('orbit-retry').addEventListener('click',()=>{if(won)return;cancelAnimationFrame(frame);frame=0;ball=null;$('orbit-launch').disabled=false;$('game-message').textContent=t('已回到发射点，旧轨迹保留。','Back at the launch point. Previous trails remain.');paint();});
  $('orbit-clear').addEventListener('click',()=>{trails=ball?[active]:[];paint();});
  let aiming=false;
  function aim(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*900/r.width,y=(e.clientY-r.top)*600/r.height,l=orbitLevels[level];const degrees=Math.atan2(y-l.spawn[1],x-l.spawn[0])*180/Math.PI;$('orbit-angle').value=Math.max(-80,Math.min(40,Math.round(degrees)));$('orbit-power').value=Math.max(140,Math.min(340,Math.round(Math.hypot(x-l.spawn[0],y-l.spawn[1])/5)*5));controls();}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||ball||won)return;aiming=true;canvas.setPointerCapture(e.pointerId);aim(e);});canvas.addEventListener('pointermove',e=>{if(aiming)aim(e);});canvas.addEventListener('pointerup',()=>{aiming=false;});canvas.addEventListener('pointercancel',()=>{aiming=false;});
  canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();shoot();}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();$('orbit-angle').value=angle()+(e.key==='ArrowUp'?-1:1);controls();}});
  window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));
 }else{
  const object=$('shadow-object'),wall=$('shadow-wall'),oc=object.getContext('2d'),wc=wall.getContext('2d');
  const stencil=document.createElement('canvas');stencil.width=96;stencil.height=96;const sc=stencil.getContext('2d',{willReadFrequently:true});let voxels=[],targetMask,outline=[],rx=38,ry=62;
  const alignment=[[-16,23],[31,-27],[-42,18]];
  const path=(ctx,points,scale,center)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(center+x*scale,center+y*scale):ctx.moveTo(center+x*scale,center+y*scale));ctx.closePath();};
  function mask(x,y){sc.clearRect(0,0,96,96);sc.fillStyle='#000';for(const f of voxelFaces(voxels,x,y)){path(sc,f.points,.34,48);sc.fill();}return sc.getImageData(0,0,96,96).data;}
  function score(current){let a=0,b=0,intersection=0;for(let i=3;i<current.length;i+=4){const x=current[i]>100,y=targetMask[i]>100;a+=x;b+=y;intersection+=x&&y;}return a+b?2*intersection/(a+b):0;}
  function targetOutline(){outline=[];for(let y=0;y<96;y++)for(let x=0;x<96;x++){if(targetMask[(y*96+x)*4+3]<=100)continue;for(const [dx,dy,edge] of [[0,-1,[x,y,x+1,y]],[1,0,[x+1,y,x+1,y+1]],[0,1,[x,y+1,x+1,y+1]],[-1,0,[x,y,x,y+1]]]){const X=x+dx,Y=y+dy;if(X<0||X>=96||Y<0||Y>=96||targetMask[(Y*96+X)*4+3]<=100)outline.push(edge);}}}
  paint=()=>{if(!voxels.length)return;const c=colors();oc.clearRect(0,0,480,480);wc.clearRect(0,0,480,480);oc.fillStyle=c.bg;oc.fillRect(0,0,480,480);wc.fillStyle=c.surface;wc.fillRect(0,0,480,480);
   oc.strokeStyle=c.line;oc.lineWidth=1;oc.beginPath();oc.ellipse(240,370,155,32,0,0,Math.PI*2);oc.stroke();
   const x=rx-alignment[level][0],y=ry-alignment[level][1];
   for(const f of voxelFaces(voxels,x,y,true)){path(oc,f.points,1.35,240);oc.fillStyle=c.ink;oc.globalAlpha=.35+Math.max(0,Math.min(.55,(f.depth+170)/600));oc.fill();oc.globalAlpha=1;oc.strokeStyle=c.bg;oc.lineWidth=.35;oc.stroke();}
   wc.fillStyle=c.muted;wc.globalAlpha=.2;for(const f of voxelFaces(voxels,x,y)){path(wc,f.points,1.35,240);wc.fill();}wc.globalAlpha=1;
   wc.strokeStyle=c.accent;wc.lineWidth=1.6;wc.beginPath();const k=1.35/.34;for(const [x1,y1,x2,y2] of outline){wc.moveTo(240+(x1-48)*k,240+(y1-48)*k);wc.lineTo(240+(x2-48)*k,240+(y2-48)*k);}wc.stroke();
   const similarity=score(mask(x,y));$('game-score').textContent=`${Math.round(similarity*100)}% ${t('重合','MATCH')}`;
   if(similarity>=.88)win(t('对上了！换个角度，碎片就有了形状。','Aligned! A different angle gives the fragments a shape.'));
   $('shadow-x').value=rx;$('shadow-y').value=ry;$('shadow-x-value').textContent=`${Math.round(rx)}°`;$('shadow-y-value').textContent=`${Math.round(ry)}°`;
  };
  init=()=>{header();voxels=shadowVoxels(level);targetMask=mask(0,0);targetOutline();rx=[38,-42,55][level];ry=[62,48,-58][level];$('game-message').textContent=t('让灰色投影与橙色轮廓重合。拖动物体，或用滑块慢慢调整。','Match the grey shadow to the amber outline. Drag the object or adjust the sliders.');paint();};
  const wrap=n=>((n+180)%360+360)%360-180;
  $('shadow-x').addEventListener('input',e=>{rx=Number(e.target.value);paint();});$('shadow-y').addEventListener('input',e=>{ry=Number(e.target.value);paint();});
  $('shadow-shuffle').addEventListener('click',()=>{rx=25+Math.random()*70;ry=35+Math.random()*65;paint();});
  let pointer=null;
  object.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};object.setPointerCapture(e.pointerId);});object.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;ry=wrap(ry+(e.clientX-pointer.x)*.5);rx=wrap(rx-(e.clientY-pointer.y)*.5);pointer.x=e.clientX;pointer.y=e.clientY;paint();});object.addEventListener('pointerup',()=>{pointer=null;});object.addEventListener('pointercancel',()=>{pointer=null;});
  object.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();rx=wrap(rx+(e.key==='ArrowUp'?-2:e.key==='ArrowDown'?2:0));ry=wrap(ry+(e.key==='ArrowLeft'?-2:e.key==='ArrowRight'?2:0));paint();});
 }
 $('game-next').addEventListener('click',()=>{level=(level+1)%3;init();});$('game-restart').addEventListener('click',()=>{level=0;init();});
 new MutationObserver(()=>paint()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});init();
}

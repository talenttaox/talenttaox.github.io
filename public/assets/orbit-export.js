import {FIELD,WORLD,parseSeed,random} from './orbit-model.js';
import {deflectionSummary,scoreFlight} from './orbit-score.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=n=>Number(n).toFixed(2);
export function trajectorySVG(map,trails,{zh=true,pixelWidth=1800}={}){
 const t=(a,b)=>zh?a:b,footer=400+Math.ceil(Math.min(trails.length,16)/2)*125,height=WORLD.height+footer;
 const text=(x,y,value,size=46,color='#b4c9d9')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="Arial, sans-serif">${esc(value)}</text>`;
 const circle=(x,y,r,attrs)=>`<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" ${attrs}/>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${Math.round(height*pixelWidth/WORLD.width)}" viewBox="0 0 ${WORLD.width} ${height}"><defs><linearGradient id="sky" x2="1" y2="1"><stop stop-color="#101c2b"/><stop offset="1" stop-color="#17202e"/></linearGradient>`;
 for(let i=0;i<map.stars.length;i++){const s=map.stars[i],hole=s.kind!=='star',white=s.kind==='whitehole';svg+=`<radialGradient id="glow-${i}"><stop stop-color="${white?'#fff2b3':hole?'#b891ef':'#6ba9bf'}" stop-opacity=".2"/><stop offset="1" stop-color="#6ba9bf" stop-opacity="0"/></radialGradient><radialGradient id="body-${i}" cx="35%" cy="35%"><stop stop-color="#91b8cc"/><stop offset="1" stop-color="#172d41"/></radialGradient>`;}
 svg+=`</defs><rect width="${WORLD.width}" height="${height}" fill="url(#sky)"/><g stroke="#9ebdd5" stroke-opacity=".055" stroke-width="3">`;
 for(let x=200;x<WORLD.width;x+=200)svg+=`<path d="M${x} 0V${WORLD.height}"/>`;for(let y=200;y<WORLD.height;y+=200)svg+=`<path d="M0 ${y}H${WORLD.width}"/>`;
 svg+=`</g><rect x="${FIELD.x}" y="${FIELD.y}" width="${FIELD.width}" height="${FIELD.height}" fill="#70a1c0" fill-opacity=".025" stroke="#98c1d7" stroke-opacity=".22" stroke-width="3" stroke-dasharray="25 40"/>`;
 const rnd=random(parseSeed(map.seed).words);for(let i=0;i<200;i++)svg+=circle(FIELD.x+rnd()*FIELD.width,FIELD.y+rnd()*FIELD.height,i%7===0?7:4,'fill="#b4cde0" opacity=".2"');
 map.stars.forEach((s,i)=>{const hole=s.kind!=='star',white=s.kind==='whitehole',aura=Math.cbrt(s.mass)*(hole?.55:.32);svg+=circle(s.x,s.y,aura,`fill="url(#glow-${i})"`);for(const r of [aura*.55,aura*.9])svg+=circle(s.x,s.y,r,`fill="none" stroke="${white?'#fff2b3':hole?'#b796e1':'#75b6cb'}" stroke-opacity=".4" stroke-width="3"`);if(hole){svg+=`<ellipse cx="${num(s.x)}" cy="${num(s.y)}" rx="22" ry="9" transform="rotate(-26 ${num(s.x)} ${num(s.y)})" fill="none" stroke="${white?'#fff2b3':'#bc9ddd'}" stroke-width="4"/>`+circle(s.x,s.y,s.r,`fill="${white?'#fffbe3':'#030509'}"`);}else svg+=circle(s.x,s.y,s.r,`fill="url(#body-${i})" stroke="#9acadc" stroke-width="2"`);});
 const records=[];
 trails.forEach((trail,i)=>{const summary=deflectionSummary(trail.stats),score=scoreFlight(trail.stats,trail.result),color=trail.result==='win'?'#8de1be':trail.color;svg+=`<path d="${trail.points.map(([x,y],n)=>`${n?'L':'M'}${num(x)},${num(y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
  summary.events.forEach((e,n)=>{svg+=circle(e.x,e.y,22,`fill="#14263a" stroke="${color}" stroke-width="4"`)+text(e.x+30,e.y-20,`${n+1} · ${Math.round(e.degrees)}°`,36,color);});
  const status=t({win:'成功',flying:'飞行中',reset:'已重试',star:'撞星体',whitehole:'碰到白洞',blackhole:'被黑洞捕获',escape:'越界',timeout:'超时'}[trail.result]||'结束',{win:'Captured',flying:'Flying',reset:'Reset',star:'Hit a star',whitehole:'Hit a white hole',blackhole:'Captured by a black hole',escape:'Out of bounds',timeout:'Timed out'}[trail.result]||'Ended');
  records.push({group:trail.group,experiment:trail.experiment,center:trail.center,label:status,number:trail.number,result:trail.result,initialSpeed:trail.initialSpeed,initialAngle:trail.initialAngle,time:trail.stats.time,score,events:summary.events});
 });
 for(const [x,y,color,label] of [[...map.spawn,'#9cdeeb',t('起点','START')],[map.target.x,map.target.y,'#e9b67f',t('终点','GOAL')]])svg+=circle(x,y,40,`fill="#14263a" stroke="${color}" stroke-width="6"`)+text(x-48,y+105,label,46,color);
 svg+=`<rect y="${WORLD.height}" width="${WORLD.width}" height="${footer}" fill="#0c1621"/>`;
 // A bounded visible legend keeps PNG dimensions reasonable; metadata retains every flight.
 svg+=text(100,WORLD.height+90,t('轨道捕手 · 完整地图与轨迹','Orbit catcher · Full map and trajectories'),56,'#e2edf4')+text(100,WORLD.height+175,`SEED / ${map.seed}`,40);
 if(trails.length>16)svg+=text(4200,WORLD.height+90,t(`共 ${trails.length} 条轨迹 · 下列为最新 16 条详情`,`${trails.length} trajectories · Latest 16 records below`),36);
 trails.slice(-16).forEach((trail,i)=>{const record=records[records.length-Math.min(trails.length,16)+i],color=trail.result==='win'?'#8de1be':trail.color,x=100+(i%2)*3500,y=WORLD.height+290+Math.floor(i/2)*125;svg+=text(x,y,`#${trail.number} · ${record.score.total} ${t('分','pts')} · ${record.label}`,44,color)+text(x,y+58,t(`方向 ${record.initialAngle.toFixed(1)}° · 初速 ${record.initialSpeed} · ${record.time.toFixed(2)} 秒 · ${record.score.count} 次偏转 / ${record.score.degrees.toFixed(1)}°`,`Angle ${record.initialAngle.toFixed(1)}° · speed ${record.initialSpeed} · ${record.time.toFixed(2)} s · ${record.score.count} deflections / ${record.score.degrees.toFixed(1)}°`),36);});
 return svg+`<metadata>${esc(JSON.stringify({seed:map.seed,scoreVersion:1,flights:records}))}</metadata></svg>`;
}
export async function downloadTrajectory(map,trails,{format='svg',zh=true,choice='latest'}={}){
 const svg=trajectorySVG(map,trails,{zh,pixelWidth:format==='png'?3600:1800});let blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
 if(format==='png'){const url=URL.createObjectURL(blob);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('PNG export failed')),'image/png'));}finally{URL.revokeObjectURL(url);}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`orbit-${map.seed}-${choice}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

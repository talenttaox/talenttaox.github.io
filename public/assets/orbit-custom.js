import {FIELD,WORLD} from './orbit-model.js';
const kinds=['star','blackhole','whitehole'];
export function validateCustom(map,maxStars=20){
 const errors=[],stars=map?.stars;if(!Array.isArray(stars)||stars.length>56)return ['shape'];
 if(map.width!==WORLD.width||map.height!==WORLD.height||map.spawn?.[0]!==FIELD.x+160||map.spawn?.[1]!==FIELD.y+1200||map.target?.x!==FIELD.x+4640||map.target?.y!==FIELD.y+1200)errors.push('endpoints');
 const pair=map.dipole,paired=new Set(pair||[]);
 if(pair&&(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(i=>!Number.isInteger(i)||i<0||i>=stars.length)))return ['dipole'];
 for(const [kind,max] of [['star',maxStars],['blackhole',8],['whitehole',8]])if(stars.filter(s=>s.kind===kind).length>max)errors.push('count');
 for(const [i,s] of stars.entries()){
  if(!s||!kinds.includes(s.kind)||!['x','y','r','mass'].every(k=>Number.isFinite(s[k]))){errors.push('shape');continue;}
  const hole=s.kind!=='star';if(s.r<(hole?3:10)||s.r>(hole?5:24)||!Number.isInteger(s.mass))errors.push('size');
  if(s.kind==='star'&&s.mass!==Math.round(60000*s.r*s.r)||s.kind==='blackhole'&&(s.mass<80000000||s.mass>120000000)||s.kind==='whitehole'&&!paired.has(i)&&(s.mass<30000000||s.mass>40000000))errors.push('strength');
  const central=s.kind==='whitehole';if(s.x<FIELD.x+(central?1440:650)||s.x>FIELD.x+(central?3360:4150)||s.y<FIELD.y+230||s.y>FIELD.y+2170)errors.push('position');
 }
 if(errors.includes('shape'))return [...new Set(errors)];
 if(pair){const [b,w]=pair.map(i=>stars[i]);if(b.kind!=='blackhole'||w.kind!=='whitehole'||b.r!==w.r||w.mass!==Math.floor(b.mass*.5)||b.x<FIELD.x+1480||b.x>FIELD.x+3320||b.y<FIELD.y+330||b.y>FIELD.y+2070)errors.push('dipole');const d=Math.hypot(b.x-w.x,b.y-w.y);if(d<24-1e-8||d>40+1e-8)errors.push('dipole');}
 for(let i=0;i<stars.length;i++)for(let j=i+1;j<stars.length;j++){if(paired.has(i)&&paired.has(j))continue;const a=stars[i],b=stars[j];if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)-a.r-b.r<240-1e-8)errors.push('spacing');}
 return [...new Set(errors)];
}
export function customWords(code){let h=2166136261;for(const c of code){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return [h>>>0,(h^0x9e3779b9)>>>0,(h^0x85ebca6b)>>>0,(h^0xc2b2ae35)>>>0];}
export function encodeCustom(map){const errors=validateCustom(map);if(errors.length)throw Error(errors.join(','));const data=[1,map.stars.map(s=>[kinds.indexOf(s.kind),s.x,s.y,s.r,s.mass]),map.dipole||null];return 'C1-'+btoa(JSON.stringify(data)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function decodeCustom(code){
 if(typeof code!=='string'||code.length>20000||!/^C1-[A-Za-z0-9_-]+$/.test(code))throw Error('Invalid custom code');
 let data;try{data=JSON.parse(atob(code.slice(3).replaceAll('-','+').replaceAll('_','/')));}catch{throw Error('Invalid custom code');}
 if(!Array.isArray(data)||data.length!==3||data[0]!==1||!Array.isArray(data[1])||data[1].length>56||data[1].some(row=>!Array.isArray(row)||row.length!==5||!Number.isInteger(row[0])||!kinds[row[0]]))throw Error('Invalid custom map');
 const map={spawn:[FIELD.x+160,FIELD.y+1200],target:{x:FIELD.x+4640,y:FIELD.y+1200},stars:data[1].map(([kind,x,y,r,mass])=>({kind:kinds[kind],x,y,r,mass})),width:WORLD.width,height:WORLD.height};if(data[2]!==null)map.dipole=data[2];const errors=validateCustom(map,40);if(errors.length)throw Error(errors.join(','));map.seed='C1-'+btoa(JSON.stringify(data)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return map;
}
export function customConfig(code){const map=decodeCustom(code);return{seed:map.seed,starCount:map.stars.filter(s=>s.kind==='star').length,blackHoleCount:map.stars.filter(s=>s.kind==='blackhole').length,whiteHoleCount:map.stars.filter(s=>s.kind==='whitehole').length,dipole:!!map.dipole,words:customWords(map.seed)};}

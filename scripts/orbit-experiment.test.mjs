import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtendedSeed,parseSeed,generateMap,step,status,FIELD} from '../public/assets/orbit-model.js';
import {perturbations} from '../public/assets/orbit-experiment.js';
import {trajectorySVG} from '../public/assets/orbit-export.js';
import {createFlightStats} from '../public/assets/orbit-score.js';
test('New seeds replay white holes and a balanced dipole with correct counts and boundaries',()=>{
 for(let n=0;n<100;n++){
  const seed=createExtendedSeed(40,n%9,n%9,true,n.toString(16).padStart(32,'0')),map=generateMap({seed}),config=parseSeed(seed);
  assert.deepEqual(generateMap({seed:seed.toLowerCase()}),map);
  for(const [kind,count] of [['star',40],['blackhole',config.blackHoleCount],['whitehole',config.whiteHoleCount]])assert.equal(map.stars.filter(s=>s.kind===kind).length,count);
  const [black,white]=map.dipole.map(i=>map.stars[i]);assert.equal(black.mass,white.mass);assert.equal(black.r,white.r);const d=Math.hypot(black.x-white.x,black.y-white.y);assert.ok(d>=60&&d<=120);
  for(const s of map.stars)assert.ok(s.x-s.r>FIELD.x&&s.x+s.r<FIELD.x+FIELD.width&&s.y-s.r>FIELD.y&&s.y+s.r<FIELD.y+FIELD.height);
 }
 assert.throws(()=>parseSeed('O3-01-0-1-1-'+'0'.repeat(32)));assert.throws(()=>createExtendedSeed(0,0,9,false,'0'.repeat(32)));
});
test('White holes exert the same force magnitude in the opposite direction',()=>{
 const body={x:2000,y:2000,r:4,mass:100000000},b={x:1800,y:2000,vx:0,vy:0,time:0};
 const black=step(b,[{...body,kind:'blackhole'}],1e-6),white=step(b,[{...body,kind:'whitehole'}],1e-6);
 assert.ok(black.vx>0&&white.vx<0);assert.ok(Math.abs(black.vx+white.vx)<1e-10);
 assert.equal(status({...b,x:2000},{stars:[{...body,kind:'whitehole'}]}),'whitehole');
});
test('Butterfly samples stay distinct, exclude the centre and preserve the other parameter',()=>{
 for(const angle of [-180,0,180]){const samples=perturbations('angle',angle,720);assert.equal(samples.length,10);assert.equal(new Set(samples.map(s=>s.angle)).size,10);for(const s of samples){assert.equal(s.power,720);assert.ok(s.angle>=-180&&s.angle<180);assert.notEqual(s.angle,angle===180?-180:angle);}}
 for(const power of [0,1,4,500,996,999,1000]){const samples=perturbations('power',12.3,power);assert.equal(samples.length,10);assert.equal(new Set(samples.map(s=>s.power)).size,10);for(const s of samples){assert.equal(s.angle,12.3);assert.ok(s.power>=0&&s.power<=1000&&s.power!==power);}}
 assert.deepEqual(perturbations('power',0,500).map(s=>s.power),[495,496,497,498,499,501,502,503,504,505]);
});
test('Experiment exports preserve all ten immutable sample parameters and white hole styling',()=>{
 const map=generateMap({seed:createExtendedSeed(0,1,1,true,'0'.repeat(32))});const trails=perturbations('angle',0,720).map((s,i)=>({number:i+1,group:1,experiment:'angle',center:{angle:0,power:720},initialAngle:s.angle,initialSpeed:s.power,color:'#fff',result:'flying',stats:createFlightStats(s.power),points:[map.spawn]}));
 const svg=trajectorySVG(map,trails);assert.ok(svg.includes('#fffbe3'));const metadata=JSON.parse(svg.match(/<metadata>(.*?)<\/metadata>/s)[1].replaceAll('&quot;','"'));assert.equal(metadata.flights.length,10);assert.equal(metadata.flights[0].experiment,'angle');assert.deepEqual(metadata.flights[0].center,{angle:0,power:720});
});

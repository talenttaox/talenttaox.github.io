import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed,generateMap} from '../public/assets/orbit-model.js';
import {createFlightStats,trackDeflection,finalizeStats,deflectionSummary,scoreFlight} from '../public/assets/orbit-score.js';
import {trajectorySVG} from '../public/assets/orbit-export.js';
const star={x:3600,y:2400,r:20,mass:24000000,kind:'star'};
const circular=t=>({x:3600+120*Math.cos(t),y:2400+120*Math.sin(t),vx:-120*Math.sin(t),vy:120*Math.cos(t),time:t});
function encounter(duration,hz){const stats=createFlightStats(120);let previous=circular(0);for(let i=1;i<=duration*hz;i++){const ball=circular(i/hz);trackDeflection(stats,previous,ball,[star]);previous=ball;}finalizeStats(stats);return stats;}
test('A continuous encounter counts once; short turns earn no reward',()=>{
 assert.equal(deflectionSummary(encounter(.1,240)).count,0);const s=encounter(8,240);assert.equal(deflectionSummary(s).count,1);assert.ok(deflectionSummary(s).degrees>450);
});
test('Direction sampling frequency does not change deflection count or angle',()=>{
 const a=deflectionSummary(encounter(1,240)),b=deflectionSummary(encounter(1,60));assert.equal(a.count,b.count);assert.ok(Math.abs(a.degrees-b.degrees)<1e-8);
});
test('Leaving and re-entering a body can create another encounter, but outer turns never count',()=>{
 const s=createFlightStats(120);let p=circular(0);for(let i=1;i<=240;i++){const b=circular(i/240);trackDeflection(s,p,b,[star]);p=b;}
 const outside={x:900,y:2400,vx:0,vy:120,time:1.3};trackDeflection(s,p,outside,[star]);assert.equal(s.events.length,1);
 let b={...circular(0),time:1.4};trackDeflection(s,outside,b,[star]);p=b;for(let i=1;i<=240;i++){b={...circular(i/240),time:1.4+i/240};trackDeflection(s,p,b,[star]);p=b;}finalizeStats(s);assert.equal(s.events.length,2);
 const outer=createFlightStats(100),hole={x:1850,y:2400,r:4,mass:100000000,kind:'blackhole'};
 for(let i=1;i<=60;i++){const previous={x:1100,y:2400,vx:Math.cos((i-1)*.02)*100,vy:Math.sin((i-1)*.02)*100,time:(i-1)/60},ball={...previous,vx:Math.cos(i*.02)*100,vy:Math.sin(i*.02)*100,time:i/60};trackDeflection(outer,previous,ball,[hole]);}finalizeStats(outer);assert.equal(deflectionSummary(outer).count,0);
});
test('Only a capture scores; slow launches, long flights and turns increase points within their caps',()=>{
 const s=createFlightStats(500);s.time=10;assert.equal(scoreFlight(s,'escape').total,0);assert.equal(scoreFlight(s,'win').total,263);
 const slower={...s,initialSpeed:200,time:20};assert.ok(scoreFlight(slower,'win').total>scoreFlight(s,'win').total);
 const maximum={...s,initialSpeed:0,time:40,events:Array.from({length:8},()=>({degrees:100}))};assert.equal(scoreFlight(maximum,'win').total,1000);assert.equal(scoreFlight({...maximum,time:100},'win').total,1000);
 assert.ok(scoreFlight({...s,events:[{degrees:50}]},'win').total>scoreFlight(s,'win').total);
});
test('Exports keep full world bounds and immutable flight metadata with all attempts',()=>{
 const map=generateMap({seed:createSeed(0,0,'0'.repeat(32))}),stats=createFlightStats(537);stats.time=12.5;
 const trail={number:1,initialSpeed:537,initialAngle:1.2,color:'#80c9dc',result:'win',points:[map.spawn,[5840,2400]],stats};
 const svg=trajectorySVG(map,[trail]);assert.ok(svg.includes('viewBox="0 0 7200 5325"'));assert.ok(svg.includes(map.seed));assert.ok(svg.includes('初速 537'));assert.ok(svg.includes('&quot;initialAngle&quot;:1.2'));assert.ok(svg.includes('M1360.00,2400.00 L5840.00,2400.00'));
 const many=trajectorySVG(map,Array.from({length:20},(_,i)=>({...trail,number:i+1})));assert.equal((many.match(/&quot;initialSpeed&quot;:537/g)||[]).length,20);assert.ok(many.includes('共 20 条轨迹'));
});
test('Marker visibility is independent of scoring; butterfly exports always omit markers',()=>{
 const map=generateMap({seed:createSeed(0,0,'0'.repeat(32))}),stats=createFlightStats(500);stats.time=10;stats.events=[{star:0,degrees:30,x:3000,y:2500,time:2}];
 const trail={number:1,initialSpeed:500,initialAngle:0,color:'#80c9dc',result:'win',points:[map.spawn,[5840,2400]],stats};
 assert.ok(trajectorySVG(map,[trail]).includes('data-deflection-marker'));
 const off=trajectorySVG(map,[trail],{showDeflections:false});assert.equal(off.includes('data-deflection-marker'),false);assert.ok(off.includes('&quot;degrees&quot;:30'));
 for(const experiment of ['angle','power'])assert.equal(trajectorySVG(map,[{...trail,experiment}],{showDeflections:true}).includes('data-deflection-marker'),false);
});

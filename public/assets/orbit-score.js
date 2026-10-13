import {FIELD} from './orbit-model.js';
const radians=Math.PI/180;
export function createFlightStats(initialSpeed){return{initialSpeed,time:0,events:[],current:null};}
function inField(p){return p.x>=FIELD.x&&p.x<=FIELD.x+FIELD.width&&p.y>=FIELD.y&&p.y<=FIELD.y+FIELD.height;}
function influence(ball,star){
 const dx=star.x-ball.x,dy=star.y-ball.y,d=Math.hypot(dx,dy),limit=star.kind!=='star'?800:600;
 if(d>limit)return 0;const soft=star.kind!=='star'?4:14,f=star.mass/Math.pow(dx*dx+dy*dy+soft*soft,1.5),ax=dx*f,ay=dy*f,speed2=ball.vx*ball.vx+ball.vy*ball.vy;
 if(Math.hypot(ax,ay)<35||speed2<25)return 0;
 const angular=Math.abs(ball.vx*ay-ball.vy*ax)/speed2;return angular>=.005?angular:0;
}
function closeEvent(stats){const e=stats.current;if(e&&e.degrees>=10)stats.events.push({star:e.star,degrees:e.degrees,x:e.x,y:e.y,time:e.time});stats.current=null;}
export function trackDeflection(stats,previous,ball,stars){
 stats.time=ball.time;let chosen=-1,strength=0;
 if(inField(previous)&&inField(ball)&&Math.hypot(previous.vx,previous.vy)>=5&&Math.hypot(ball.vx,ball.vy)>=5){
  for(let i=0;i<stars.length;i++){const value=influence(ball,stars[i]);if(value>strength){chosen=i;strength=value;}}
  // Hysteresis prevents nearby bodies from alternating on every tiny integration step.
  if(stats.current&&chosen!==stats.current.star){const old=stars[stats.current.star]?influence(ball,stars[stats.current.star]):0;if(old>0&&strength<old*1.4){chosen=stats.current.star;strength=old;}}
 }
 if(chosen<0){if(stats.current){stats.current.away+=ball.time-previous.time;if(stats.current.away>=.15)closeEvent(stats);}return;}
 if(stats.current&&stats.current.star!==chosen)closeEvent(stats);
 if(!stats.current)stats.current={star:chosen,degrees:0,away:0,peak:0,x:ball.x,y:ball.y,time:ball.time};
 const event=stats.current;event.away=0;
 const delta=Math.abs(Math.atan2(previous.vx*ball.vy-previous.vy*ball.vx,previous.vx*ball.vx+previous.vy*ball.vy))/radians;
 if(delta>1e-7){event.degrees+=delta;if(delta>event.peak){event.peak=delta;event.x=ball.x;event.y=ball.y;event.time=ball.time;}}
}
export function finalizeStats(stats){closeEvent(stats);return stats;}
export function deflectionSummary(stats){const events=[...stats.events];if(stats.current?.degrees>=10)events.push(stats.current);return{count:events.length,degrees:events.reduce((sum,e)=>sum+e.degrees,0),events};}
export function scoreFlight(stats,result){
 const {count,degrees}=deflectionSummary(stats),clamp=(v,max)=>Math.max(0,Math.min(max,v));
 const parts=result==='win'?{arrival:100,speed:Math.round(250*(1-clamp(stats.initialSpeed,1000)/1000)),time:Math.round(150*clamp(stats.time,40)/40),count:Math.min(count,5)*40,angle:Math.round(300*clamp(degrees,360)/360)}:{arrival:0,speed:0,time:0,count:0,angle:0};
 return{total:Object.values(parts).reduce((sum,v)=>sum+v,0),parts,count,degrees};
}

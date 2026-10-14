// Work in integer slider ticks so ±0.1° never accumulates floating-point error.
export const autoplayKey=(angle,power)=>`${Math.round(angle*10)===1800?-1800:Math.round(angle*10)}:${power}`;
function neighbours(angle,power){const a=Math.round(angle*10);return [-1,1].flatMap(da=>[-1,1].map(dp=>({angle:(a+da)/10,power:power+dp}))).filter(p=>p.angle>=-180&&p.angle<=180&&p.power>=0&&p.power<=1000);}
export function nextAutoplay(angle,power,used,random=Math.random){
 const choices=neighbours(angle,power).filter(p=>!used.has(autoplayKey(p.angle,p.power)));if(!choices.length)return null;
 // Prefer open neighbours, avoiding early dead ends without revisiting a launch.
 const room=p=>neighbours(p.angle,p.power).filter(q=>!used.has(autoplayKey(q.angle,q.power))&&autoplayKey(q.angle,q.power)!==autoplayKey(angle,power)).length;
 const most=Math.max(...choices.map(room)),open=choices.filter(p=>room(p)===most);return open[Math.min(open.length-1,Math.floor(random()*open.length))];
}

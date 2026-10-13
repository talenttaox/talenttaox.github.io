// Ten neighbours plus the unchanged centre. Angles wrap; powers shift at legal limits.
export function perturbations(type,angle,power){
 const offsets=[-5,-4,-3,-2,-1,1,2,3,4,5];
 if(type==='angle'){const samples=offsets.map(n=>({angle:Math.round((((angle+n*.1+180)%360+360)%360-180)*10)/10,power}));samples.splice(5,0,{angle,power,baseline:true});return samples;}
 let values=offsets.map(n=>power+n).filter(n=>n>=0&&n<=1000);
 for(let distance=6;values.length<10;distance++)for(const value of [power-distance,power+distance])if(value>=0&&value<=1000&&values.length<10)values.push(value);
 return [...values,power].sort((a,b)=>a-b).map(value=>({angle,power:value,...(value===power?{baseline:true}:{})}));
}

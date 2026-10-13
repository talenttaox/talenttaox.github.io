export function rotate([x,y,z],rx,ry){const a=rx*Math.PI/180,b=ry*Math.PI/180,Y=y*Math.cos(a)-z*Math.sin(a),Z=y*Math.sin(a)+z*Math.cos(a);return[x*Math.cos(b)+Z*Math.sin(b),Y,-x*Math.sin(b)+Z*Math.cos(b)];}
export function shadowVoxels(level){const out=[];for(let y=-12;y<=12;y++)for(let x=-12;x<=12;x++){
 const ring=Math.hypot(x+4,y)<6&&Math.hypot(x+4,y)>3;
 const key=ring||(x>=1&&x<=11&&Math.abs(y)<=1)||(x>=7&&x<=9&&y>=0&&y<=4);
 const moon=Math.hypot(x+1,y)<10&&Math.hypot(x-4,y+2)>8;
 const bolt=(y<=0&&x>=-2&&x<=7&&x+y>=-4&&x+y<=5)||(y>0&&x>=-7&&x<=2&&x+y>=-5&&x+y<=4);
 if([key,moon,bolt][level])out.push([x*10,y*10,Math.sin(x*17+y*31+level*7)*95]);
 }return out;}
export const cubeCorners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
export const cubeFaces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];
export function voxelFaces(voxels,rx,ry,camera=false){return voxels.flatMap(v=>{const corners=cubeCorners.map(c=>rotate(v.map((n,i)=>n+c[i]*5),rx,ry)).map(p=>camera?rotate(p,-16,-24):p);return cubeFaces.map(face=>({points:face.map(i=>corners[i]),depth:face.reduce((s,i)=>s+corners[i][2],0)/4}));}).sort((a,b)=>a.depth-b.depth);}

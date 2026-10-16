// Build-time clearance measurement of the actual exported, skinned wardrobe.
import {readGlb,posedRig} from '../test/helpers/glb-pose.js';
const {json}=readGlb('mannequin.glb'),rig=posedRig('sleep');
const points=[];
for(const node of json.nodes){
  if(node.mesh===undefined||node.skin===undefined)continue;
  if(node.name!=='neutral-skinned-body'&&!/^look-(top|bottom|footwear)-/.test(node.name))continue;
  for(const p of rig.vertices(node.name)){
    const x=p.z+1.84,y=p.x+.8,z=p.y+.95;
    if(x>=1.29&&x<=2.82&&z>.78)points.push([x,y,z]);
  }
}
const height=[];
for(let ix=0;ix<=40;ix++){
  const row=[],x=1.29+1.53*ix/40;
  for(let iy=0;iy<=28;iy++){
    const y=iy<3?[.16,.18,.205][iy]:.25+(1.395-.25)*(iy-3)/25;
    let z=.783;
    for(const [px,py,pz] of points){
      // A rounded, gently tensioned cloth envelope, with enough clearance for
      // vertex interpolation and the small woven folds added in Blender.
      const dx=(x-px)/.40,dy=(y-py)/.30;
      z=Math.max(z,pz+.022-.37*(dx*dx+dy*dy));
    }
    row.push(z);
  }
  height.push(row);
}
process.stdout.write(JSON.stringify(height));

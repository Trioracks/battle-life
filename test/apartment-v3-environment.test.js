import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
import {readGlb,posedRig} from './helpers/glb-pose.js';
const config=()=>JSON.parse(fs.readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url),'utf8'));

function roomBrightness(file){
  const b=fs.readFileSync(new URL('../assets/apartment/v3/'+file,import.meta.url)),w=b.readUInt32BE(16),h=b.readUInt32BE(20),channels=b[25]===6?4:3;
  assert.equal(b[24],8,'8-bit render');const chunks=[];
  for(let at=8;at<b.length;){const n=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);if(type==='IDAT')chunks.push(b.subarray(at+8,at+8+n));at+=n+12;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=w*channels;let previous=Buffer.alloc(stride),offset=0;
  const sums=[0,0],count=[0,0],paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
  for(let y=0;y<h;y++){
    const filter=raw[offset++],row=Buffer.allocUnsafe(stride);
    for(let x=0;x<stride;x++){
      const a=x>=channels?row[x-channels]:0,up=previous[x],corner=x>=channels?previous[x-channels]:0;
      row[x]=(raw[offset++]+(filter===1?a:filter===2?up:filter===3?Math.floor((a+up)/2):filter===4?paeth(a,up,corner):0))&255;
    }
    if(y>h*.27&&y<h*.69&&y%8===0)for(let x=0;x<w;x+=8){
      const worldX=(x/w-.5)*16.8+.85,room=worldX>-.3&&worldX<.3?-1:worldX>=-6.2&&worldX<-.3?0:worldX>.3&&worldX<=6.2?1:-1;
      if(room>=0){const i=x*channels;sums[room]+=.2126*row[i]+.7152*row[i+1]+.0722*row[i+2];count[room]++;}
    }
    previous=row;
  }
  return sums.map((n,i)=>n/count[i]);
}

test('the exported cutaway camera is horizontally side-on with a shallow downward view',()=>{
  const {position:p,target:t}=config().camera;
  assert.ok(Math.abs(p[0]-t[0])<1e-6,'horizontal wall and floor lines must remain level');
  const pitch=Math.atan2(p[1]-t[1],Math.hypot(p[0]-t[0],p[2]-t[2]))*180/Math.PI;
  assert.ok(Math.abs(pitch-8)<.1,'approved camera pitch is eight degrees');
});

test('the seated actor shares actual chair geometry with four floor-supported legs',()=>{
  const {json:g}=readGlb('interaction.glb');
  const chair=g.nodes.find(n=>n.name==='chair-root');assert.ok(chair,'chair must be rendered in 3D with the actor');
  const parts=chair.children.map(i=>g.nodes[i]);
  for(const name of ['chair-seat','chair-pad','chair-backrest'])assert.ok(parts.some(n=>n.name===name),name);
  const legs=parts.filter(n=>n.name.startsWith('chair-leg'));assert.equal(legs.length,4);
  for(const leg of legs){const a=g.accessors[g.meshes[leg.mesh].primitives[0].attributes.POSITION];assert.ok(Math.abs(leg.translation[1]+a.min[1])<.008,'chair leg rests on floor');}
  const pad=parts.find(n=>n.name==='chair-pad'),a=g.accessors[g.meshes[pad.mesh].primitives[0].attributes.POSITION];
  assert.ok(Math.abs(pad.translation[1]+a.max[1]-.445)<.002,'45cm seat fits the existing seated hips without raising planted feet');
  assert.ok(!g.nodes.some(n=>n.name==='depth-chair-back'),'a painted chair back must not mask the seated actor');
});

test('the actual seated hips rest in the chair cushion without the wooden seat entering the body',()=>{
  const {json:g}=readGlb('interaction.glb'),rig=posedRig('seated'),pose=config().actions.computer.pose;
  const pad=g.nodes.find(n=>n.name==='chair-pad'),wood=g.nodes.find(n=>n.name==='chair-seat');
  const bounds=node=>{const a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION];return {min:a.min.map((v,i)=>v+node.translation[i]),max:a.max.map((v,i)=>v+node.translation[i])};};
  const cushion=bounds(pad),seat=bounds(wood);
  for(const name of ['neutral-skinned-body','look-bottom-jeans','look-bottom-shorts','look-top-tee','look-top-shirt']){
    const contact=rig.vertices(name).map(p=>[pose[0]-p.x,pose[1]+p.y,pose[2]-p.z]).filter(p=>Math.abs(p[0]-pose[0])<.14&&p[2]>-.16&&p[2]<.12&&p[1]<.8);
    assert.ok(contact.length>10,name+' has actual hip vertices above the seat');
    const bottom=Math.min(...contact.map(p=>p[1]));
    assert.ok(bottom>=seat.max[1]-.006,name+' must stay above the wooden seat');
    assert.ok(bottom>=cushion.max[1]-.025,name+' must not sink through the cushion');
    if(name.startsWith('look-bottom-'))assert.ok(bottom<=cushion.max[1]+.035,name+' should contact the cushion with modest compression');
  }
});

test('both real wall switches expose reachable room-light actions and independent rockers',()=>{
  const {json:g}=readGlb('interaction.glb'),c=config();
  for(const room of ['living','kitchen']){
    const root=g.nodes.find(n=>n.name==='switch-'+room+'-root');assert.ok(root,room+' switch frame');
    assert.ok(root.children.some(i=>g.nodes[i].name==='switch-'+room+'-rocker'));
    const action=c.actions['light-'+room];assert.equal(action.lightRoom,room);assert.equal(action.clip,'switch');
    assert.equal(action.contactTime,.32);
    assert.equal(action.fade,false);assert.ok(action.duration>0&&action.duration<1);
    assert.ok(action.pose[2]<-.8&&action.hit,'switch can be approached at the rear wall');
  }
});

test('passage door has a fixed frame independent of its hinged leaf',()=>{
  const {json:g}=readGlb('interaction.glb');
  const frame=g.nodes.find(n=>n.name==='passage-frame-root');assert.ok(frame);
  const parts=frame.children.map(i=>g.nodes[i]);
  assert.ok(parts.some(n=>n.name==='passage-jamb-front'));
  assert.ok(parts.some(n=>n.name==='passage-jamb-rear'));
  assert.ok(parts.some(n=>n.name==='passage-jamb-header'));
  const hinge=g.nodes.find(n=>n.name==='hinge-passage');
  assert.ok(!hinge.children.includes(g.nodes.indexOf(frame)),'frame stays in the wall as the leaf opens');
  assert.ok(hinge.children.some(i=>g.nodes[i].name==='passage-hinge-upper'));
});

test('room lighting manifest supplies eight matching rendered backdrops',()=>{
  const c=config();
  for(const state of ['off','living','kitchen','both'])for(const period of ['night','day']){
    const file=c.lightingStates?.[state]?.[period];assert.ok(file,state+' '+period);
    const b=fs.readFileSync(new URL('../assets/apartment/v3/'+file,import.meta.url));
    assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],[3840,1536]);
  }
});

test('each rendered room light changes its own room while daylight survives both lamps being off',()=>{
  const c=config(),night=Object.fromEntries(['off','living','kitchen','both'].map(state=>[state,roomBrightness(c.lightingStates[state].night)]));
  const livingGain=night.living.map((n,i)=>n-night.off[i]),kitchenGain=night.kitchen.map((n,i)=>n-night.off[i]);
  assert.ok(livingGain[1]>2&&livingGain[1]>livingGain[0]*2,'living switch lights the living room');
  assert.ok(kitchenGain[0]>2&&kitchenGain[0]>kitchenGain[1]*2,'kitchen switch lights the kitchen');
  assert.ok(night.both[0]>night.living[0]+2&&night.both[1]>night.kitchen[1]+2,'both circuits can be enabled together');
  const dayOff=roomBrightness(c.lightingStates.off.day);
  assert.ok(dayOff[0]>night.off[0]+2&&dayOff[1]>night.off[1]+2,'window daylight remains with the two ceiling lamps off');
});

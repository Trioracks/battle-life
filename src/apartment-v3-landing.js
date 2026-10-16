export function createLandingReveal(root){
  const pieces=[];
  root?.traverse(o=>{
    if(!o.isMesh)return;
    const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.clone());
    o.material=Array.isArray(o.material)?materials:materials[0];
    pieces.push({object:o,materials,colors:materials.map(m=>m.color.clone()),screen:o.name.startsWith('landing-front-screen'),roof:o.name.startsWith('landing-ceiling')});
  });
  function apply(open,peek){
    if(root)root.visible=true;
    const fraction=Math.max(0,Math.min(1,open));
    for(const {object,materials,colors,screen,roof} of pieces){
      object.visible=peek||roof||(screen?fraction<.999:fraction>0);
      for(let i=0;i<materials.length;i++){
        const material=materials[i],alpha=screen&&!peek?1-fraction:1;
        const transparent=alpha>0&&alpha<1;
        if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
        material.opacity=alpha;material.depthWrite=!transparent;
        material.color.copy(colors[i]).multiplyScalar(peek?1:roof?.055:screen?1:.62);
      }
    }
  }
  return {apartment:open=>apply(open,false),peephole:()=>apply(0,true)};
}

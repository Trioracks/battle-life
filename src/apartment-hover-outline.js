// A single mask for every piece of the selected object produces its silhouette
// without drawing internal mesh seams, triangles, or bounding boxes.
export function createHoverOutline(THREE,renderer,targets){
  const mask=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  const black=new THREE.MeshBasicMaterial({color:0,side:THREE.DoubleSide,toneMapped:false});
  const selected=new THREE.Scene(),screen=new THREE.Scene(),camera=new THREE.Camera();
  const material=new THREE.ShaderMaterial({
    uniforms:{mask:{value:mask.texture},texel:{value:new THREE.Vector2(1,1)}},
    transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D mask;uniform vec2 texel;varying vec2 vUv;
      void main(){
        float center=texture2D(mask,vUv).r,edge=0.;
        for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)edge=max(edge,texture2D(mask,vUv+vec2(float(x),float(y))*texel).r);
        gl_FragColor=vec4(1.,.82,.04,edge*(1.-center));
      }`,
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;screen.add(quad);
  const size=new THREE.Vector2(),blackBackground=new THREE.Color(0);let id=null;
  return {
    select(value){if(value===id)return;id=value;selected.clear();for(const mesh of targets.objects(id))selected.add(mesh);},
    render(scene,view){
      if(!id||!selected.children.length)return;
      targets.sync();renderer.getDrawingBufferSize(size);
      if(mask.width!==size.x||mask.height!==size.y){mask.setSize(size.x,size.y);material.uniforms.texel.value.set(1/size.x,1/size.y);}
      const previous={target:renderer.getRenderTarget(),autoClear:renderer.autoClear,background:scene.background,override:scene.overrideMaterial,shadows:renderer.shadowMap.autoUpdate};
      try{
        renderer.shadowMap.autoUpdate=false;
        renderer.setRenderTarget(mask);renderer.autoClear=true;
        scene.background=blackBackground;scene.overrideMaterial=black;
        renderer.render(scene,view);
        scene.overrideMaterial=previous.override;scene.background=previous.background;
        renderer.autoClear=false;renderer.render(selected,view);
        renderer.setRenderTarget(previous.target);renderer.render(screen,camera);
      }finally{
        scene.overrideMaterial=previous.override;scene.background=previous.background;
        renderer.autoClear=previous.autoClear;renderer.shadowMap.autoUpdate=previous.shadows;renderer.setRenderTarget(previous.target);
      }
    },
    dispose(){selected.clear();mask.dispose();black.dispose();material.dispose();quad.geometry.dispose();},
  };
}

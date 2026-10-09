// CSS coordinates remain the input contract. Only the drawing buffer is reduced.
export function renderSize(width,height){
  const scale=Math.max(2,Math.ceil(width/960),Math.floor(height/360));
  return {width:Math.max(1,Math.round(width/scale)),height:Math.max(1,Math.round(height/scale)),scale};
}
export function renderViewport(canvas,rect){
  const size=renderSize(canvas.width,canvas.height),sx=size.width/canvas.width,sy=size.height/canvas.height;
  return {x:Math.round((rect.left-canvas.left)*sx),y:Math.round((canvas.bottom-rect.bottom)*sy),width:Math.max(1,Math.round(rect.width*sx)),height:Math.max(1,Math.round(rect.height*sy))};
}
export const grainFrame=(milliseconds,reducedMotion)=>reducedMotion?0:Math.floor(milliseconds/250);

export function createRetroPass(THREE,renderer,canvas){
  const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,type:THREE.HalfFloatType,depthBuffer:true});
  const material=new THREE.ShaderMaterial({
    uniforms:{source:{value:target.texture},grain:{value:0}},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 uv0; void main(){uv0=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D source; uniform float grain; varying vec2 uv0;
      float bayer(vec2 p){
        vec2 a=mod(floor(p),2.); vec2 b=mod(floor(p/2.),2.);
        return (4.*(2.*a.x+3.*a.y-4.*a.x*a.y)+(2.*b.x+3.*b.y-4.*b.x*b.y))/16.;
      }
      void main(){
        gl_FragColor=texture2D(source,uv0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float noise=fract(sin(dot(floor(gl_FragCoord.xy)+grain,vec2(12.9898,78.233)))*43758.5453)-.5;
        vec3 color=gl_FragColor.rgb+(bayer(gl_FragCoord.xy)-.5)/31.+noise*.009;
        gl_FragColor=vec4(floor(clamp(color,0.,1.)*31.+.5)/31.,1.);
      }`,
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),screen=new THREE.Scene(),camera=new THREE.Camera();screen.add(quad);
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let size={width:1,height:1};
  return {
    resize(width,height){size=renderSize(width,height);renderer.setPixelRatio(1);renderer.setSize(size.width,size.height,false);target.setSize(size.width,size.height);canvas.dataset.renderSize=`${size.width}×${size.height}`;},
    render(scene,view,rect){
      target.viewport.set(0,0,size.width,size.height);target.scissorTest=false;
      renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setViewport(0,0,size.width,size.height);renderer.clear();
      // Shadow rendering rebinds this target. Persist the region on the target
      // itself so its rebind restores the preview instead of the full canvas.
      if(rect){const v=renderViewport(canvas.getBoundingClientRect(),rect);target.viewport.set(v.x,v.y,v.width,v.height);target.scissor.copy(target.viewport);target.scissorTest=true;renderer.setRenderTarget(target);}
      renderer.render(scene,view);renderer.setScissorTest(false);renderer.setRenderTarget(null);renderer.setViewport(0,0,size.width,size.height);
      material.uniforms.grain.value=grainFrame(performance.now(),reduced?.matches);renderer.render(screen,camera);
    },
    dispose(){target.dispose();material.dispose();quad.geometry.dispose();},
  };
}

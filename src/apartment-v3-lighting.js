import {homeLight,clockHandAngles} from './apartment-v3-time.js?rev=58';

export function sceneTimeState(gameMinutes,lightingMinutes=gameMinutes){
  return {light:homeLight(lightingMinutes),hands:clockHandAngles(gameMinutes)};
}

// Mix lighting states in one opaque draw. A transparent full-screen layer
// would be sorted after the opaque actor and make the hero look like a ghost.
export function createBackdropMaterial(THREE,night,day,states={}){
  const uniforms={nightMap:{value:night},dayMap:{value:day},daylight:{value:0},warmth:{value:0},livingLight:{value:1},kitchenLight:{value:1}};
  for(const state of ['off','living','kitchen']){
    uniforms[state+'NightMap']={value:states[state]?.night??night};
    uniforms[state+'DayMap']={value:states[state]?.day??day};
  }
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform sampler2D nightMap;uniform sampler2D dayMap;
      uniform sampler2D offNightMap;uniform sampler2D offDayMap;
      uniform sampler2D livingNightMap;uniform sampler2D livingDayMap;
      uniform sampler2D kitchenNightMap;uniform sampler2D kitchenDayMap;
      uniform float daylight;uniform float warmth;uniform float livingLight;uniform float kitchenLight;varying vec2 vUv;
      void main(){
      vec3 n=mix(mix(texture2D(offNightMap,vUv).rgb,texture2D(livingNightMap,vUv).rgb,livingLight),
        mix(texture2D(kitchenNightMap,vUv).rgb,texture2D(nightMap,vUv).rgb,livingLight),kitchenLight);
      vec3 d=mix(mix(texture2D(offDayMap,vUv).rgb,texture2D(livingDayMap,vUv).rgb,livingLight),
        mix(texture2D(kitchenDayMap,vUv).rgb,texture2D(dayMap,vUv).rgb,livingLight),kitchenLight);
      d*=vec3(1.0,1.0-.035*warmth,1.0-.11*warmth);gl_FragColor=vec4(mix(n,d,daylight),1.0);
      #include <colorspace_fragment>
      }`,
    depthWrite:false,depthTest:false,toneMapped:false,transparent:false
  });
}

// The same switches affect real meshes as well as the baked room. The window
// fill is independent so turning a lamp off at noon does not erase daylight.
export function createPracticalLighting(THREE,scene,positions){
  const sky=new THREE.HemisphereLight(0xb3c6d4,0x494333,.4);scene.add(sky);
  const window=new THREE.DirectionalLight(0xa9c5df,.1);window.position.set(-3,5,-4);scene.add(window);
  const lamps={},bounce={};
  for(const [room,position] of Object.entries(positions)){
    const lamp=new THREE.SpotLight(0xffd0a0,26,7,1.18,.7,2);
    lamp.position.fromArray(position);lamp.target.position.set(position[0],0,position[2]+.25);
    lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.bias=-.00015;lamp.shadow.normalBias=.012;
    lamp.shadow.camera.near=.05;lamp.shadow.camera.far=7;
    scene.add(lamp,lamp.target);lamps[room]=lamp;
    // Soft reflection from the missing front wall of the cutaway. Unlike a
    // global key light this has a finite range and follows its room switch.
    const reflected=new THREE.PointLight(0xf7dfb9,18,6.2,2);
    reflected.position.set(room==='living'?3.25:-3.25,2.0,2.7);scene.add(reflected);bounce[room]=reflected;
  }
  function update({daylight,living,kitchen}){
    sky.intensity=.5+daylight*1.15;window.intensity=.12+daylight*1.5;
    lamps.living.intensity=26*living;lamps.kitchen.intensity=26*kitchen;
    bounce.living.intensity=18*living;bounce.kitchen.intensity=18*kitchen;
  }
  return {sky,window,lamps,bounce,update};
}

import {
  ACESFilmicToneMapping, AdditiveBlending, AmbientLight, BackSide, BoxGeometry,
  BufferAttribute, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DirectionalLight,
  DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, Points, Scene, ShaderMaterial,
  Shape, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3, WebGLRenderer
} from 'three';

const FRAME_INTERVAL = 1000 / 30;
const TRAVEL_DURATION = 1900;
const DEPTH = 104;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

// Seeded textures and geometry keep the six destinations consistent on reload.
function randomGenerator(seed = 8241) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const noiseGLSL = `
  float hash(vec3 p) { p = fract(p * .3183099 + vec3(.13,.27,.49)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 p) {
    vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p) {
    float value=0.,amplitude=.5;
    for(int i=0;i<4;i++){value+=noise(p)*amplitude;p=p*2.07+vec3(1.7,9.2,5.1);amplitude*=.5;}
    return value;
  }
`;

const sphereVertex = `
  varying vec3 vSurface; varying vec3 vNormal; varying vec3 vView;
  void main(){
    vSurface=position;
    vec4 view=modelViewMatrix*vec4(position,1.);
    vNormal=normalize(normalMatrix*normal); vView=normalize(-view.xyz);
    gl_Position=projectionMatrix*view;
  }
`;

const planetFragment = `
  precision highp float;
  uniform float uKind; uniform float uSeed; uniform vec3 uTint;
  varying vec3 vSurface; varying vec3 vNormal; varying vec3 vView;
  ${noiseGLSL}
  void main(){
    vec3 p=normalize(vSurface), q=p*4.2+uSeed;
    float terrain=fbm(q),detail=fbm(q*7.1),rough=fbm(q*21.);
    vec3 color; float specular=0.;
    if(uKind<.5){
      float land=smoothstep(.46,.54,terrain);
      vec3 sea=mix(vec3(.008,.052,.11),vec3(.016,.17,.25),terrain);
      vec3 ground=mix(vec3(.08,.17,.10),vec3(.35,.31,.16),smoothstep(.48,.73,terrain));
      color=mix(sea,ground,land)*( .77+detail*.5 );
      float polar=smoothstep(.79,.96,abs(p.y)+terrain*.12);
      color=mix(color,vec3(.82,.90,.91),polar);
      float clouds=smoothstep(.57,.70,fbm(p*9.+vec3(4.1,1.,uSeed)));
      color=mix(color,vec3(.91,.93,.94),clouds*.86);
      specular=(1.-land)*(1.-clouds)*.6;
    }else if(uKind<1.5){
      color=mix(vec3(.17,.045,.022),vec3(.62,.25,.10),terrain);
      color*=.64+detail*.72;
      color=mix(color,vec3(.50,.40,.28),smoothstep(.67,.75,terrain)*.55);
    }else if(uKind<2.5){
      float bands=sin(p.y*54.+fbm(p*7.)*6.5)*.5+.5;
      float swirls=fbm(vec3(p.x*9.,p.y*31.,p.z*9.));
      color=mix(vec3(.23,.14,.10),vec3(.76,.62,.42),smoothstep(.12,.89,bands*.66+swirls*.34));
      color=mix(color,vec3(.87,.79,.61),smoothstep(.75,.91,bands)*.5);
    }else if(uKind<3.5){
      float fissures=pow(abs(sin(terrain*31.+detail*7.)),.17);
      color=mix(vec3(.08,.23,.29),vec3(.59,.78,.79),fissures)*(.64+detail*.53);
      color=mix(color,vec3(.86,.94,.96),smoothstep(.62,.79,terrain));
      specular=.2;
    }else if(uKind<4.5){
      float crater=abs(sin(terrain*39.+detail*9.));
      color=mix(vec3(.13,.135,.14),vec3(.53,.49,.42),terrain);
      color*=.55+detail*.77+smoothstep(.86,.97,crater)*.17;
    }else{
      float cracks=1.-smoothstep(.035,.09,abs(terrain-.49));
      color=mix(vec3(.027,.022,.026),vec3(.15,.10,.07),detail);
      color+=vec3(.82,.15,.018)*cracks*(.45+rough);
    }
    vec3 n=normalize(vNormal),light=normalize(vec3(-.65,.70,.85));
    float diffuse=max(dot(n,light),0.);
    float reflected=pow(max(dot(reflect(-light,n),normalize(vView)),0.),34.)*specular;
    float rim=pow(1.-max(dot(n,normalize(vView)),0.),3.4);
    color=color*(.055+diffuse*1.50)+reflected*vec3(.76,.84,.91);
    color+=rim*uTint*.08*smoothstep(-.2,.6,dot(n,light));
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereFragment = `
  uniform vec3 uTint; uniform float uHover;
  varying vec3 vSurface; varying vec3 vNormal; varying vec3 vView;
  void main(){
    float facing=max(dot(normalize(vNormal),normalize(vView)),0.);
    float rim=pow(1.-facing,4.5);
    float sun=.25+.75*max(dot(normalize(vNormal),normalize(vec3(-.65,.7,.85))),0.);
    gl_FragColor=vec4(uTint,rim*sun*(.27+uHover*.20));
    #include <colorspace_fragment>
  }
`;

/** Pure projection shared by layout and travel. radius is a CSS-pixel radius. */
export function destinationWorldPosition(destination, width, height, fov = 48, depth = DEPTH) {
  const viewHeight = 2 * Math.tan(fov * Math.PI / 360) * depth;
  return {
    x: (clamp(Number(destination.x) || 0, 0, 1) - .5) * viewHeight * width / Math.max(1, height),
    y: (.5 - clamp(Number(destination.y) || 0, 0, 1)) * viewHeight,
    radius: Math.max(1, Number(destination.radius) || 40) * viewHeight / Math.max(1, height)
  };
}

/**
 * A single, fixed chase camera makes the ship screen-anchored: forward movement
 * belongs to the dust and destination field, never to camera shake. The caller
 * owns visibility, reduced-motion preferences and navigation; this module owns
 * one capped RAF and releases every GPU resource on failure or disposal.
 */
export function createSpaceScene(host, { destinations = [], onFailure, onReady } = {}) {
  let renderer, canvas, scene, camera, ship, resizeObserver, nebula, starTrails;
  let active = false, disposed = false, failed = false, rafId = 0, lastFrame = 0;
  let width = 1, height = 1, elapsed = 0, hoveredId = null, travel = null;
  let compact = false;
  let destinationList = destinations;
  const geometries = new Set(), materials = new Set();
  const planets = [], flames = [], engineGlows = [];
  const geometry = (value) => { geometries.add(value); return value; };
  const material = (value) => { materials.add(value); return value; };
  const random = randomGenerator();
  const trailCount = 190;
  const trailPositions = new Float32Array(trailCount * 6);
  const trailSeeds = Array.from({ length: trailCount }, () => ({
    x: (random() - .5) * 240, y: (random() - .5) * 155, z: -random() * 220,
    speed: 11 + random() * 14
  }));

  function settleTravel(result) {
    if (!travel) return;
    const resolve = travel.resolve;
    travel = null;
    try { resolve(result); } catch { /* A caller cannot break scene cleanup. */ }
  }

  function stop() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastFrame = 0;
    host.dataset.spaceAnimating = 'false';
    settleTravel(false);
  }

  function release() {
    stop();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    canvas?.removeEventListener('webglcontextlost', contextLost);
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    scene?.traverse((object)=>{if(object.isLight&&typeof object.dispose==='function')object.dispose();});
    geometries.clear(); materials.clear();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer = null;
    }
    canvas?.remove();
  }

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    host.dataset.sceneState = 'fallback';
    try { release(); } catch { stop(); canvas?.remove(); }
    try { onFailure?.(error); } catch { /* Keep the HTML navigation available. */ }
  }

  function contextLost(event) {
    event.preventDefault();
    fail(new Error('The space scene WebGL context was lost.'));
  }

  function mesh(shape, surface, parent, position = [0, 0, 0]) {
    const value = new Mesh(shape, surface);
    value.position.set(...position);
    parent.add(value);
    return value;
  }

  function createShip() {
    ship = new Group();
    scene.add(ship);
    const metal = material(new MeshStandardMaterial({ color: 0x607686, metalness: .74, roughness: .43 }));
    const paleMetal = material(new MeshStandardMaterial({ color: 0x8798a5, metalness: .64, roughness: .43 }));
    const darkMetal = material(new MeshStandardMaterial({ color: 0x172634, metalness: .81, roughness: .33 }));
    const graphite = material(new MeshStandardMaterial({ color: 0x101b26, metalness: .50, roughness: .62 }));
    const brass = material(new MeshStandardMaterial({ color: 0x866d4b, metalness: .78, roughness: .30 }));
    const glass = material(new MeshStandardMaterial({ color: 0x091923, metalness: .82, roughness: .13, emissive: 0x083649, emissiveIntensity: .18 }));
    const cyan = material(new MeshBasicMaterial({ color: 0x94e5ff, toneMapped: false }));
    const amber = material(new MeshBasicMaterial({ color: 0xffb96f, toneMapped: false }));

    // Eight-sided longitudinal rings form a tapered, faceted fuselage; its lower
    // chine is narrower, and segmented armor follows the same contour.
    const hullRings = [
      [-6.4, .055, .13, -.02], [-5.1, .42, .29, -.18], [-2.4, .91, .67, -.42],
      [.3, 1.13, .78, -.53], [2.8, 1.0, .32, -.48], [3.45, .75, .19, -.35]
    ];
    function hullGeometry(rings) {
      const positions = [], indexes = [];
      for (const [z, halfWidth, top, bottom] of rings) {
        const shoulder = top - (top-bottom)*.30, chine = bottom + (top-bottom)*.25;
        for (const [x, y] of [[-.48, top], [.48, top], [1, shoulder], [1, chine], [.56, bottom], [-.56, bottom], [-1,chine], [-1,shoulder]]) {
          positions.push(x * halfWidth, y, z);
        }
      }
      for (let row = 0; row < rings.length - 1; row += 1) {
        for (let side = 0; side < 8; side += 1) {
          const a = row*8+side, b = row*8+(side+1)%8, c = a+8, d = b+8;
          indexes.push(a,d,b,a,c,d);
        }
      }
      for (let i = 1; i < 7; i += 1) {
        indexes.push(0,i,i+1);
        const end = (rings.length - 1)*8;
        indexes.push(end,end+i+1,end+i);
      }
      const hull = new BufferGeometry();
      hull.setAttribute('position',new Float32BufferAttribute(positions,3));
      hull.setIndex(indexes); hull.computeVertexNormals();
      const faceted = hull.toNonIndexed();
      faceted.computeVertexNormals();
      hull.dispose();
      return geometry(faceted);
    }
    mesh(hullGeometry(hullRings), metal, ship);

    function armor(points, thickness, surface, y = 0) {
      const outline = new Shape();
      points.forEach(([x,z], index) => index ? outline.lineTo(x,z) : outline.moveTo(x,z));
      outline.closePath();
      const value = mesh(geometry(new ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .025, bevelThickness: .025 })),surface,ship,[0,y,0]);
      value.rotation.x = Math.PI / 2;
      return value;
    }

    for (const side of [-1, 1]) {
      armor([[.84,-1.4],[2.35,.9],[4.9,2.85],[5.3,4.2],[3.25,3.65],[1.2,2.0]].map(([x,z])=>[x*side,z]), .16, darkMetal,.03);
      armor([[1.22,-.31],[2.42,1.35],[4.6,2.98],[4.83,3.60],[3.22,3.14],[1.62,1.82]].map(([x,z])=>[x*side,z]),.09,paleMetal,.11);
      armor([[2.26,1.96],[3.78,2.81],[3.97,3.14],[2.52,2.58]].map(([x,z])=>[x*side,z]),.035,graphite,.225);
      // Canted vertical tail fins, rather than flat wing silhouettes, reveal
      // the ship's depth even when viewed directly down the engine axis.
      const finShape = new Shape();
      finShape.moveTo(-.40,.28);finShape.lineTo(-1.90,1.57);
      finShape.lineTo(-3.17,1.08);finShape.lineTo(-3.05,.20);finShape.closePath();
      const fin = mesh(geometry(new ExtrudeGeometry(finShape,{depth:.095,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,steps:1})),metal,ship,[side*1.08,0,0]);
      fin.rotation.set(0,Math.PI/2,-side*.22);
      const beacon = mesh(geometry(new BoxGeometry(.055,.055,.62)),side<0?cyan:amber,ship,[side*4.62,.17,3.33]);
      beacon.rotation.y = -side*.58;
      armor([[.33,-4.95],[.68,-3.02],[.82,-1.43],[.53,-1.58]].map(([x,z])=>[x*side,z]),.022,graphite,.40);
    }

    // Inset canopy, dorsal armored spine and the service bay behind the cockpit.
    mesh(hullGeometry([[-3.9,.17,.49,.43],[-2.1,.52,1.09,.57],[-.34,.58,1.0,.70],[.43,.45,.73,.65]]),glass,ship);
    const spine = mesh(geometry(new BoxGeometry(.10,.08,3.95)),paleMetal,ship,[0,.85,-1.45]);
    spine.rotation.x = -.055;
    armor([[-.48,.38],[.48,.38],[.58,2.45],[-.58,2.45]],.1,darkMetal,.64);
    armor([[-.26,.63],[.26,.63],[.35,2.24],[-.35,2.24]],.045,metal,.70);
    const vents = new InstancedMesh(geometry(new BoxGeometry(.36,.048,.065)),graphite,18);
    const transform = new Object3D();
    for (let index = 0; index < 18; index += 1) {
      transform.position.set(index%2 ? .64 : -.64,.63, .40+Math.floor(index/2)*.18);
      transform.rotation.set(0,0,index%2 ? -.08 : .08);
      transform.updateMatrix(); vents.setMatrixAt(index,transform.matrix);
    }
    ship.add(vents);
    const rivets = new InstancedMesh(geometry(new SphereGeometry(.027,5,4)),brass,56);
    for (let index = 0; index < 56; index += 1) {
      const side = index%2 ? 1 : -1;
      transform.position.set(side*(.57+Math.floor(index/2)*.105), .26, 1.30+Math.floor(index/2)*.065);
      transform.rotation.set(0,0,0); transform.updateMatrix(); rivets.setMatrixAt(index,transform.matrix);
    }
    ship.add(rivets);

    const flameMaterial = material(new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      uniforms: { uTime: { value: 0 }, uBurn: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `
        uniform float uTime; uniform float uBurn; varying vec2 vUv;
        void main(){
          float end=vUv.y;
          float noise=sin(vUv.x*43.+uTime*27.-end*67.)*.09+sin(vUv.x*71.-uTime*39.+end*43.)*.06;
          float diamonds=pow(max(0.,sin(end*36.-uTime*15.)),10.)*.32;
          float tail=pow(1.-end,1.9);
          float flicker=.87+.13*sin(uTime*63.+vUv.x*34.);
          float alpha=tail*(.28+noise+diamonds)*flicker*(.9+uBurn*.4);
          vec3 color=mix(vec3(.63,.87,1.),vec3(.04,.28,.98),smoothstep(.06,.60,end));
          color=mix(color,vec3(1.,.32,.06),smoothstep(.75,1.,end)*.35);
          gl_FragColor=vec4(color*1.8,alpha);
          #include <colorspace_fragment>
        }
      `
    }));
    const glowMaterial = material(new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color(0x6dcaff) } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main(){float r=length(vUv-.5)*2.;float a=pow(max(0.,1.-r),3.);gl_FragColor=vec4(uColor*1.8,a*.65); #include <colorspace_fragment>\n}'
        .replace(' #include','\n#include')
    }));
    const nozzleGeo = geometry(new CylinderGeometry(.54,.66,1.25,18,1,true));
    const ringGeo = geometry(new TorusGeometry(.48,.06,6,24));
    const coreGeo = geometry(new CircleGeometry(.365,24));
    const plumeGeo = geometry(new CylinderGeometry(.025,.39,4.7,20,12,true));
    // UV y=0 is the broad nozzle end; after rotation local +Y points downrange.
    for (const [x, scale] of [[-1.53,1],[1.53,1],[-3.04,.57],[3.04,.57]]) {
      const engine = new Group(); engine.position.set(x,-.12,2.25); engine.scale.setScalar(scale); ship.add(engine);
      const tube = mesh(nozzleGeo,graphite,engine); tube.rotation.x = Math.PI/2;
      const collar = mesh(geometry(new CylinderGeometry(.64,.61,.85,14,1,true)),metal,engine,[0,0,-.65]); collar.rotation.x=Math.PI/2;
      mesh(ringGeo,brass,engine,[0,0,.64]);
      const innerRing = mesh(ringGeo,darkMetal,engine,[0,0,.72]); innerRing.scale.setScalar(.83);
      mesh(coreGeo,cyan,engine,[0,0,.73]);
      const plume = mesh(plumeGeo,flameMaterial,engine,[0,0,3.03]); plume.rotation.x = Math.PI/2;
      // Cylinder +Y (small radius) maps to +Z, keeping the flame tapered outward.
      flames.push({ mesh: plume, material: flameMaterial, baseZ: 3.03 });
      const glow = mesh(geometry(new PlaneGeometry(2.35,2.35)),glowMaterial,engine,[0,0,.81]);
      engineGlows.push(glow);
    }
    ship.traverse((object) => {
      if (object.isMesh && object.material.isMeshStandardMaterial) {
        object.castShadow = true; object.receiveShadow = true;
      }
    });
  }

  function createBackdrop() {
    const backgroundMaterial = material(new ShaderMaterial({
      side: BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vRay; void main(){vRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `
        varying vec3 vRay; ${noiseGLSL}
        void main(){
          vec3 ray=normalize(vRay); float cloud=fbm(ray*4.+vec3(1.,2.,4.));
          float band=exp(-pow((ray.y+ray.x*.38-.08)*6.,2.));
          float wisps=fbm(ray*17.+cloud*3.);
          vec3 color=vec3(.0017,.003,.007);
          color+=vec3(.015,.035,.058)*band*pow(cloud,1.7);
          color+=vec3(.052,.030,.021)*band*pow(wisps,3.)*.5;
          gl_FragColor=vec4(color,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    }));
    nebula=mesh(geometry(new SphereGeometry(360,24,16)),backgroundMaterial,scene);
    nebula.renderOrder=-5;
    const positions=[],colors=[],sizes=[];
    for(let index=0;index<1050;index+=1){
      positions.push((random()-.5)*550,(random()-.5)*350,-65-random()*230);
      const warmth=random(); colors.push(.64+warmth*.3,.75+warmth*.15,1.-warmth*.18);
      sizes.push(random()<.035 ? 2.9 : .7+random()*1.15);
    }
    const starsGeometry=geometry(new BufferGeometry());
    starsGeometry.setAttribute('position',new Float32BufferAttribute(positions,3));
    starsGeometry.setAttribute('color',new Float32BufferAttribute(colors,3));
    starsGeometry.setAttribute('aSize',new Float32BufferAttribute(sizes,1));
    const starsMaterial=material(new ShaderMaterial({
      vertexColors:true, transparent:true,depthWrite:false,blending:AdditiveBlending,
      vertexShader:'attribute float aSize; varying vec3 vColor; void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=aSize;}',
      fragmentShader:'varying vec3 vColor; void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vColor,pow(max(0.,1.-r),1.6)*.86);\n#include <colorspace_fragment>\n}'
    }));
    const stars=new Points(starsGeometry,starsMaterial);stars.frustumCulled=false;scene.add(stars);
    const trailGeometry=geometry(new BufferGeometry());
    // BufferAttribute retains this live array; Float32BufferAttribute would copy
    // it and leave flight trails frozen despite needsUpdate on each frame.
    trailGeometry.setAttribute('position',new BufferAttribute(trailPositions,3));
    starTrails=new LineSegments(trailGeometry,material(new LineBasicMaterial({color:0x8baec5,transparent:true,opacity:.24,depthWrite:false,blending:AdditiveBlending})));
    starTrails.frustumCulled=false;scene.add(starTrails);
  }

  function planetKind(kind, index) {
    const kinds={earth:0,ocean:0,terrestrial:0,mars:1,rock:1,desert:1,gas:2,jupiter:2,saturn:2,ringed:2,ice:3,neptune:3,moon:4,lunar:4,lava:5,volcanic:5};
    return kinds[String(kind).toLowerCase()] ?? index%6;
  }

  function createPlanet(destination,index) {
    const group=new Group();scene.add(group);
    const kind=planetKind(destination.kind,index);
    const tint=new Color(destination.color || [0x65b7e8,0xc17a50,0xe3bd83,0x90d7e5,0xb5afac,0xf98146][kind]);
    const sphereGeometry=geometry(new SphereGeometry(1,40,28));
    const surface=material(new ShaderMaterial({vertexShader:sphereVertex,fragmentShader:planetFragment,
      uniforms:{uKind:{value:kind},uSeed:{value:index*7.17},uTint:{value:tint}}}));
    const body=mesh(sphereGeometry,surface,group);
    const atmosphere=material(new ShaderMaterial({vertexShader:sphereVertex,fragmentShader:atmosphereFragment,
      transparent:true,depthWrite:false,blending:AdditiveBlending,
      uniforms:{uTint:{value:tint},uHover:{value:0}}}));
    const halo=mesh(sphereGeometry,atmosphere,group);halo.scale.setScalar(kind===4?1.016:1.038);
    if(kind===2){
      const ring=mesh(geometry(new PlaneGeometry(3.4,3.4)),material(new ShaderMaterial({
        transparent:true,side:DoubleSide,depthWrite:false,
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=smoothstep(.60,.65,r)*(1.-smoothstep(.94,1.,r));a*=.27+.19*sin(r*210.)+.14*sin(r*72.);vec3 color=mix(vec3(.25,.21,.17),vec3(.72,.63,.45),r);gl_FragColor=vec4(color,a*.8);\n#include <colorspace_fragment>\n}`
      })),group);
      ring.rotation.set(-1.06,.23,-.35);
    }
    const planet={id:destination.id,group,body,atmosphere,base:new Vector3(),radius:1,index,hover:0};
    planets.push(planet);return planet;
  }

  function updateDestinations(next) {
    if (disposed || failed) return;
    destinationList=Array.isArray(next)?next:[];
    for(const [index,destination] of destinationList.entries()){
      if(!destination || typeof destination.id !== 'string') continue;
      const planet=planets.find((entry)=>entry.id===destination.id)||createPlanet(destination,index);
      const projected=destinationWorldPosition(destination,width,height,camera.fov);
      planet.base.set(projected.x,projected.y,camera.position.z-DEPTH);
      planet.radius=projected.radius;
      planet.group.visible=true;
    }
    for(const planet of planets) planet.group.visible=destinationList.some((entry)=>entry.id===planet.id);
    pose(0,0);
    if(!active) render();
  }

  function pose(delta,progress) {
    const boost=travel?smoothstep(Math.min(1,progress*2.6)):0;
    const viewHeight=2*Math.tan(camera.fov*Math.PI/360)*camera.position.z;
    const scale=compact?Math.min(.64,width/680):Math.min(1.12,width/1220);
    ship.scale.setScalar(scale);
    ship.position.set(0,-viewHeight*(compact?.205:.185),0);
    // Rotation only: no position noise or mouse-follow can destabilize the ship.
    const selected=travel?planets.find((planet)=>planet.id===travel.id):null;
    const bank=selected?clamp(selected.base.x/35,-1,1)*Math.sin(progress*Math.PI)*.09:0;
    ship.rotation.set(.035+Math.sin(elapsed*.61)*.003,-bank*.40,bank+Math.sin(elapsed*.43)*.004);
    for(const flame of flames){
      flame.material.uniforms.uTime.value=elapsed;
      flame.material.uniforms.uBurn.value=boost;
      flame.mesh.scale.y=1+boost*.65;
      flame.mesh.position.z=.68+2.35*flame.mesh.scale.y;
    }
    for(const glow of engineGlows)glow.scale.setScalar(1+boost*.4+Math.sin(elapsed*28)*.03);
    for(const planet of planets){
      planet.hover+=(Number(planet.id===hoveredId)-planet.hover)*Math.min(1,delta*7+.04);
      planet.atmosphere.uniforms.uHover.value=planet.hover;
      planet.body.rotation.y=elapsed*(.009+planet.index*.001);
      planet.group.position.copy(planet.base);
      planet.group.scale.setScalar(planet.radius);
      if(selected){
        const approach=Math.pow(progress,2.2);
        const remaining=Math.max(.11,1-approach*.89);
        // Fly along the selected line of sight. Bodies spread outward with the
        // camera-relative field, while the target swells into the transition.
        planet.group.position.x-=selected.base.x*approach;
        planet.group.position.y-=selected.base.y*approach;
        planet.group.position.z=camera.position.z-DEPTH*remaining;
        if(planet!==selected){
          planet.group.position.x+=(planet.base.x-selected.base.x)*approach*.55;
          planet.group.position.y+=(planet.base.y-selected.base.y)*approach*.55;
        }
      }
    }
    const speed=1+boost*7;
    for(let index=0;index<trailCount;index+=1){
      const star=trailSeeds[index];
      star.z+=delta*star.speed*speed;
      if(star.z>12)star.z=-220;
      const offset=index*6;
      trailPositions[offset]=star.x;trailPositions[offset+1]=star.y;trailPositions[offset+2]=star.z;
      trailPositions[offset+3]=star.x;trailPositions[offset+4]=star.y;trailPositions[offset+5]=star.z-(.17+boost*6.3);
    }
    starTrails.geometry.attributes.position.needsUpdate=true;
    starTrails.material.opacity=.23+boost*.34;
  }

  function render() {
    if(failed||disposed||!renderer)return false;
    try{
      renderer.render(scene,camera);
      if(renderer.getContext().isContextLost())throw new Error('WebGL is unavailable.');
      return true;
    }catch(error){fail(error);return false;}
  }

  function resize() {
    if(failed||disposed||!renderer)return;
    try{
      const nextWidth=Math.round(host.clientWidth||host.getBoundingClientRect().width);
      const nextHeight=Math.round(host.clientHeight||host.getBoundingClientRect().height);
      if(!nextWidth||!nextHeight)return;
      width=nextWidth;height=nextHeight;compact=width<720;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1:1.5));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.updateProjectionMatrix();
      updateDestinations(destinationList);
      if(!active)render();
    }catch(error){fail(error);}
  }

  function frame(now) {
    rafId=0;
    if(!active||failed||disposed)return;
    if(lastFrame&&now-lastFrame<FRAME_INTERVAL-1){rafId=requestAnimationFrame(frame);return;}
    const delta=lastFrame?Math.min((now-lastFrame)/1000,.08):FRAME_INTERVAL/1000;
    lastFrame=now;elapsed+=delta;
    if(travel)travel.elapsed+=delta*1000;
    const progress=travel?Math.min(1,travel.elapsed/TRAVEL_DURATION):0;
    try{pose(delta,progress);}catch(error){fail(error);return;}
    if(!render())return;
    if(travel&&progress>=1)settleTravel(true);
    if(active&&!failed&&!disposed)rafId=requestAnimationFrame(frame);
  }

  const api={
    setActive(value){
      if(disposed||failed)return;
      if(!value){stop();pose(0,0);render();return;}
      if(active)return;
      active=true;lastFrame=0;host.dataset.spaceAnimating='true';
      rafId=requestAnimationFrame(frame);
    },
    setHovered(id){hoveredId=typeof id==='string'?id:null;},
    setDestinations(next){try{updateDestinations(next);}catch(error){fail(error);}},
    travelTo(id){
      if(disposed||failed||!active||!planets.some((planet)=>planet.id===id&&planet.group.visible))return Promise.resolve(false);
      settleTravel(false);
      return new Promise((resolve)=>{travel={id,elapsed:0,resolve};});
    },
    cancelTravel(){settleTravel(false);if(!failed&&!disposed){pose(0,0);if(!active)render();}},
    dispose(){if(disposed)return;disposed=true;release();host.dataset.sceneState='disposed';}
  };

  try{
    compact=(host.clientWidth||window.innerWidth)<720;
    renderer=new WebGLRenderer({alpha:true,antialias:!compact,powerPreference:'low-power',preserveDrawingBuffer:false});
    renderer.outputColorSpace=SRGBColorSpace;
    renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
    renderer.debug.onShaderError=()=>{throw new Error('A space-scene shader could not be compiled.');};
    renderer.shadowMap.enabled=!compact;renderer.shadowMap.type=PCFSoftShadowMap;
    renderer.setClearColor(0x02050a,1);
    canvas=renderer.domElement;canvas.className='space-canvas';canvas.setAttribute('aria-hidden','true');
    canvas.addEventListener('webglcontextlost',contextLost);host.appendChild(canvas);
    scene=new Scene();camera=new PerspectiveCamera(48,1,.1,600);camera.position.set(0,0,16);
    scene.add(new AmbientLight(0x5a7c9e,1.12));
    const sun=new DirectionalLight(0xffe3c4,4.8);sun.position.set(-12,18,9);
    sun.castShadow=!compact;sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:55});
    sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;
    sun.target.position.set(0,-3,0);scene.add(sun,sun.target);
    const rim=new DirectionalLight(0x5ba8ff,3.4);rim.position.set(8,3,-13);scene.add(rim);
    const engineLight=new DirectionalLight(0x71cdff,1.1);engineLight.position.set(0,-2,9);scene.add(engineLight);
    createBackdrop();createShip();resize();
    if(!failed&&render()){
      host.dataset.sceneState='ready';
      if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}
      else window.addEventListener('resize',resize,{passive:true});
      try{onReady?.();}catch{ /* Optional status reporting never blocks navigation. */ }
    }
  }catch(error){fail(error);}
  return api;
}

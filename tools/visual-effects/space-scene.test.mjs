import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

// Real Three geometry/materials/projection, with only the GPU, DOM and clock
// replaced. Shader compilation and cinematic appearance also require browser QA.
const here = dirname(fileURLToPath(import.meta.url));
const realThree = resolve(here, 'node_modules/three/build/three.module.js');
const bundled = await build({
  entryPoints: [resolve(here, '../../assets/js/src/space-scene.js')],
  bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{
    name: 'space-test-renderer',
    setup(builder) {
      builder.onResolve({ filter: /^three$/ }, () => ({ path: 'test-three', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        resolveDir: here,
        contents: `
          export * from ${JSON.stringify(realThree)};
          export class WebGLRenderer {
            constructor(options) {
              if(globalThis.stats.initFailure)throw new Error('Test WebGL unavailable');
              this.options=options;this.debug={};this.shadowMap={};
              this.domElement=document.createElement('canvas');globalThis.stats.renderer=this;
            }
            setClearColor() {}
            setPixelRatio(value){globalThis.stats.pixelRatio=value;}
            setSize(width,height){globalThis.stats.size=[width,height];}
            render(scene,camera){
              if(globalThis.stats.renderFailure)throw new Error('Test GPU failure');
              globalThis.stats.frames+=1;globalThis.stats.scene=scene;globalThis.stats.camera=camera;
              scene.updateMatrixWorld();camera.updateMatrixWorld();
            }
            getContext(){return {isContextLost:()=>globalThis.stats.contextLost};}
            dispose(){globalThis.stats.disposals+=1;}
            forceContextLoss(){globalThis.stats.contextReleases+=1;}
          }
        `
      }));
    }
  }]
});

class Element {
  constructor(width = 0, height = 0) {
    this.clientWidth=width;this.clientHeight=height;this.dataset={};this.children=[];
    this.events=new Map();this.attributes=new Map();
  }
  setAttribute(name,value){this.attributes.set(name,value);}
  addEventListener(name,listener){this.events.set(name,listener);}
  removeEventListener(name,listener){if(this.events.get(name)===listener)this.events.delete(name);}
  appendChild(child){this.children.push(child);child.parent=this;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter((child)=>child!==this);}
  getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
}

const destinations = [
  {id:'research',x:.13,y:.31,radius:42,kind:'earth',color:'#78bfff'},
  {id:'education',x:.36,y:.24,radius:38,kind:'mars',color:'#db8b52'},
  {id:'experience',x:.64,y:.24,radius:48,kind:'gas',color:'#d4bd87'},
  {id:'projects',x:.87,y:.31,radius:40,kind:'ice',color:'#a4e0e2'},
  {id:'interests',x:.25,y:.52,radius:44,kind:'moon',color:'#bab9ba'},
  {id:'blog',x:.75,y:.52,radius:39,kind:'lava',color:'#f59264'}
];

function setup({width=1280,height=800,initFailure=false,renderFailure=false,noObserver=false}={}) {
  const stats={frames:0,disposals:0,contextReleases:0,initFailure,renderFailure,contextLost:false,ready:0};
  const host=new Element(width,height),fallback=new Element(),window=new Element();
  host.appendChild(fallback);window.devicePixelRatio=3;window.innerWidth=width;
  const queuedFrames=new Map();let frameId=0;
  const sandbox={
    module:{exports:{}},stats,window,document:{createElement:()=>new Element()},
    requestAnimationFrame:(callback)=>{queuedFrames.set(++frameId,callback);return frameId;},
    cancelAnimationFrame:(id)=>queuedFrames.delete(id),
    ResizeObserver:noObserver?undefined:class {
      constructor(callback){stats.resize=callback;}
      observe(){stats.observing=true;}
      disconnect(){stats.observing=false;stats.disconnected=true;}
    }
  };
  runInNewContext(bundled.outputFiles[0].text,sandbox);
  const failures=[];
  const api=sandbox.module.exports.createSpaceScene(host,{
    destinations,onReady:()=>{stats.ready+=1;},onFailure:(error)=>failures.push(error)
  });
  function frame(timestamp){const callbacks=[...queuedFrames.values()];queuedFrames.clear();for(const callback of callbacks)callback(timestamp);}
  const groups=()=>stats.scene.children.filter((entry)=>entry.isGroup);
  const ship=()=>groups().find((entry)=>entry.children.some((child)=>child.isInstancedMesh&&child.count===56));
  const planets=()=>groups().filter((entry)=>entry.children.some((child)=>child.material?.uniforms?.uKind));
  return {api,stats,host,fallback,window,queuedFrames,failures,frame,ship,planets,project:sandbox.module.exports.destinationWorldPosition};
}

test('space scene renders a ready frame but does not start an inactive RAF',()=>{
  const run=setup();
  assert.ok(run.stats.frames>=1);assert.equal(run.stats.ready,1);
  assert.equal(run.host.dataset.sceneState,'ready');assert.equal(run.queuedFrames.size,0);
  assert.equal(run.host.children[0],run.fallback);assert.equal(run.host.children.length,2);
  assert.equal(run.stats.pixelRatio,1.5);assert.equal(run.stats.renderer.options.powerPreference,'low-power');
  assert.equal(run.stats.renderer.domElement.attributes.get('aria-hidden'),'true');
  assert.equal(typeof run.stats.renderer.debug.onShaderError,'function');
  run.api.dispose();
});

test('the chase ship is PBR, faceted and detailed with four independent engine plumes',()=>{
  const run=setup(),ship=run.ship();
  assert.ok(ship);assert.equal(ship.position.x,0);assert.ok(ship.position.y<0);
  assert.equal(ship.children.filter((child)=>child.isInstancedMesh).length,2);
  const materials=[];ship.traverse((object)=>{if(object.material)materials.push(object.material);});
  assert.ok(materials.filter((surface)=>surface.isMeshStandardMaterial).length>20);
  assert.equal(materials.filter((surface)=>surface.uniforms?.uBurn).length,4);
  assert.equal(run.planets().length,6);
  const kinds=run.planets().map((group)=>group.children[0].material.uniforms.uKind.value);
  assert.equal(new Set(kinds).size,6);
  const renderables=[];run.stats.scene.traverse((object)=>{if(object.isMesh||object.isPoints||object.isLine)renderables.push(object);});
  const shadowCasters=renderables.filter((object)=>object.castShadow);
  assert.ok(renderables.length+shadowCasters.length<180);
  run.api.dispose();
});

test('projection reproduces DOM centers and CSS-pixel radii on desktop and portrait screens',()=>{
  for(const [width,height]of[[1440,900],[390,844],[320,568]]){
    const run=setup({width,height}),camera=run.stats.camera;
    for(const [index,destination]of destinations.entries()){
      const group=run.planets()[index];
      const ndc=group.position.clone().project(camera);
      assert.ok(Math.abs((ndc.x+1)*.5-destination.x)<1e-8);
      assert.ok(Math.abs((1-ndc.y)*.5-destination.y)<1e-8);
      const pixelsPerUnit=height/(2*Math.tan(camera.fov*Math.PI/360)*104);
      assert.ok(Math.abs(group.scale.x*pixelsPerUnit-destination.radius)<1e-8);
    }
    const finite=run.project({x:NaN,y:NaN,radius:0},0,0);
    assert.ok(Object.values(finite).every(Number.isFinite));
    run.api.dispose();
  }
});

test('RAF activation is idempotent, capped at 30 fps and stops completely when suspended',()=>{
  const run=setup(),baseline=run.stats.frames;
  run.api.setActive(true);run.api.setActive(true);assert.equal(run.queuedFrames.size,1);
  run.frame(100);run.frame(116);assert.equal(run.stats.frames,baseline+1);
  run.frame(134);assert.equal(run.stats.frames,baseline+2);
  run.api.setActive(false);assert.equal(run.queuedFrames.size,0);
  assert.equal(run.host.dataset.spaceAnimating,'false');
  const stopped=run.stats.frames;run.frame(9000);assert.equal(run.stats.frames,stopped);
  run.api.setHovered('research');assert.equal(run.queuedFrames.size,0);
  run.api.setActive(true);run.frame(100000);assert.equal(run.stats.frames,stopped+1);
  run.api.dispose();
});

test('ship position stays screen-anchored while particles and selected planets approach',async()=>{
  const run=setup();run.api.setActive(true);
  const shipPosition=run.ship().position.clone();
  const planet=run.planets()[0],originalZ=planet.position.z;
  const lines=run.stats.scene.children.find((object)=>object.isLineSegments);
  const trailZ=lines.geometry.attributes.position.array[2];
  const result=run.api.travelTo('research');
  let previousDistance=Infinity;
  for(let time=100;time<=2000;time+=50){
    run.frame(time);assert.equal(run.ship().position.x,shipPosition.x);assert.equal(run.ship().position.y,shipPosition.y);
    const projected=planet.position.clone().project(run.stats.camera);
    const distance=Math.hypot(projected.x,projected.y);
    assert.ok(distance<=previousDistance+1e-8,'selected planet must converge toward the screen center, never outward');
    previousDistance=distance;
  }
  assert.equal(await result,true);
  assert.ok(planet.position.z>originalZ);
  assert.ok(previousDistance<1e-8);
  assert.notEqual(lines.geometry.attributes.position.array[2],trailZ);
  assert.ok(Math.abs(run.ship().rotation.z)<.11);
  run.api.dispose();
});

test('inactive and unknown destinations decline flight without scheduling work',async()=>{
  const run=setup();assert.equal(await run.api.travelTo('research'),false);
  assert.equal(run.queuedFrames.size,0);run.api.setActive(true);
  assert.equal(await run.api.travelTo('missing'),false);run.api.dispose();
  assert.equal(await run.api.travelTo('blog'),false);assert.equal(run.queuedFrames.size,0);
});

test('cancel, suspension and disposal each resolve a pending travel false exactly once',async()=>{
  for(const action of[(api)=>api.cancelTravel(),(api)=>api.setActive(false),(api)=>api.dispose()]){
    const run=setup();run.api.setActive(true);const result=run.api.travelTo('blog');
    run.frame(100);run.frame(200);action(run.api);
    assert.equal(await result,false);run.api.dispose();assert.equal(run.queuedFrames.size,0);
  }
});

test('replacing a flight cancels the old promise and completing the new one resolves true',async()=>{
  const run=setup();run.api.setActive(true);
  const first=run.api.travelTo('research'),second=run.api.travelTo('blog');
  assert.equal(await first,false);
  for(let time=100;time<2100;time+=50)run.frame(time);
  assert.equal(await second,true);run.api.dispose();
});

test('mobile budgets disable initial shadows and resize maintains DOM projection without a loop',()=>{
  const run=setup({width:390,height:844});
  assert.equal(run.stats.pixelRatio,1);assert.equal(run.stats.renderer.options.antialias,false);
  assert.equal(run.stats.renderer.shadowMap.enabled,false);
  run.host.clientWidth=1440;run.host.clientHeight=900;run.stats.resize();
  assert.equal(run.stats.pixelRatio,1.5);assert.equal(run.stats.camera.aspect,1.6);
  run.api.setDestinations([{id:'research',x:.5,y:.25,radius:58,kind:'earth'}]);
  const body=run.planets()[0],ndc=body.position.clone().project(run.stats.camera);
  assert.ok(Math.abs(ndc.x)<1e-8);assert.ok(Math.abs(ndc.y-.5)<1e-8);
  assert.equal(run.planets().filter((planet)=>planet.visible).length,1);
  assert.equal(run.queuedFrames.size,0);run.api.dispose();
});

test('initialization and initial render failures preserve fallback and report once',()=>{
  for(const options of[{initFailure:true},{renderFailure:true}]){
    const run=setup(options);assert.equal(run.failures.length,1);assert.equal(run.stats.ready,0);
    assert.equal(run.host.dataset.sceneState,'fallback');assert.deepEqual(run.host.children,[run.fallback]);
    run.api.setActive(true);run.api.dispose();assert.equal(run.queuedFrames.size,0);assert.equal(run.failures.length,1);
  }
});

test('GPU failure during travel settles false and releases every continuing frame',async()=>{
  const run=setup();run.api.setActive(true);const result=run.api.travelTo('research');
  run.stats.renderFailure=true;run.frame(100);
  assert.equal(await result,false);assert.equal(run.failures.length,1);
  assert.equal(run.queuedFrames.size,0);assert.equal(run.stats.disposals,1);
  assert.equal(run.host.dataset.sceneState,'fallback');assert.deepEqual(run.host.children,[run.fallback]);
});

test('context loss cancels travel and is terminal, even if the event fires twice',async()=>{
  const run=setup(),canvas=run.stats.renderer.domElement;
  const lost=canvas.events.get('webglcontextlost');let prevented=0;
  run.api.setActive(true);const result=run.api.travelTo('blog');
  lost({preventDefault(){prevented+=1;}});lost({preventDefault(){prevented+=1;}});
  assert.equal(await result,false);assert.equal(prevented,2);assert.equal(run.failures.length,1);
  run.api.setActive(true);assert.equal(run.queuedFrames.size,0);assert.equal(canvas.events.size,0);
});

test('disposal releases unique geometry/materials, context and observer, and is idempotent',()=>{
  const run=setup(),geometries=new Set(),materials=new Set(),released=new Set();
  run.stats.scene.traverse((object)=>{
    if(object.geometry)geometries.add(object.geometry);
    if(object.material)materials.add(object.material);
  });
  for(const resource of[...geometries,...materials])resource.addEventListener('dispose',()=>released.add(resource));
  run.api.setActive(true);run.api.dispose();run.api.dispose();run.api.setActive(true);
  assert.equal(released.size,geometries.size+materials.size);
  assert.equal(run.stats.disposals,1);assert.equal(run.stats.contextReleases,1);
  assert.equal(run.stats.disconnected,true);assert.equal(run.queuedFrames.size,0);
  assert.deepEqual(run.host.children,[run.fallback]);assert.equal(run.window.events.size,0);
});

test('without ResizeObserver, the resize fallback listener is removed on disposal',()=>{
  const run=setup({noObserver:true});assert.equal(typeof run.window.events.get('resize'),'function');
  run.api.dispose();assert.equal(run.window.events.size,0);
});

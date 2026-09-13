import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer
} from 'three';

const FRAME_INTERVAL = 1000 / 30;
const TAU = Math.PI * 2;

/**
 * A progressive, decorative enhancement. Its caller owns motion preferences and
 * visibility; failure never removes or replaces the host's static SVG fallback.
 */
export function createComputeScene(host, { onFailure } = {}) {
  let renderer;
  let canvas;
  let resizeObserver;
  let pointerTarget;
  let scene;
  let camera;
  let lattice;
  let rings;
  let active = false;
  let disposed = false;
  let failed = false;
  let rafId = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let width = 0;
  let height = 0;
  const geometries = new Set();
  const materials = new Set();
  const packets = [];
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const geometry = (value) => { geometries.add(value); return value; };
  const material = (value) => { materials.add(value); return value; };

  function stop() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastFrame = 0;
    host.dataset.sceneAnimating = 'false';
  }

  function release() {
    stop();
    resizeObserver?.disconnect();
    if (pointerTarget) {
      pointerTarget.removeEventListener('pointermove', onPointerMove);
      pointerTarget.removeEventListener('pointerleave', onPointerLeave);
    }
    if (canvas) canvas.removeEventListener('webglcontextlost', onContextLost);
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    geometries.clear();
    materials.clear();
    if (renderer) {
      renderer.dispose();
      // Release the context too; no restoration is attempted after fallback.
      renderer.forceContextLoss();
      renderer = null;
    }
    canvas?.remove();
  }

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    host.dataset.sceneState = 'fallback';
    // Even a driver error during cleanup must leave the document usable.
    try { release(); } catch { stop(); canvas?.remove(); }
    if (typeof onFailure === 'function') {
      try { onFailure(error); } catch { /* The optional enhancement stays isolated. */ }
    }
  }

  function onContextLost(event) {
    event.preventDefault();
    fail(new Error('The decorative WebGL context was lost.'));
  }

  function onPointerMove(event) {
    if (!active || !finePointer.matches || event.pointerType === 'touch') return;
    const bounds = pointerTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
  }

  function onPointerLeave() {
    pointerX = 0;
    pointerY = 0;
  }

  function render() {
    if (failed || disposed || !renderer || width <= 0 || height <= 0) return false;
    try {
      renderer.render(scene, camera);
      if (renderer.getContext().isContextLost()) throw new Error('WebGL is unavailable.');
      host.dataset.sceneState = 'ready';
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }

  function resize() {
    if (failed || disposed || !renderer) return;
    try {
      const nextWidth = Math.round(host.clientWidth);
      const nextHeight = Math.round(host.clientHeight);
      if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return;
      width = nextWidth;
      height = nextHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 220 || !finePointer.matches ? 1 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep both rings inside the viewport, including narrow responsive slots.
      camera.position.z = 5.8 / Math.min(1, camera.aspect);
      camera.updateProjectionMatrix();
      render();
    } catch (error) {
      fail(error);
    }
  }

  function update(delta) {
    elapsed += delta;
    const easing = Math.min(1, delta * 5);
    smoothX += (pointerX - smoothX) * easing;
    smoothY += (pointerY - smoothY) * easing;
    lattice.rotation.y = 0.62 + elapsed * 0.10 + smoothX * 0.18;
    lattice.rotation.x = 0.30 + Math.sin(elapsed * 0.25) * 0.07 + smoothY * 0.12;
    rings.rotation.y = Math.sin(elapsed * 0.13) * 0.16;
    rings.rotation.z = elapsed * 0.035;

    for (let index = 0; index < packets.length; index += 1) {
      const packet = packets[index];
      // Each packet follows an existing axis-aligned edge, turns, then loops.
      const progress = (elapsed * packet.speed + packet.phase) % 4;
      const edge = Math.floor(progress);
      const mix = progress - edge;
      const start = packet.path[edge];
      const end = packet.path[(edge + 1) % 4];
      packet.mesh.position.set(
        start[0] + (end[0] - start[0]) * mix,
        start[1] + (end[1] - start[1]) * mix,
        start[2] + (end[2] - start[2]) * mix
      );
    }
  }

  function frame(timestamp) {
    rafId = 0;
    if (!active || failed || disposed) return;
    const difference = timestamp - lastFrame;
    if (!lastFrame || difference >= FRAME_INTERVAL) {
      update(lastFrame ? Math.min(difference / 1000, 0.1) : 0);
      lastFrame = timestamp;
      render();
      if (failed || disposed) return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function setActive(value) {
    if (failed || disposed) return;
    if (!value) { stop(); onPointerLeave(); return; }
    if (active) return;
    active = true;
    lastFrame = 0;
    host.dataset.sceneAnimating = 'true';
    rafId = requestAnimationFrame(frame);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    host.dataset.sceneState = 'fallback';
    try { release(); } catch { stop(); canvas?.remove(); }
  }

  try {
    host.dataset.sceneAnimating = 'false';
    host.dataset.sceneState = 'fallback';
    canvas = document.createElement('canvas');
    canvas.className = 'scene-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.debug.onShaderError = () => { throw new Error('The decorative WebGL shader could not compile.'); };
    renderer.setClearColor(0xffffff, 0);
    scene = new Scene();
    scene.fog = new Fog(0xf8fcff, 7.2, 12);
    camera = new PerspectiveCamera(40, 1, 0.1, 30);
    camera.position.set(0, 0, 5.8);
    lattice = new Group();
    lattice.rotation.set(0.30, 0.62, -0.08);
    scene.add(lattice);
    scene.add(new AmbientLight(0xffffff, 2.0));
    const keyLight = new DirectionalLight(0xc7eaff, 2.5);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const sphereGeometry = geometry(new SphereGeometry(1, 12, 8));
    const nodeMaterial = material(new MeshLambertMaterial({ color: 0xffffff }));
    const nodes = new InstancedMesh(sphereGeometry, nodeMaterial, 27);
    const nodeTransform = new Object3D();
    const colors = [new Color(0x315a7b), new Color(0x79cafa), new Color(0xcf4e62)];
    const coordinates = [-1, 0, 1];
    const edges = [];
    let nodeIndex = 0;
    for (const x of coordinates) {
      for (const y of coordinates) {
        for (const z of coordinates) {
          const extent = Math.abs(x) + Math.abs(y) + Math.abs(z);
          nodeTransform.position.set(x, y, z);
          nodeTransform.scale.setScalar(extent === 0 ? 0.12 : extent === 1 ? 0.072 : 0.045);
          nodeTransform.updateMatrix();
          nodes.setMatrixAt(nodeIndex, nodeTransform.matrix);
          nodes.setColorAt(nodeIndex, colors[extent === 0 ? 2 : extent % 2]);
          nodeIndex += 1;
          if (x < 1) edges.push(x, y, z, x + 1, y, z);
          if (y < 1) edges.push(x, y, z, x, y + 1, z);
          if (z < 1) edges.push(x, y, z, x, y, z + 1);
        }
      }
    }
    nodes.instanceMatrix.needsUpdate = true;
    nodes.instanceColor.needsUpdate = true;
    lattice.add(nodes);
    const edgeGeometry = geometry(new BufferGeometry());
    edgeGeometry.setAttribute('position', new Float32BufferAttribute(edges, 3));
    lattice.add(new LineSegments(edgeGeometry, material(new LineBasicMaterial({ color: 0x6b9ebc, transparent: true, opacity: 0.48 }))));

    rings = new Group();
    const ringPoints = [];
    for (let point = 0; point < 96; point += 1) {
      const angle = (point / 96) * TAU;
      ringPoints.push(Math.cos(angle) * 1.88, Math.sin(angle) * 1.88, 0);
    }
    const ringGeometry = geometry(new BufferGeometry());
    ringGeometry.setAttribute('position', new Float32BufferAttribute(ringPoints, 3));
    const ringMaterial = material(new LineBasicMaterial({ color: 0x79cafa, transparent: true, opacity: 0.38 }));
    const firstRing = new LineLoop(ringGeometry, ringMaterial);
    firstRing.rotation.set(1.03, 0.10, -0.20);
    const secondRing = new LineLoop(ringGeometry, ringMaterial);
    secondRing.rotation.set(0.25, 1.05, 0.38);
    rings.add(firstRing, secondRing);
    scene.add(rings);

    const packetMaterial = material(new MeshBasicMaterial({ color: 0x348dca }));
    const accentMaterial = material(new MeshBasicMaterial({ color: 0xcf4e62 }));
    const paths = [
      [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
      [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]],
      [[0, -1, -1], [0, 1, -1], [0, 1, 1], [0, -1, 1]],
      [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]],
      [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]
    ];
    for (let index = 0; index < paths.length; index += 1) {
      const mesh = new Mesh(sphereGeometry, index === 0 ? accentMaterial : packetMaterial);
      mesh.scale.setScalar(0.063);
      lattice.add(mesh);
      packets.push({ mesh, path: paths[index], phase: index * 0.63, speed: 0.22 + index * 0.018 });
    }
    update(0);
    host.append(canvas);
    pointerTarget = host.closest('.compute-scene') || host;
    pointerTarget.addEventListener('pointermove', onPointerMove, { passive: true });
    pointerTarget.addEventListener('pointerleave', onPointerLeave, { passive: true });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
  } catch (error) {
    fail(error);
  }

  return { setActive, dispose };
}

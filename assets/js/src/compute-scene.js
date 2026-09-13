import {
  ACESFilmicToneMapping, AdditiveBlending, AmbientLight, BoxGeometry,
  BufferGeometry, Color, DirectionalLight, ExtrudeGeometry, Float32BufferAttribute,
  Group, InstancedMesh, LineBasicMaterial, LineLoop, LineSegments, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PointLight, Scene, Shape, SphereGeometry, TorusGeometry, WebGLRenderer
} from 'three';

const FRAME_INTERVAL = 1000 / 30;
const TAU = Math.PI * 2;
const CHAPTER_COLORS = [0x7bddff, 0x40efda, 0x87bbff, 0xb6adff, 0x7bddff];
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/**
 * An asset-free, scroll-choreographed compute sculpture. Its caller owns motion
 * preferences and visibility; the untouched SVG remains the accessible fallback.
 * Progress/chapter setters only change targets, never start or render a frame.
 */
export function createComputeScene(host, { onFailure } = {}) {
  let renderer;
  let canvas;
  let resizeObserver;
  let scene;
  let camera;
  let universe;
  let core;
  let orbits;
  let dust;
  let keyLight;
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
  let targetProgress = 0;
  let smoothProgress = 0;
  let targetChapter = 0;
  let smoothChapter = 0;
  let width = 0;
  let height = 0;
  let viewWidth = 1;
  let viewHeight = 1;
  let compact = false;
  let pointerAttached = false;
  const geometries = new Set();
  const materials = new Set();
  const layers = [];
  const satellites = [];
  const packets = [];
  const accentMaterials = [];
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const targetColor = new Color(CHAPTER_COLORS[0]);
  const accentColor = targetColor.clone();
  const geometry = (value) => { geometries.add(value); return value; };
  const material = (value) => { materials.add(value); return value; };
  const accent = (value) => { accentMaterials.push(value); return material(value); };

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
    if (pointerAttached) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('blur', onPointerLeave);
      pointerAttached = false;
    }
    if (canvas) canvas.removeEventListener('webglcontextlost', onContextLost);
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    geometries.clear();
    materials.clear();
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
    if (typeof onFailure === 'function') {
      try { onFailure(error); } catch { /* Keep this optional enhancement isolated. */ }
    }
  }

  function onContextLost(event) {
    event.preventDefault();
    fail(new Error('The decorative WebGL context was lost.'));
  }

  function onPointerMove(event) {
    if (!active || !finePointer.matches || event.pointerType === 'touch') return;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
    pointerY = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
  }

  function onPointerLeave() { pointerX = 0; pointerY = 0; }
  function onPointerOut(event) { if (!event.relatedTarget) onPointerLeave(); }

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
      compact = width < 720;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 720 || !finePointer.matches ? 1 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const tangent = Math.tan(camera.fov * Math.PI / 360);
      // Always fit the orbital field horizontally on portrait screens.
      camera.position.z = Math.max(10.5, 6.8 / (2 * tangent * camera.aspect));
      viewHeight = 2 * tangent * camera.position.z;
      viewWidth = viewHeight * camera.aspect;
      camera.updateProjectionMatrix();
      pose();
      render();
    } catch (error) { fail(error); }
  }

  function pose() {
    if (!universe) return;
    // A single fixed canvas: copy sits left on desktop, sculpture below on mobile.
    universe.position.x = compact ? 0 : viewWidth * (0.235 - Math.sin(smoothProgress * Math.PI) * 0.028);
    universe.position.y = (compact ? -viewHeight * 0.16 : -0.06) + Math.sin(elapsed * 0.42) * 0.055;
    universe.rotation.y = smoothX * 0.065;
    universe.rotation.x = smoothY * 0.045;
    core.rotation.set(
      0.54 + Math.sin(elapsed * 0.2) * 0.045 + smoothProgress * 0.24 + smoothY * 0.07,
      -0.64 + elapsed * 0.032 + smoothProgress * 1.8 + smoothX * 0.12,
      -0.14 + Math.sin(smoothProgress * Math.PI * 2) * 0.18
    );
    const spread = 1 + Math.sin(smoothProgress * Math.PI) * 1.3 + Math.sin(smoothChapter * Math.PI / 4) * 0.22;
    for (const layer of layers) {
      layer.group.position.y = layer.y * spread;
      layer.group.rotation.y = Math.sin(smoothProgress * Math.PI) * layer.index * 0.075;
    }
    orbits.rotation.set(0.36 + smoothProgress * 0.14, elapsed * 0.035 + smoothProgress * 0.4, -0.22);
    dust.rotation.y = elapsed * 0.012 - smoothProgress * 0.2;
    dust.rotation.z = smoothProgress * 0.12;
    for (const satellite of satellites) {
      const angle = elapsed * satellite.speed + satellite.phase + smoothProgress * 0.9;
      satellite.group.position.set(Math.cos(angle) * satellite.radius, Math.sin(angle * 1.4) * 0.54, Math.sin(angle) * satellite.radius * 0.65);
      satellite.group.rotation.set(angle * 0.4, -angle, 0.12);
    }
    for (const packet of packets) {
      const angle = elapsed * packet.speed + packet.phase;
      packet.mesh.position.set(Math.cos(angle) * packet.radius, Math.sin(angle) * packet.radius, 0);
    }
    for (const value of accentMaterials) value.color.copy(accentColor);
    keyLight.color.copy(accentColor);
  }

  function update(delta) {
    elapsed += delta;
    const easing = 1 - Math.exp(-delta * 4);
    smoothX += (pointerX - smoothX) * easing;
    smoothY += (pointerY - smoothY) * easing;
    smoothProgress += (targetProgress - smoothProgress) * easing;
    smoothChapter += (targetChapter - smoothChapter) * easing;
    accentColor.lerp(targetColor, easing);
    pose();
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

  function setProgress(value) {
    if (failed || disposed || !Number.isFinite(value)) return;
    targetProgress = clamp(value, 0, 1);
  }

  function setChapter(value) {
    if (failed || disposed || !Number.isFinite(value)) return;
    targetChapter = clamp(Math.round(value), 0, CHAPTER_COLORS.length - 1);
    targetColor.setHex(CHAPTER_COLORS[targetChapter]);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    host.dataset.sceneState = 'fallback';
    try { release(); } catch { stop(); canvas?.remove(); }
  }

  function roundedPlate(size, thickness, radius = 0.09) {
    const half = size / 2;
    const shape = new Shape();
    shape.moveTo(-half + radius, -half);
    shape.lineTo(half - radius, -half);
    shape.quadraticCurveTo(half, -half, half, -half + radius);
    shape.lineTo(half, half - radius);
    shape.quadraticCurveTo(half, half, half - radius, half);
    shape.lineTo(-half + radius, half);
    shape.quadraticCurveTo(-half, half, -half, half - radius);
    shape.lineTo(-half, -half + radius);
    shape.quadraticCurveTo(-half, -half, -half + radius, -half);
    const result = geometry(new ExtrudeGeometry(shape, {
      depth: thickness, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.024, bevelThickness: 0.018, steps: 1, curveSegments: 4
    }));
    result.rotateX(-Math.PI / 2);
    result.translate(0, -thickness / 2, 0);
    return result;
  }

  function lineSegments(values, lineMaterial) {
    const buffer = geometry(new BufferGeometry());
    buffer.setAttribute('position', new Float32BufferAttribute(values, 3));
    return new LineSegments(buffer, lineMaterial);
  }

  function addPlateRim(group, size, y, rimMaterial) {
    const half = size / 2;
    group.add(lineSegments([
      -half, y, -half, half, y, -half, half, y, -half, half, y, half,
      half, y, half, -half, y, half, -half, y, half, -half, y, -half
    ], rimMaterial));
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
    renderer.setClearColor(0x060b15, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    scene = new Scene();
    camera = new PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(0, 0, 10.5);
    universe = new Group();
    universe.name = 'compute-universe';
    core = new Group();
    core.name = 'processor-stack';
    universe.add(core);
    scene.add(universe);
    scene.add(new AmbientLight(0x8cb8dc, 1.6));
    const whiteLight = new DirectionalLight(0xf0f8ff, 4.8);
    whiteLight.position.set(-3, 7, 5);
    scene.add(whiteLight);
    keyLight = new DirectionalLight(CHAPTER_COLORS[0], 3.8);
    keyLight.position.set(5, 1, -3);
    scene.add(keyLight);
    const softFill = new DirectionalLight(0x5f7ed8, 2.3);
    softFill.position.set(-5, -3, 2);
    scene.add(softFill);
    const coreGlow = new PointLight(0x63dfff, 12, 7, 2);
    coreGlow.position.set(0, 1, 1);
    universe.add(coreGlow);

    const substrate = material(new MeshStandardMaterial({ color: 0x17304b, metalness: 0.62, roughness: 0.3 }));
    const silver = material(new MeshStandardMaterial({ color: 0x9bc1d6, metalness: 0.74, roughness: 0.23 }));
    const darkMetal = material(new MeshStandardMaterial({ color: 0x0c1729, metalness: 0.55, roughness: 0.25 }));
    const silicon = material(new MeshStandardMaterial({ color: 0x285b82, emissive: 0x0a243a, emissiveIntensity: 0.55, metalness: 0.7, roughness: 0.19 }));
    const pinsMaterial = material(new MeshStandardMaterial({ color: 0xa6cfdb, metalness: 0.75, roughness: 0.3 }));
    const rimMaterial = accent(new LineBasicMaterial({ color: CHAPTER_COLORS[0], transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
    const traceMaterial = accent(new LineBasicMaterial({ color: CHAPTER_COLORS[0], transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false }));
    const brightMaterial = accent(new MeshBasicMaterial({ color: CHAPTER_COLORS[0] }));
    const plateSizes = [3.4, 3.05, 2.68, 2.25, 1.55];
    const thicknesses = [0.13, 0.09, 0.12, 0.13, 0.2];
    const plateMaterials = [darkMetal, silver, substrate, darkMetal, silver];
    const baseHeights = [-0.8, -0.39, 0, 0.38, 0.83];

    for (let index = 0; index < plateSizes.length; index += 1) {
      const group = new Group();
      group.name = `processor-layer-${index}`;
      group.add(new Mesh(roundedPlate(plateSizes[index], thicknesses[index]), plateMaterials[index]));
      addPlateRim(group, plateSizes[index] - 0.06, thicknesses[index] / 2 + 0.02, rimMaterial);
      const tracePositions = [];
      const half = plateSizes[index] / 2 - 0.12;
      const traceY = thicknesses[index] / 2 + 0.025;
      for (let lane = 0; lane < 12; lane += 1) {
        const from = -half + (lane + 0.5) * half * 2 / 12;
        for (const side of [-1, 1]) {
          const inward = half * 0.64;
          tracePositions.push(from, traceY, side * half, from, traceY, side * inward);
          tracePositions.push(from, traceY, side * inward, from * 0.66, traceY, side * inward * 0.68);
          tracePositions.push(side * half, traceY, from, side * inward, traceY, from);
          tracePositions.push(side * inward, traceY, from, side * inward * 0.68, traceY, from * 0.66);
        }
      }
      group.add(lineSegments(tracePositions, traceMaterial));
      core.add(group);
      layers.push({ group, index: index - 2, y: baseHeights[index] });
    }

    // Fine-pitch contacts and die tiles use instancing, not hundreds of draw calls.
    const pinGeometry = geometry(new BoxGeometry(0.025, 0.11, 0.08));
    const pins = new InstancedMesh(pinGeometry, pinsMaterial, 192);
    pins.name = 'processor-contacts';
    const transform = new Object3D();
    for (let side = 0; side < 4; side += 1) {
      for (let pin = 0; pin < 48; pin += 1) {
        const along = -1.52 + pin * 3.04 / 47;
        transform.position.set(side < 2 ? along : (side === 2 ? -1.62 : 1.62), -0.1, side < 2 ? (side === 0 ? -1.62 : 1.62) : along);
        transform.rotation.y = side < 2 ? 0 : Math.PI / 2;
        transform.updateMatrix();
        pins.setMatrixAt(side * 48 + pin, transform.matrix);
      }
    }
    pins.instanceMatrix.needsUpdate = true;
    layers[0].group.add(pins);

    const tileGeometry = geometry(new BoxGeometry(0.31, 0.035, 0.31));
    const tiles = new InstancedMesh(tileGeometry, silicon, 16);
    tiles.name = 'silicon-dies';
    for (let tile = 0; tile < 16; tile += 1) {
      transform.position.set((tile % 4 - 1.5) * 0.345, 0.128, (Math.floor(tile / 4) - 1.5) * 0.345);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      tiles.setMatrixAt(tile, transform.matrix);
    }
    tiles.instanceMatrix.needsUpdate = true;
    layers[4].group.add(tiles);
    const die = new Mesh(roundedPlate(0.63, 0.045, 0.025), silicon);
    die.position.y = 0.175;
    layers[4].group.add(die);
    addPlateRim(layers[4].group, 0.64, 0.21, rimMaterial);
    const coreMark = new Mesh(geometry(new BoxGeometry(0.25, 0.013, 0.035)), brightMaterial);
    coreMark.position.set(0, 0.212, 0);
    layers[4].group.add(coreMark);
    const markCross = new Mesh(coreMark.geometry, brightMaterial);
    markCross.position.copy(coreMark.position);
    markCross.rotation.y = Math.PI / 2;
    layers[4].group.add(markCross);

    // Three precise orbital tracks, with travelling packets rather than bloom.
    orbits = new Group();
    orbits.name = 'data-orbits';
    const orbitMaterial = accent(new LineBasicMaterial({ color: CHAPTER_COLORS[0], transparent: true, opacity: 0.2, blending: AdditiveBlending, depthWrite: false }));
    const sphereGeometry = geometry(new SphereGeometry(1, 10, 7));
    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
      const orbit = new Group();
      const radius = 2.62 + ringIndex * 0.18;
      const points = [];
      for (let point = 0; point < 160; point += 1) {
        const angle = point / 160 * TAU;
        points.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      }
      const ringGeometry = geometry(new BufferGeometry());
      ringGeometry.setAttribute('position', new Float32BufferAttribute(points, 3));
      orbit.add(new LineLoop(ringGeometry, orbitMaterial));
      orbit.rotation.set(1.04 + ringIndex * 0.5, ringIndex * 0.48, ringIndex * 0.42);
      for (let index = 0; index < 3; index += 1) {
        const mesh = new Mesh(sphereGeometry, brightMaterial);
        mesh.scale.setScalar(index === 0 ? 0.044 : 0.025);
        orbit.add(mesh);
        packets.push({ mesh, radius, speed: 0.16 + ringIndex * 0.035, phase: index * TAU / 3 + ringIndex });
      }
      orbits.add(orbit);
    }
    universe.add(orbits);

    // Floating memory modules establish a distributed-system silhouette.
    const satelliteGeometry = roundedPlate(0.37, 0.12, 0.035);
    const satelliteInlay = geometry(new BoxGeometry(0.23, 0.025, 0.23));
    for (let index = 0; index < 4; index += 1) {
      const group = new Group();
      group.name = `memory-satellite-${index}`;
      group.add(new Mesh(satelliteGeometry, silver));
      const inlay = new Mesh(satelliteInlay, silicon);
      inlay.position.y = 0.09;
      group.add(inlay);
      addPlateRim(group, 0.34, 0.09, rimMaterial);
      universe.add(group);
      satellites.push({ group, radius: 2.65 + index * 0.12, speed: 0.046 + index * 0.007, phase: index * TAU / 4 + 0.5 });
    }

    // Deterministic, instanced particle halo: no textures, random jumps, or fetches.
    dust = new Group();
    dust.name = 'compute-particle-field';
    const dustMaterial = accent(new MeshBasicMaterial({ color: CHAPTER_COLORS[0], transparent: true, opacity: 0.38, blending: AdditiveBlending, depthWrite: false }));
    const stars = new InstancedMesh(sphereGeometry, dustMaterial, 260);
    stars.name = 'compute-particles';
    for (let index = 0; index < 260; index += 1) {
      const theta = index * 2.399963229728653;
      const radius = 2.65 + (Math.sin(index * 73.17) * 0.5 + 0.5) * 1.12;
      const vertical = (Math.sin(index * 39.71) * 0.5 + 0.5) * 2 - 1;
      transform.position.set(Math.cos(theta) * radius, vertical * 2.4, Math.sin(theta) * radius);
      transform.rotation.set(0, 0, 0);
      transform.scale.setScalar(index % 17 === 0 ? 0.02 : 0.009);
      transform.updateMatrix();
      stars.setMatrixAt(index, transform.matrix);
    }
    stars.instanceMatrix.needsUpdate = true;
    dust.add(stars);
    universe.add(dust);

    // A thin physical equator supplies a brighter edge within the fine orbits.
    const equator = new Mesh(geometry(new TorusGeometry(2.4, 0.006, 4, 128)), material(new MeshBasicMaterial({ color: 0x5b839d, transparent: true, opacity: 0.32, depthWrite: false })));
    equator.rotation.x = Math.PI / 2;
    core.add(equator);
    pose();
    host.append(canvas);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    pointerAttached = true;
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
  } catch (error) { fail(error); }

  return { setActive, setProgress, setChapter, dispose };
}

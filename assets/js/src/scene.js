// Paper-plane architectural WebGL engine for Kuo Li's homepage.
// Zero third-party runtime dependencies: flat-faceted procedural geometry,
// tension-cable wireframes, 5-band cyanotype/void GLSL ramp, Etihad Stadium,
// Blue Moon spire with turntable pendulum, and a phase-locked axial GPU fan
// flythrough into the heatsink canyon and glowing silicon die.

export const BLADE_COUNT = 9;
export const BLADE_STEP = (Math.PI * 2) / BLADE_COUNT;
export const FAN_HUB_CENTER = Object.freeze([0, -2.7, -6.25]);
export const FAN_PASS_RADIUS = 1.42;

export const THEMES = Object.freeze({
  light: Object.freeze({
    voidTop: [0.965, 0.99, 1.0],
    voidBottom: [0.875, 0.957, 0.992],
    sanctuaryBg: [0.045, 0.145, 0.42],
    groundHex: '#dff4fd',
    sanctuaryHex: '#0b256b',
    ramp: [
      [0.039, 0.165, 0.435], // deep ultramarine recess
      [0.133, 0.365, 0.675], // cobalt shadow plane
      [0.424, 0.671, 0.867], // Manchester City sky blue (#6cabdd)
      [0.737, 0.922, 0.976], // pale aqua lit facet
      [0.957, 0.988, 1.000]  // bright crisp paper white
    ],
    wire: [0.16, 0.45, 0.76, 0.68],
    chalk: [0.96, 0.99, 1.0, 0.92],
    accent: [0.878, 0.188, 0.306], // #e0304e crimson 1% focal accent
    glow: [0.88, 0.98, 1.0],
    mote: [0.22, 0.64, 0.92]
  }),
  dark: Object.freeze({
    voidTop: [0.008, 0.018, 0.048],
    voidBottom: [0.020, 0.052, 0.125],
    sanctuaryBg: [0.012, 0.036, 0.105],
    groundHex: '#050d20',
    sanctuaryHex: '#03091b',
    ramp: [
      [0.022, 0.068, 0.175], // midnight shadow
      [0.072, 0.215, 0.455], // deep sapphire
      [0.185, 0.505, 0.795], // cerulean midtone
      [0.455, 0.815, 0.960], // bioluminescent aqua facet
      [0.855, 0.968, 1.000]  // moonlit crisp highlight
    ],
    wire: [0.44, 0.83, 0.98, 0.74],
    chalk: [0.76, 0.95, 1.0, 0.88],
    accent: [0.935, 0.235, 0.355],
    glow: [0.84, 0.97, 1.0],
    mote: [0.76, 0.95, 1.0]
  })
});

const FRAME_INTERVAL = 1000 / 55;
const MOTE_COUNT = 168;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- Minimal 4x4 column-major matrix utilities ---
function mat4Identity() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function mat4Multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let i = 0; i < 4; i += 1) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    out[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
  return out;
}

function mat4Perspective(out, fovRad, aspect, near, far) {
  const f = 1 / Math.tan(fovRad * 0.5);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / (aspect || 1);
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function mat4LookAt(out, eye, target, up) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len; xy /= len; xz /= len;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

function mat4Compose(out, tx, ty, tz, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  const cx = Math.cos(rx), srx = Math.sin(rx);
  const cy = Math.cos(ry), sry = Math.sin(ry);
  const cz = Math.cos(rz), srz = Math.sin(rz);
  out[0] = cy * cz * sx;
  out[1] = cy * srz * sx;
  out[2] = -sry * sx;
  out[3] = 0;
  out[4] = (srx * sry * cz - cx * srz) * sy;
  out[5] = (srx * sry * srz + cx * cz) * sy;
  out[6] = srx * cy * sy;
  out[7] = 0;
  out[8] = (cx * sry * cz + srx * srz) * sz;
  out[9] = (cx * sry * srz - srx * cz) * sz;
  out[10] = cx * cy * sz;
  out[11] = 0;
  out[12] = tx;
  out[13] = ty;
  out[14] = tz;
  out[15] = 1;
  return out;
}

// --- Flat-faceted paper-plane geometry builders ---
class MeshBuilder {
  constructor() {
    this.data = [];
    this.vertexCount = 0;
  }

  tri(a, b, c, mat = 0.5) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-8) return;
    nx /= len; ny /= len; nz /= len;
    this.data.push(
      a[0], a[1], a[2], nx, ny, nz, mat,
      b[0], b[1], b[2], nx, ny, nz, mat,
      c[0], c[1], c[2], nx, ny, nz, mat
    );
    this.vertexCount += 3;
  }

  quad(a, b, c, d, mat = 0.5) {
    this.tri(a, b, c, mat);
    this.tri(a, c, d, mat);
  }

  box(cx, cy, cz, wx, hy, dz, mat = 0.5, yaw = 0) {
    const hx = wx * 0.5, hh = hy * 0.5, hz = dz * 0.5;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const pt = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
    const p000 = pt(-hx, -hh, -hz), p100 = pt(hx, -hh, -hz), p101 = pt(hx, -hh, hz), p001 = pt(-hx, -hh, hz);
    const p010 = pt(-hx, hh, -hz), p110 = pt(hx, hh, -hz), p111 = pt(hx, hh, hz), p011 = pt(-hx, hh, hz);
    this.quad(p001, p101, p111, p011, mat); // +Z front
    this.quad(p100, p000, p010, p110, mat); // -Z back
    this.quad(p011, p111, p110, p010, Math.min(0.98, mat < 1.5 ? mat + 0.08 : mat)); // +Y top
    this.quad(p000, p100, p101, p001, mat < 1.5 ? Math.max(0.04, mat - 0.12) : mat); // -Y bottom
    this.quad(p101, p100, p110, p111, mat); // +X right
    this.quad(p000, p001, p011, p010, mat); // -X left
  }

  frustum(cx, y0, cz, rx0, rz0, rx1, rz1, height, segments, mat = 0.5, capTop = true, capBottom = false) {
    const y1 = y0 + height;
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      const b0 = [cx + rx0 * c0, y0, cz + rz0 * s0];
      const b1 = [cx + rx0 * c1, y0, cz + rz0 * s1];
      const t1 = [cx + rx1 * c1, y1, cz + rz1 * s1];
      const t0 = [cx + rx1 * c0, y1, cz + rz1 * s0];
      this.quad(b0, t0, t1, b1, mat);
      if (capTop && rx1 > 1e-4) this.tri([cx, y1, cz], t0, t1, mat < 1.5 ? Math.min(0.98, mat + 0.1) : mat);
      if (capBottom && rx0 > 1e-4) this.tri([cx, y0, cz], b1, b0, mat);
    }
  }

  gableHouse(cx, y0, cz, wx, hy, roofH, dz, yaw = 0, mat = 0.56) {
    this.box(cx, y0 + hy * 0.5, cz, wx, hy, dz, mat, yaw);
    const hx = wx * 0.52, hz = dz * 0.52;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const pt = (x, y, z) => [cx + x * c + z * s, y0 + y, cz - x * s + z * c];
    const fl = pt(-hx, hy, hz), fr = pt(hx, hy, hz), bl = pt(-hx, hy, -hz), br = pt(hx, hy, -hz);
    const rf = pt(0, hy + roofH, hz), rb = pt(0, hy + roofH, -hz);
    this.tri(fl, fr, rf, mat + 0.06);
    this.tri(br, bl, rb, mat + 0.02);
    this.quad(fl, rf, rb, bl, Math.min(0.95, mat + 0.14));
    this.quad(fr, br, rb, rf, Math.max(0.18, mat - 0.08));
    // Dark cyanotype paper window recess on front wall
    this.box(cx + 0 * c + (dz * 0.505) * s, y0 + hy * 0.52, cz + (dz * 0.505) * c, wx * 0.36, hy * 0.42, 0.03, 0.06, yaw);
  }

  finish() {
    return { array: new Float32Array(this.data), count: this.vertexCount };
  }
}

class LineBuilder {
  constructor() {
    this.data = [];
    this.vertexCount = 0;
  }

  segment(a, b, kind = 0) {
    this.data.push(a[0], a[1], a[2], kind, b[0], b[1], b[2], kind);
    this.vertexCount += 2;
  }

  catenary(a, b, sag, steps = 10, kind = 0) {
    let prev = a;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const dip = 4 * t * (1 - t) * sag;
      const next = [lerp(a[0], b[0], t), lerp(a[1], b[1], t) - dip, lerp(a[2], b[2], t)];
      this.segment(prev, next, kind);
      prev = next;
    }
  }

  ring(cx, cy, cz, rx, rz, segments = 28, kind = 0, tiltX = 0, tiltZ = 0) {
    const cxr = Math.cos(tiltX), sxr = Math.sin(tiltX);
    const czr = Math.cos(tiltZ), szr = Math.sin(tiltZ);
    const pt = (ang) => {
      let x = rx * Math.cos(ang), y = 0, z = rz * Math.sin(ang);
      const y1 = y * cxr - z * sxr, z1 = y * sxr + z * cxr;
      const x2 = x * czr - y1 * szr, y2 = x * szr + y1 * czr;
      return [cx + x2, cy + y2, cz + z1];
    };
    let prev = pt(0);
    for (let i = 1; i <= segments; i += 1) {
      const next = pt((i / segments) * Math.PI * 2);
      this.segment(prev, next, kind);
      prev = next;
    }
  }

  finish() {
    return { array: new Float32Array(this.data), count: this.vertexCount };
  }
}

// --- Zone 1: Manchester City's Etihad Stadium ---
// Recognizable by its 12 tall cable-stayed masts, fanning stay-cables,
// saddle-wave curved elliptical canopy, 4 cylindrical spiral ramp rotundas,
// and sky-blue sunken seating bowl.
function buildEtihad(solid, lines) {
  const cx = -5.1, cy = 0.0, cz = 2.1;
  const yaw = 0.30;
  const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
  const toWorld = (x, y, z) => [cx + x * cyaw + z * syaw, cy + y, cz - x * syaw + z * cyaw];

  // Elliptical stepped concourse podium
  const segs = 28;
  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    solid.quad(
      toWorld(4.15 * c0, -0.35, 3.40 * s0),
      toWorld(4.15 * c0, 0.16, 3.40 * s0),
      toWorld(4.15 * c1, 0.16, 3.40 * s1),
      toWorld(4.15 * c1, -0.35, 3.40 * s1),
      0.52
    );
    // 3 sunken sky-blue seating tiers sloping inward toward pitch
    const tiers = [
      [3.55, 2.88, 0.96, 3.05, 2.45, 0.72, 0.48],
      [3.05, 2.45, 0.72, 2.55, 2.00, 0.48, 0.42],
      [2.55, 2.00, 0.48, 2.05, 1.56, 0.24, 0.36]
    ];
    for (const [rxA, rzA, yA, rxB, rzB, yB, tone] of tiers) {
      solid.quad(
        toWorld(rxA * c0, yA, rzA * s0),
        toWorld(rxB * c0, yB, rzB * s0),
        toWorld(rxB * c1, yB, rzB * s1),
        toWorld(rxA * c1, yA, rzA * s1),
        tone
      );
    }
    // Outer stadium bowl facade between concourse and roof eave
    const wave0 = 1.44 + 0.44 * Math.cos(2 * a0);
    const wave1 = 1.44 + 0.44 * Math.cos(2 * a1);
    solid.quad(
      toWorld(3.62 * c0, 0.16, 2.95 * s0),
      toWorld(3.72 * c0, wave0 - 0.12, 3.04 * s0),
      toWorld(3.72 * c1, wave1 - 0.12, 3.04 * s1),
      toWorld(3.62 * c1, 0.16, 2.95 * s1),
      i % 2 === 0 ? 0.56 : 0.44
    );

    // Sweeping Saddle-Wave Pleated Paper Roof Canopy
    const ridgeA = (i % 2 === 0 ? 0.05 : -0.03);
    const ridgeB = ((i + 1) % 2 === 0 ? 0.05 : -0.03);
    const out0 = toWorld(3.84 * c0, wave0 + ridgeA, 3.14 * s0);
    const out1 = toWorld(3.84 * c1, wave1 + ridgeB, 3.14 * s1);
    const in0 = toWorld(2.02 * c0, 1.24 + 0.28 * Math.cos(2 * a0) + ridgeA * 0.6, 1.55 * s0);
    const in1 = toWorld(2.02 * c1, 1.24 + 0.28 * Math.cos(2 * a1) + ridgeB * 0.6, 1.55 * s1);
    solid.quad(out0, in0, in1, out1, 0.88);
    solid.quad(out1, in1, in0, out0, 0.34); // underside shade

    // Inner catenary tension ring + radial cable spokes
    const cat0 = toWorld(1.78 * c0, 1.16 + 0.22 * Math.cos(2 * a0), 1.35 * s0);
    const cat1 = toWorld(1.78 * c1, 1.16 + 0.22 * Math.cos(2 * a1), 1.35 * s1);
    lines.segment(cat0, cat1, 0);
    if (i % 2 === 0) lines.segment(in0, cat0, 0);
  }

  // Sunken pitch floor + crisp chalk markings + 2 goals
  solid.quad(
    toWorld(-2.06, 0.22, 1.58),
    toWorld(2.06, 0.22, 1.58),
    toWorld(2.06, 0.22, -1.58),
    toWorld(-2.06, 0.22, -1.58),
    0.68
  );
  const pw = 1.55, pz = 1.02, py = 0.235;
  lines.segment(toWorld(-pw, py, -pz), toWorld(pw, py, -pz), 2);
  lines.segment(toWorld(pw, py, -pz), toWorld(pw, py, pz), 2);
  lines.segment(toWorld(pw, py, pz), toWorld(-pw, py, pz), 2);
  lines.segment(toWorld(-pw, py, pz), toWorld(-pw, py, -pz), 2);
  lines.segment(toWorld(0, py, -pz), toWorld(0, py, pz), 2);
  for (let i = 0; i < 20; i += 1) {
    const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
    lines.segment(toWorld(0.32 * Math.cos(a0), py, 0.32 * Math.sin(a0)), toWorld(0.32 * Math.cos(a1), py, 0.32 * Math.sin(a1)), 2);
  }
  for (const side of [-1, 1]) {
    const gx = side * pw;
    lines.segment(toWorld(gx, py, -0.34), toWorld(gx, py + 0.22, -0.34), 2);
    lines.segment(toWorld(gx, py, 0.34), toWorld(gx, py + 0.22, 0.34), 2);
    lines.segment(toWorld(gx, py + 0.22, -0.34), toWorld(gx, py + 0.22, 0.34), 2);
  }

  // 12 Iconic Perimeter Cable-Stayed Masts + Forestay/Backstay Cable Fans
  for (let m = 0; m < 12; m += 1) {
    const ang = ((m + 0.5) / 12) * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const mastTopY = 2.75 + 1.05 * (0.5 + 0.5 * Math.cos(2 * ang));
    const mx = 4.08 * ca, mz = 3.34 * sa;
    // Tapered 4-sided mast in stadium-local coordinates
    const base = toWorld(mx, 0.14, mz);
    const tip = toWorld(mx * 0.985, mastTopY, mz * 0.985);
    const rB = 0.075, rT = 0.022;
    for (let s = 0; s < 4; s += 1) {
      const p0 = (s / 4) * Math.PI * 2, p1 = ((s + 1) / 4) * Math.PI * 2;
      solid.quad(
        [base[0] + rB * Math.cos(p0), base[1], base[2] + rB * Math.sin(p0)],
        [tip[0] + rT * Math.cos(p0), tip[1], tip[2] + rT * Math.sin(p0)],
        [tip[0] + rT * Math.cos(p1), tip[1], tip[2] + rT * Math.sin(p1)],
        [base[0] + rB * Math.cos(p1), base[1], base[2] + rB * Math.sin(p1)],
        0.94
      );
    }
    // 3 inward forestay cables to roof outer eave, mid-roof, and inner tension ring
    const wave = 1.44 + 0.44 * Math.cos(2 * ang);
    lines.segment(tip, toWorld(3.80 * ca, wave, 3.10 * sa), 0);
    lines.segment(tip, toWorld(2.88 * ca, 1.34 + 0.36 * Math.cos(2 * ang), 2.30 * sa), 0);
    lines.segment(tip, toWorld(1.82 * ca, 1.18 + 0.22 * Math.cos(2 * ang), 1.38 * sa), 0);
    // Twin backstay cables to ground anchor block
    const anchor = toWorld(4.62 * ca, 0.12, 3.80 * sa);
    lines.segment(tip, anchor, 0);
    lines.segment([tip[0], tip[1] - 0.42, tip[2]], anchor, 0);
    const aw = toWorld(4.62 * ca, 0.10, 3.80 * sa);
    solid.box(aw[0], aw[1], aw[2], 0.24, 0.22, 0.24, 0.62, yaw + ang);
  }

  // 4 External Cylindrical Spiral Concourse Ramp Towers
  for (const ang of [0.66, Math.PI - 0.66, Math.PI + 0.66, -0.66]) {
    const rc = toWorld(4.32 * Math.cos(ang), 0.0, 3.56 * Math.sin(ang));
    solid.frustum(rc[0], 0.0, rc[2], 0.44, 0.44, 0.44, 0.44, 1.34, 12, 0.66, true, false);
    // Helical ramp ribbon wrapping 1.5 turns around the cylinder
    for (let step = 0; step < 18; step += 1) {
      const t0 = step / 18, t1 = (step + 1) / 18;
      const h0 = 0.12 + t0 * 1.15, h1 = 0.12 + t1 * 1.15;
      const p0 = t0 * Math.PI * 3, p1 = t1 * Math.PI * 3;
      const i0 = [rc[0] + 0.44 * Math.cos(p0), rc[1] + h0, rc[2] + 0.44 * Math.sin(p0)];
      const o0 = [rc[0] + 0.60 * Math.cos(p0), rc[1] + h0, rc[2] + 0.60 * Math.sin(p0)];
      const o1 = [rc[0] + 0.60 * Math.cos(p1), rc[1] + h1, rc[2] + 0.60 * Math.sin(p1)];
      const i1 = [rc[0] + 0.44 * Math.cos(p1), rc[1] + h1, rc[2] + 0.44 * Math.sin(p1)];
      solid.quad(i0, o0, o1, i1, 0.85);
      lines.segment([o0[0], o0[1] + 0.09, o0[2]], [o1[0], o1[1] + 0.09, o1[2]], 0);
    }
  }
}

// --- Zone 2: Fluted Blue Moon Observatory Spire + Grand Staircase ---
function buildSpire(solid, lines) {
  const sx = 2.35, sz = 0.25;

  // Stepped octagonal base podium
  solid.frustum(sx, -0.4, sz, 2.55, 2.55, 2.35, 2.35, 0.85, 8, 0.58, true, false);
  solid.frustum(sx, 0.45, sz, 1.85, 1.85, 1.72, 1.72, 0.90, 8, 0.66, true, false);
  // Dark portal doorway at top of stairs
  solid.box(sx - 0.18, 1.92, sz + 1.02, 0.56, 1.12, 0.16, 0.06, -0.26);

  // 26-step Grand Ascending Staircase with crimson rail knots
  const stairStart = [0.85, -0.45, 5.15];
  const stairEnd = [2.05, 1.35, 1.32];
  const steps = 26;
  const dx = stairEnd[0] - stairStart[0], dz = stairEnd[2] - stairStart[2];
  const stairYaw = Math.atan2(-dx, -dz);
  const perpX = Math.cos(stairYaw), perpZ = -Math.sin(stairYaw);
  const halfW = 0.56;

  for (let i = 0; i < steps; i += 1) {
    const t = (i + 0.5) / steps;
    const x = lerp(stairStart[0], stairEnd[0], t);
    const y = lerp(stairStart[1], stairEnd[1], t);
    const z = lerp(stairStart[2], stairEnd[2], t);
    solid.box(x, y - 0.08, z, halfW * 2, 0.16, 0.24, 0.78, stairYaw);
    if (i % 4 === 1) {
      for (const side of [-1, 1]) {
        const rx = x + side * halfW * perpX, rz = z + side * halfW * perpZ;
        lines.segment([rx, y, rz], [rx, y + 0.42, rz], 0);
        // Subtle 1% crimson handrail tie-knot (echoing 0z5a's stair knots)
        solid.box(rx, y + 0.40, rz, 0.065, 0.065, 0.065, 2.0, stairYaw);
      }
    }
  }
  for (const side of [-1, 1]) {
    lines.segment(
      [stairStart[0] + side * halfW * perpX, stairStart[1] + 0.42, stairStart[2] + side * halfW * perpZ],
      [stairEnd[0] + side * halfW * perpX, stairEnd[1] + 0.42, stairEnd[2] + side * halfW * perpZ],
      0
    );
  }

  // 18-flute Monumental Tower Shaft (y = 1.35 -> 9.05)
  const flutes = 18;
  const tiers = 6;
  for (let t = 0; t < tiers; t += 1) {
    const u0 = t / tiers, u1 = (t + 1) / tiers;
    const y0 = lerp(1.35, 9.05, u0), y1 = lerp(1.35, 9.05, u1);
    const r0 = lerp(1.06, 0.80, u0), r1 = lerp(1.06, 0.80, u1);
    for (let i = 0; i < flutes * 2; i += 1) {
      const a0 = (i / (flutes * 2)) * Math.PI * 2;
      const a1 = ((i + 1) / (flutes * 2)) * Math.PI * 2;
      const d0 = i % 2 === 0 ? 1.0 : 0.90;
      const d1 = (i + 1) % 2 === 0 ? 1.0 : 0.90;
      solid.quad(
        [sx + r0 * d0 * Math.cos(a0), y0, sz + r0 * d0 * Math.sin(a0)],
        [sx + r1 * d0 * Math.cos(a0), y1, sz + r1 * d0 * Math.sin(a0)],
        [sx + r1 * d1 * Math.cos(a1), y1, sz + r1 * d1 * Math.sin(a1)],
        [sx + r0 * d1 * Math.cos(a1), y0, sz + r0 * d1 * Math.sin(a1)],
        0.74
      );
    }
  }
  // Mid-tower collar ring + flared fluted capital
  solid.frustum(sx, 3.85, sz, 1.38, 1.38, 1.38, 1.38, 0.28, 20, 0.64, true, true);
  solid.frustum(sx, 9.05, sz, 0.82, 0.82, 1.38, 1.38, 0.82, 18, 0.82, true, false);

  // Crowning "Blue Moon" Celestial Sphere + Tilted Orbital Ring (y = 11.15)
  const my = 11.15, mr = 1.22;
  const latSegs = 9, lonSegs = 16;
  for (let la = 0; la < latSegs; la += 1) {
    const v0 = (la / latSegs) * Math.PI, v1 = ((la + 1) / latSegs) * Math.PI;
    for (let lo = 0; lo < lonSegs; lo += 1) {
      const u0 = (lo / lonSegs) * Math.PI * 2, u1 = ((lo + 1) / lonSegs) * Math.PI * 2;
      const sp = (v, u) => [sx + mr * Math.sin(v) * Math.cos(u), my + mr * Math.cos(v), sz + mr * Math.sin(v) * Math.sin(u)];
      const tone = Math.cos(u0 - 0.5) > 0.15 ? 0.72 : 0.26;
      solid.quad(sp(v0, u0), sp(v1, u0), sp(v1, u1), sp(v0, u1), tone);
    }
  }
  // Solid tilted orbital ring around the Blue Moon
  const tilt = 0.34, ct = Math.cos(tilt), st = Math.sin(tilt);
  const ringPt = (r, yOff, ang) => {
    const x = r * Math.cos(ang), z = r * Math.sin(ang);
    return [sx + x * ct - yOff * st, my + x * st + yOff * ct, sz + z];
  };
  for (let i = 0; i < 32; i += 1) {
    const a0 = (i / 32) * Math.PI * 2, a1 = ((i + 1) / 32) * Math.PI * 2;
    const in0 = ringPt(1.86, 0, a0), in1 = ringPt(1.86, 0, a1);
    const out0 = ringPt(2.04, 0, a0), out1 = ringPt(2.04, 0, a1);
    solid.quad(in0, out0, out1, in1, 0.90);
    solid.quad(out0, in0, in1, out1, 0.62);
  }
  lines.ring(sx, my, sz, 2.18, 2.18, 36, 2, 0.12, tilt);

  // Serene Luminous Full Moon Disc in upper-right sky
  const moonX = 5.9, moonY = 9.0, moonZ = -6.2, moonR = 1.85;
  for (let i = 0; i < 28; i += 1) {
    const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2;
    solid.tri(
      [moonX, moonY, moonZ],
      [moonX + moonR * Math.cos(a0), moonY + moonR * Math.sin(a0), moonZ],
      [moonX + moonR * Math.cos(a1), moonY + moonR * Math.sin(a1), moonZ],
      3.0
    );
  }
}

// --- Dynamic Turntable Truss Ring (Britpop Vinyl + Space-Frame) ---
function buildTurntableTruss() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  const segs = 28;
  const rIn = 2.75, rOut = 3.28, h = 0.22;
  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    // Outer ring rim
    solid.quad([rOut * c0, -h, rOut * s0], [rOut * c0, h, rOut * s0], [rOut * c1, h, rOut * s1], [rOut * c1, -h, rOut * s1], 0.80);
    solid.quad([rIn * c1, -h, rIn * s1], [rIn * c1, h, rIn * s1], [rIn * c0, h, rIn * s0], [rIn * c0, -h, rIn * s0], 0.56);
    solid.quad([rIn * c0, h, rIn * s0], [rOut * c0, h, rOut * s0], [rOut * c1, h, rOut * s1], [rIn * c1, h, rIn * s1], 0.88);
    solid.quad([rOut * c0, -h, rOut * s0], [rIn * c0, -h, rIn * s0], [rIn * c1, -h, rIn * s1], [rOut * c1, -h, rOut * s1], 0.42);
    // Scalloped outer crown teeth + radial vinyl platter lattice wires
    const am = (a0 + a1) * 0.5;
    lines.segment([rOut * c0, 0, rOut * s0], [3.46 * Math.cos(am), 0.12, 3.46 * Math.sin(am)], 0);
    lines.segment([3.46 * Math.cos(am), 0.12, 3.46 * Math.sin(am)], [rOut * c1, 0, rOut * s1], 0);
    if (i % 2 === 0) {
      lines.segment([1.05 * c0, 0.12, 1.05 * s0], [rIn * c0, 0.08, rIn * s0], 0);
      lines.segment([1.05 * c0, -0.12, 1.05 * s0], [rIn * c1, -0.08, rIn * s1], 0);
    }
  }
  // Concentric vinyl record groove rings inside truss
  for (const r of [1.45, 1.92, 2.38]) lines.ring(0, 0, 0, r, r, 32, 0);
  // Tonearm cantilever truss beam
  for (let k = 0; k < 4; k += 1) {
    const z0 = -0.4 + k * 0.65, z1 = z0 + 0.65;
    lines.segment([1.1, 0.12, z0], [2.6, 0.12, z1], 0);
  }
  return { solid: solid.finish(), lines: lines.finish() };
}

// --- Dynamic 1% Crimson Pendulum (Swing / Tonearm Counterweight) ---
function buildPendulum() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  const L = 2.28, halfSpan = 0.30;
  // Twin crimson cables from pivot (0, 0, 0) down to seat at y = -L
  lines.segment([-halfSpan, 0, 0], [-halfSpan, -L, 0], 1);
  lines.segment([halfSpan, 0, 0], [halfSpan, -L, 0], 1);
  solid.box(-halfSpan, 0, 0, 0.08, 0.08, 0.08, 2.0);
  solid.box(halfSpan, 0, 0, 0.08, 0.08, 0.08, 2.0);
  solid.box(0, -L, 0, 0.78, 0.085, 0.24, 2.0);
  return { solid: solid.finish(), lines: lines.finish() };
}

// --- Dynamic Wireframe Polyhedra (Compiler IR / Sparse Graphs) ---
function buildPolyhedron(kind) {
  const lines = new LineBuilder();
  let verts = [];
  if (kind === 'octa') {
    verts = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  } else {
    const phi = (1 + Math.sqrt(5)) * 0.5;
    const raw = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
    ];
    verts = raw.map(([x, y, z]) => {
      const l = Math.hypot(x, y, z);
      return [x / l, y / l, z / l];
    });
  }
  const threshold = kind === 'octa' ? 1.5 : 1.15;
  for (let i = 0; i < verts.length; i += 1) {
    for (let j = i + 1; j < verts.length; j += 1) {
      const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
      if (d < threshold) lines.segment(verts[i], verts[j], 0);
    }
  }
  return lines.finish();
}

// --- Zone 3: Tsinghua Triple-Arch Gatehouse, KV-Cache Paper Village & RDMA Cables ---
function buildCampusAndVillage(solid, lines) {
  // Ground plaza terrace (leaves opening over sunken foundry court z < -1.0)
  solid.box(-1.6, -0.45, 2.8, 16.5, 0.45, 7.6, 0.58);

  // Subtle Tsinghua Old Gate (二校门) triple-arch paper monument at [-0.85, -0.22, -1.35]
  const gx = -0.85, gy = -0.22, gz = -1.35;
  solid.box(gx, gy + 0.10, gz, 2.75, 0.20, 0.56, 0.68);
  for (const px of [-1.12, -0.42, 0.42, 1.12]) {
    solid.box(gx + px, gy + 0.92, gz, 0.24, 1.44, 0.42, 0.80);
  }
  // Arch lintel, cornice & classical central pediment
  solid.box(gx, gy + 1.74, gz, 2.68, 0.24, 0.46, 0.84);
  solid.box(gx, gy + 2.08, gz, 1.28, 0.42, 0.40, 0.86);
  solid.gableHouse(gx, gy + 2.26, gz, 1.36, 0.04, 0.34, 0.44, 0, 0.88);

  // Stacked Isometric Paper-Cut KV-Cache Pavilions (left & right clusters)
  const houses = [
    [-2.85, -0.22, -1.85, 0.78, 0.72, 0.36, 0.72, 0.18],
    [-2.15, -0.22, -2.25, 0.72, 0.68, 0.34, 0.68, -0.12],
    [-3.45, -0.22, -2.45, 0.82, 0.76, 0.38, 0.74, 0.24],
    [-2.55, 0.68, -2.10, 0.68, 0.66, 0.32, 0.66, 0.08],
    [-3.15, 0.72, -2.55, 0.66, 0.64, 0.32, 0.64, -0.18],
    [-2.78, 1.52, -2.32, 0.60, 0.62, 0.30, 0.60, 0.22],
    [-2.92, 2.28, -2.42, 0.52, 0.56, 0.28, 0.54, -0.28],
    [4.15, -0.22, -1.65, 0.84, 0.78, 0.38, 0.76, -0.22],
    [4.95, -0.22, -2.15, 0.76, 0.70, 0.34, 0.70, -0.08],
    [3.65, -0.22, -2.45, 0.74, 0.68, 0.32, 0.70, 0.14],
    [4.42, 0.74, -2.02, 0.68, 0.64, 0.32, 0.66, -0.16],
    [3.95, 0.68, -2.52, 0.62, 0.60, 0.30, 0.62, 0.20],
    [4.22, 1.54, -2.24, 0.56, 0.58, 0.28, 0.56, 0.10]
  ];
  for (const [x, y, z, w, h, rh, d, yaw] of houses) {
    solid.gableHouse(x, y, z, w, h, rh, d, yaw, 0.62);
  }

  // Sweeping RDMA / NVLink interconnect cables tying Spire, Etihad, and GPU Foundry
  lines.catenary([2.35 - 2.6, 6.1, 0.25], [-2.1, 1.8, 1.2], 0.42, 12, 0);
  lines.catenary([2.35 + 2.2, 6.1, 0.25], [5.2, 0.9, -2.2], 0.38, 12, 0);
  lines.catenary([2.35 - 1.4, 6.1, -1.8], [-3.2, 0.4, -5.8], 0.55, 14, 0);
  lines.catenary([2.35 + 1.4, 6.1, -1.8], [3.2, 0.4, -5.8], 0.55, 14, 0);
}

// --- Zone 4: Monumental Axial GPU Shroud, 9-Blade Fan, Heatsink Canyon & Silicon Die ---
function buildGpuFoundry(solid, lines) {
  const [fx, fy, fz] = FAN_HUB_CENTER; // [0, -2.7, -6.25]
  const shroudZ = -6.0;
  const rIntake = 2.48;

  // Sunken Foundry Forecourt & Side Retaining Terraces (y = -5.6 -> -0.22)
  solid.box(0, -5.85, -3.5, 12.6, 0.50, 5.8, 0.48);
  solid.box(-5.6, -2.9, -3.5, 1.4, 5.4, 5.6, 0.40);
  solid.box(5.6, -2.9, -3.5, 1.4, 5.4, 5.6, 0.40);

  // GPU Shroud Front Plate with True Circular Intake Opening (r = 2.48)
  const segs = 36;
  const outerW = 5.3, outerBottom = -5.6, outerTop = 0.20;
  const outerAt = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const tx = Math.abs(c) > 1e-4 ? outerW / Math.abs(c) : 1e6;
    const ty = s >= 0
      ? (s > 1e-4 ? (outerTop - fy) / s : 1e6)
      : (-s > 1e-4 ? (fy - outerBottom) / -s : 1e6);
    const r = Math.min(tx, ty);
    return [fx + c * r, fy + s * r];
  };

  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    const [ox0, oy0] = outerAt(a0);
    const [ox1, oy1] = outerAt(a1);
    const ix0 = fx + 2.72 * c0, iy0 = fy + 2.72 * s0;
    const ix1 = fx + 2.72 * c1, iy1 = fy + 2.72 * s1;
    // Chamfered shroud front face
    solid.quad([ix0, iy0, shroudZ], [ox0, oy0, shroudZ], [ox1, oy1, shroudZ], [ix1, iy1, shroudZ], i % 6 < 3 ? 0.64 : 0.52);
    // Beveled funnel lip curving inward from r = 2.72 (z = -5.82) to r = 2.48 (z = -6.58)
    solid.quad(
      [fx + 2.72 * c0, fy + 2.72 * s0, -5.82],
      [fx + 2.72 * c1, fy + 2.72 * s1, -5.82],
      [fx + rIntake * c1, fy + rIntake * s1, -6.22],
      [fx + rIntake * c0, fy + rIntake * s0, -6.22],
      0.78
    );
    solid.quad(
      [fx + rIntake * c0, fy + rIntake * s0, -6.22],
      [fx + rIntake * c1, fy + rIntake * s1, -6.22],
      [fx + rIntake * c1, fy + rIntake * s1, -6.68],
      [fx + rIntake * c0, fy + rIntake * s0, -6.68],
      0.34
    );
  }
  lines.ring(fx, fy, -5.81, 2.73, 2.73, 36, 0, Math.PI * 0.5, 0);

  // Exterior Side Heatsink Fin Grilles & Chamfer Armor Bars
  for (const side of [-1, 1]) {
    for (let f = 0; f < 9; f += 1) {
      solid.box(side * (3.35 + f * 0.21), -2.55, -5.86, 0.06, 4.4, 0.28, 0.44);
    }
    solid.box(side * 4.2, -0.15, -5.76, 1.9, 0.26, 0.36, 0.82);
    solid.box(side * 4.2, -5.15, -5.76, 1.9, 0.26, 0.36, 0.82);
  }
  // PCIe / NVLink Edge-Finger Colonnade at Shroud Base
  for (let p = -10; p <= 10; p += 1) {
    if (Math.abs(p) === 2) continue;
    solid.box(p * 0.42, -5.38, -5.68, 0.18, 0.42, 0.14, p % 3 === 0 ? 3.0 : 0.84);
  }
  // Rear Stator Struts holding the hub (angled horizontally so top +pi/2 flight path is 100% clear!)
  for (const ang of [-0.28, 0.28, Math.PI - 0.28, Math.PI + 0.28]) {
    const midX = fx + 1.52 * Math.cos(ang), midY = fy + 1.52 * Math.sin(ang);
    solid.box(midX, midY, -6.64, 1.92, 0.10, 0.14, 0.38, 0);
  }

  // --- Interior GPU Cathedral Envelope (z = -6.6 -> -20.2) ---
  // Deep ultramarine sanctuary walls (mat = 4.0)
  solid.quad([-5.3, -5.2, -20.2], [5.3, -5.2, -20.2], [5.3, 0.6, -20.2], [-5.3, 0.6, -20.2], 4.0); // back wall
  solid.quad([-5.3, -5.2, -6.6], [-5.3, -5.2, -20.2], [-5.3, 0.6, -20.2], [-5.3, 0.6, -6.6], 4.0); // left wall
  solid.quad([5.3, -5.2, -20.2], [5.3, -5.2, -6.6], [5.3, 0.6, -6.6], [5.3, 0.6, -20.2], 4.0);     // right wall
  solid.quad([-5.3, 0.6, -6.6], [-5.3, 0.6, -20.2], [5.3, 0.6, -20.2], [5.3, 0.6, -6.6], 4.0);     // ceiling
  solid.quad([-5.3, -5.2, -20.2], [-5.3, -5.2, -6.6], [5.3, -5.2, -6.6], [5.3, -5.2, -20.2], 0.14); // PCB floor

  // 20 Pairs of Towering Vertical Heatsink Fin Colonnades (left & right canyon)
  for (let k = 0; k < 20; k += 1) {
    const z = -7.3 - k * 0.58;
    for (const side of [-1, 1]) {
      solid.box(side * 3.55, -2.35, z, 1.85, 5.2, 0.085, k % 2 === 0 ? 0.46 : 0.36);
      // Inner vertical chamfered fin edge catching core glow
      solid.box(side * 2.62, -2.35, z, 0.08, 5.0, 0.11, 0.68);
    }
  }

  // 6 Overhead Curved Heatpipe Vault Arches
  for (const z of [-8.2, -10.2, -12.2, -14.2, -16.2, -18.0]) {
    const archSegs = 12;
    for (let s = 0; s < archSegs; s += 1) {
      const a0 = (s / archSegs) * Math.PI, a1 = ((s + 1) / archSegs) * Math.PI;
      const x0 = -3.1 * Math.cos(a0), y0 = -0.85 + 1.05 * Math.sin(a0);
      const x1 = -3.1 * Math.cos(a1), y1 = -0.85 + 1.05 * Math.sin(a1);
      lines.segment([x0, y0, z], [x1, y1, z], 0);
      solid.box((x0 + x1) * 0.5, (y0 + y1) * 0.5, z, 0.58, 0.11, 0.16, 0.62);
    }
  }

  // 8 Flanking HBM3e / KV-Cache Stacked Memory Towers along the Center Aisle
  for (let row = 0; row < 4; row += 1) {
    const z = -9.4 - row * 2.25;
    for (const side of [-1, 1]) {
      const hx = side * 1.62;
      for (let tier = 0; tier < 5; tier += 1) {
        const ty = -5.06 + tier * 0.24;
        const tone = 0.38 + tier * 0.10;
        solid.box(hx, ty, z, 0.96, 0.19, 1.48, tone);
      }
      // Interposer bus traces linking each HBM stack into the center bus runner
      lines.segment([side * 1.12, -5.16, z - 0.25], [side * 0.58, -5.16, z - 0.25], 2);
      lines.segment([side * 1.12, -5.16, z + 0.25], [side * 0.58, -5.16, z + 0.25], 2);
    }
  }

  // Central Luminous Data-Bus Runner leading straight to the Silicon Die
  solid.box(0, -5.17, -12.9, 1.12, 0.04, 12.2, 0.72);
  for (const bx of [-0.46, -0.18, 0.18, 0.46]) {
    lines.segment([bx, -5.14, -6.9], [bx, -5.14, -18.9], 2);
  }

  // --- Climax Altar (z = -19.0): Exposed Silicon Die & Quad-Quadrant Tensor Core Matrix ---
  const dieZ = -19.05, dieY = -2.65;
  // Substrate & Silicon Interposer Frame
  solid.box(0, dieY, dieZ - 0.12, 4.55, 4.65, 0.16, 0.18);
  solid.box(0, dieY, dieZ, 3.88, 3.98, 0.12, 0.30);

  // Radiant White-Cyan NoC / L2 Interconnect Crossbar Spine (mat = 3.0)
  solid.box(0, dieY, dieZ + 0.10, 0.36, 3.86, 0.10, 3.0);
  solid.box(0, dieY + 0.22, dieZ + 0.10, 3.76, 0.34, 0.10, 3.0);

  // 4 Quadrants x (3 x 3) Streaming Multiprocessor (SM) / Tensor Core Tiles
  for (const qx of [-1, 1]) {
    for (const qy of [-1, 1]) {
      for (let ix = 0; ix < 3; ix += 1) {
        for (let iy = 0; iy < 3; iy += 1) {
          const tx = qx * (0.48 + ix * 0.48);
          const ty = dieY + 0.22 + qy * (0.46 + iy * 0.48) - (qy < 0 ? 0.16 : 0);
          if (ty < -4.52 || ty > -0.78) continue;
          const activeTile = (ix + iy) % 3 === 0;
          solid.box(tx, ty, dieZ + 0.08, 0.36, 0.36, 0.09, activeTile ? 0.86 : 0.56);
        }
      }
    }
  }
}

// --- Dynamic 9-Blade Sculpted Axial GPU Intake Fan ---
function buildAxialFan() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  const rHub = 0.58, rTip = 2.38;

  // Faceted central motor hub + nose cone + crimson #e0304e rotor balance mark
  const hubSegs = 18;
  for (let i = 0; i < hubSegs; i += 1) {
    const a0 = (i / hubSegs) * Math.PI * 2, a1 = ((i + 1) / hubSegs) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    solid.quad([rHub * c0, rHub * s0, -0.24], [rHub * c0, rHub * s0, 0.20], [rHub * c1, rHub * s1, 0.20], [rHub * c1, rHub * s1, -0.24], 0.46);
    solid.quad([rHub * c0, rHub * s0, 0.20], [0.34 * c0, 0.34 * s0, 0.30], [0.34 * c1, 0.34 * s1, 0.30], [rHub * c1, rHub * s1, 0.20], 0.72);
    solid.tri([0, 0, 0.32], [0.34 * c0, 0.34 * s0, 0.30], [0.34 * c1, 0.34 * s1, 0.30], i < 3 ? 2.0 : 0.84);
    solid.tri([0, 0, -0.24], [rHub * c1, rHub * s1, -0.24], [rHub * c0, rHub * s0, -0.24], 0.30);
  }
  lines.ring(0, 0, 0.21, 0.48, 0.48, 24, 1, Math.PI * 0.5, 0);

  // 9 Swept & Pitched Airfoil Blades
  const rSteps = 5;
  for (let b = 0; b < BLADE_COUNT; b += 1) {
    const basePhi = b * BLADE_STEP;
    const station = (u, v, zBias) => {
      const r = lerp(rHub - 0.02, rTip, u);
      const chord = 0.26 + 0.12 * u;
      const pitch = 0.58 - 0.10 * u;
      const sweep = basePhi + 0.18 * u * u + (v * chord * Math.cos(pitch)) / r;
      const z = v * chord * Math.sin(pitch) + zBias;
      return [r * Math.cos(sweep), r * Math.sin(sweep), z];
    };
    for (let ru = 0; ru < rSteps; ru += 1) {
      const u0 = ru / rSteps, u1 = (ru + 1) / rSteps;
      const f00 = station(u0, -0.5, 0.012), f10 = station(u1, -0.5, 0.012);
      const f11 = station(u1, 0.5, 0.012), f01 = station(u0, 0.5, 0.012);
      const b00 = station(u0, -0.5, -0.012), b10 = station(u1, -0.5, -0.012);
      const b11 = station(u1, 0.5, -0.012), b01 = station(u0, 0.5, -0.012);
      solid.quad(f00, f10, f11, f01, 0.78); // front airfoil face
      solid.quad(b01, b11, b10, b00, 0.44); // rear airfoil face
      solid.quad(f01, f11, b11, b01, 0.90); // crisp leading edge
      solid.quad(b00, b10, f10, f00, 0.36); // trailing edge
      if (ru === rSteps - 1) solid.quad(f10, b10, b11, f11, 0.86); // blade tip cap
    }
  }
  return { solid: solid.finish(), lines: lines.finish() };
}

// --- Phase-Locked Axial Fan Angle (Bullet-Time Passage without Blade Collision) ---
// At camera passage radius r = 1.42 (u = 0.4667), blade 0 sits at +0.0392 + theta
// and blade 8 sits at -BLADE_STEP + 0.0392 + theta. Locking theta to
// pi/2 + 0.5 * BLADE_STEP - 0.0392 places the camera dead-center in the 29.4-deg
// open channel between two swept blades, regardless of wall-clock arrival time t.
export function fanAngleAt(scroll, t) {
  const s = clamp(Number.isFinite(scroll) ? scroll : 0, 0, 1);
  const time = Number.isFinite(t) ? t : 0;
  const uPass = (FAN_PASS_RADIUS - 0.56) / (2.38 - 0.56);
  const gapAngle = Math.PI * 0.5 + BLADE_STEP * 0.5 - 0.18 * uPass * uPass;
  const free = time * 0.55;
  const nearestSlot = Math.round((free - gapAngle) / BLADE_STEP) * BLADE_STEP + gapAngle;
  const slowGlide = (s - 0.84) * 0.05;
  const lock = smoothstep(0.64, 0.75, s) * (1 - smoothstep(0.90, 0.97, s));
  return lerp(free, nearestSlot + slowGlide, lock);
}

// --- Continuous 4-Act Scroll Camera Spline ---
const CAMERA_KEYS = [
  { s: 0.00, eye: [-1.55, 3.05, 17.2], target: [-0.95, 4.85, 0.25], fov: 46 }, // Act I: Full Panorama (Etihad + Spire + Blue Moon)
  { s: 0.28, eye: [-0.65, 3.45, 9.40], target: [0.55, 5.15, -0.65], fov: 44 }, // Act II: Over Etihad roof -> Truss & Desk
  { s: 0.52, eye: [-0.10, 0.75, 3.40], target: [0.00, -2.05, -6.20], fov: 44 }, // Act III-A: Over Gatehouse & KV village
  { s: 0.68, eye: [0.00, -1.30, -1.55], target: [0.00, -2.35, -7.80], fov: 45 }, // Act III-B: Unobstructed GPU intake shroud
  { s: 0.78, eye: [0.00, FAN_HUB_CENTER[1] + FAN_PASS_RADIUS, -4.95], target: [0.00, -2.45, -13.2], fov: 50 }, // Act IV-A1: Blades framing left & right!
  { s: 0.84, eye: [0.00, FAN_HUB_CENTER[1] + FAN_PASS_RADIUS, FAN_HUB_CENTER[2]], target: [0.00, -2.58, -15.0], fov: 48 }, // Act IV-A2: Clean passage through rotor plane
  { s: 1.00, eye: [0.00, -2.72, -10.65], target: [0.00, -2.65, -19.05], fov: 44 } // Act IV-B: Heatsink Canyon, HBM3e & Silicon Die
];

export function cameraAt(scroll = 0, aspect = 1.6, pointer = { x: 0, y: 0 }) {
  const s = clamp(Number.isFinite(scroll) ? scroll : 0, 0, 1);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

  let k0 = CAMERA_KEYS[0], k1 = CAMERA_KEYS[CAMERA_KEYS.length - 1];
  for (let i = 0; i < CAMERA_KEYS.length - 1; i += 1) {
    if (s >= CAMERA_KEYS[i].s && s <= CAMERA_KEYS[i + 1].s) {
      k0 = CAMERA_KEYS[i];
      k1 = CAMERA_KEYS[i + 1];
      break;
    }
  }
  const localT = smoothstep(k0.s, k1.s, s);
  const eye = lerp3(k0.eye, k1.eye, localT);
  const target = lerp3(k0.target, k1.target, localT);
  let fov = lerp(k0.fov, k1.fov, localT);

  // On narrow mobile viewports, pull back gently ONLY in exterior Acts I-III;
  // taper pullback to 0 before the fan-blade gap so blade clearance stays exact!
  const exteriorMask = 1 - smoothstep(0.56, 0.72, s);
  if (safeAspect < 1.1) {
    const narrow = clamp((1.1 - safeAspect) / 0.65, 0, 1);
    eye[2] += narrow * 3.8 * exteriorMask;
    eye[0] = lerp(eye[0], 0.15, narrow * 0.45 * exteriorMask);
    target[0] = lerp(target[0], 0.35, narrow * 0.45 * exteriorMask);
    fov += narrow * 7.5 * (1 - 0.35 * smoothstep(0.72, 0.86, s));
  }

  // Subtle pointer parallax in exterior stages; zeroed during blade passage for collision safety
  const parallaxMask = (1 - smoothstep(0.62, 0.73, s)) + 0.22 * smoothstep(0.91, 0.98, s);
  const px = clamp(pointer?.x || 0, -1, 1) * parallaxMask;
  const py = clamp(pointer?.y || 0, -1, 1) * parallaxMask;
  eye[0] += px * 0.32;
  eye[1] -= py * 0.18;

  const interiorBlend = smoothstep(0.82, 0.90, s);
  return {
    eye,
    target,
    up: [0, 1, 0],
    fovRad: (fov * Math.PI) / 180,
    interiorBlend
  };
}

export function computeBufferSize(width, height, dpr = 1, fine = true) {
  const w = Math.max(1, Math.round(width || 1));
  const h = Math.max(1, Math.round(height || 1));
  const safeDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  // Deliberate crisp sub-native raster buffer (~0.85x-1.15x) like 0z5a:
  // harmonizes with 12px pixel UI and halves fragment fill cost.
  const scale = Math.min(safeDpr, fine ? 1.35 : 1.05) * 0.86;
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), scale];
}

export function buildWorld() {
  const staticSolid = new MeshBuilder();
  const staticLines = new LineBuilder();
  buildEtihad(staticSolid, staticLines);
  buildSpire(staticSolid, staticLines);
  buildCampusAndVillage(staticSolid, staticLines);
  buildGpuFoundry(staticSolid, staticLines);

  const turntable = buildTurntableTruss();
  const pendulum = buildPendulum();
  const fan = buildAxialFan();
  const icosa = buildPolyhedron('icosa');
  const octa = buildPolyhedron('octa');

  const rand = seeded(20270901);
  const motes = new Float32Array(MOTE_COUNT * 4);
  for (let i = 0; i < MOTE_COUNT; i += 1) {
    const interior = i >= 104;
    if (interior) {
      motes[i * 4] = (rand() - 0.5) * 4.4;
      motes[i * 4 + 1] = -4.9 + rand() * 4.4;
      motes[i * 4 + 2] = -7.4 - rand() * 11.4;
      motes[i * 4 + 3] = 1 + rand(); // >= 1 marks rising interior token mote
    } else {
      motes[i * 4] = (rand() - 0.5) * 18.0;
      motes[i * 4 + 1] = -1.5 + rand() * 14.5;
      motes[i * 4 + 2] = -6.0 + rand() * 14.0;
      motes[i * 4 + 3] = rand(); // < 1 marks exterior sky mote
    }
  }

  const state = {
    turntableYaw: 0,
    pendulumSwing: 0,
    fanAngle: fanAngleAt(0, 0),
    polyRot: 0,
    time: 0,
    scroll: 0
  };

  return {
    staticSolid: staticSolid.finish(),
    staticLines: staticLines.finish(),
    turntable,
    pendulum,
    fan,
    polyhedra: [
      { mesh: icosa, pos: [5.05, 6.55, 0.75], scale: 0.72, speed: 0.22 },
      { mesh: octa, pos: [6.05, 7.95, -1.15], scale: 0.56, speed: -0.31 },
      { mesh: icosa, pos: [4.15, 4.65, 1.85], scale: 0.52, speed: 0.17 }
    ],
    motes,
    state
  };
}

export function pose(world, t = 0, scroll = 0) {
  const time = Number.isFinite(t) ? t : 0;
  const s = clamp(Number.isFinite(scroll) ? scroll : 0, 0, 1);
  world.state.time = time;
  world.state.scroll = s;
  world.state.turntableYaw = time * 0.08;
  world.state.pendulumSwing = Math.sin(time * 1.38) * 0.165;
  world.state.fanAngle = fanAngleAt(s, time);
  world.state.polyRot = time;
  return world.state;
}

// --- GLSL Shaders ---
const SKY_VS = `
attribute vec2 aCorner;
varying vec2 vUv;
void main() {
  vUv = aCorner * 0.5 + 0.5;
  gl_Position = vec4(aCorner, 0.9999, 1.0);
}`;

const SKY_FS = `
precision mediump float;
varying vec2 vUv;
uniform vec3 uVoidTop;
uniform vec3 uVoidBottom;
uniform vec3 uSanctuaryBg;
uniform float uInterior;
void main() {
  vec3 sky = mix(uVoidBottom, uVoidTop, smoothstep(0.0, 0.92, vUv.y));
  vec3 col = mix(sky, uSanctuaryBg, uInterior);
  gl_FragColor = vec4(col, 1.0);
}`;

const SOLID_VS = `
attribute vec3 aPos;
attribute vec3 aNorm;
attribute float aMat;
uniform mat4 uViewProj;
uniform mat4 uModel;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vMat;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize((uModel * vec4(aNorm, 0.0)).xyz);
  vMat = aMat;
  gl_Position = uViewProj * wp;
}`;

const SOLID_FS = `
precision mediump float;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vMat;
uniform vec3 uRamp0;
uniform vec3 uRamp1;
uniform vec3 uRamp2;
uniform vec3 uRamp3;
uniform vec3 uRamp4;
uniform vec3 uAccent;
uniform vec3 uGlow;
uniform vec3 uSanctuaryBg;
uniform float uTime;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 sampleRamp(float t) {
  float q = clamp(t, 0.0, 0.999) * 5.0;
  if (q < 1.0) return uRamp0;
  if (q < 2.0) return uRamp1;
  if (q < 3.0) return uRamp2;
  if (q < 4.0) return uRamp3;
  return uRamp4;
}

void main() {
  float grain = (hash12(floor(gl_FragCoord.xy)) - 0.5) * 0.055;
  if (vMat > 3.5) {
    gl_FragColor = vec4(clamp(uSanctuaryBg + grain * 0.35, 0.0, 1.0), 1.0);
    return;
  }
  if (vMat > 2.5) {
    float pulse = 0.94 + 0.06 * sin(uTime * 2.2 + vWorldPos.y * 1.4);
    gl_FragColor = vec4(clamp(uGlow * pulse + grain * 0.2, 0.0, 1.0), 1.0);
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 sunDir = normalize(vec3(0.54, 0.76, 0.36));
  float diff = max(dot(n, sunDir), 0.0);
  float hemi = n.y * 0.5 + 0.5;

  // Inside the GPU heatsink canyon (z < -6.6), illuminate fins & HBM from the Silicon Die
  float inChamber = step(vWorldPos.z, -6.55);
  vec3 dieDir = normalize(vec3(0.0, -2.65, -18.6) - vWorldPos);
  float dieDist = length(vec3(0.0, -2.65, -18.6) - vWorldPos);
  float coreLight = max(dot(n, dieDir), 0.0) * (1.0 / (1.0 + dieDist * 0.11));

  if (vMat > 1.5) {
    vec3 crimson = diff > 0.25 ? uAccent : uAccent * 0.74;
    gl_FragColor = vec4(clamp(crimson + grain * 0.25, 0.0, 1.0), 1.0);
    return;
  }

  float extShade = diff * 0.66 + hemi * 0.34 + (vMat - 0.5) * 0.62;
  float intShade = coreLight * 0.85 + hemi * 0.22 + (vMat - 0.5) * 0.72;
  float shade = mix(extShade, intShade, inChamber) + grain;
  gl_FragColor = vec4(sampleRamp(shade), 1.0);
}`;

const LINE_VS = `
attribute vec3 aPos;
attribute float aKind;
uniform mat4 uViewProj;
uniform mat4 uModel;
varying float vKind;
void main() {
  vKind = aKind;
  vec4 clip = uViewProj * (uModel * vec4(aPos, 1.0));
  clip.z -= 0.0009 * clip.w;
  gl_Position = clip;
}`;

const LINE_FS = `
precision mediump float;
varying float vKind;
uniform vec4 uWire;
uniform vec4 uChalk;
uniform vec3 uAccent;
void main() {
  if (vKind > 1.5) gl_FragColor = uChalk;
  else if (vKind > 0.5) gl_FragColor = vec4(uAccent, 0.95);
  else gl_FragColor = uWire;
}`;

const MOTE_VS = `
attribute vec4 aMote;
uniform mat4 uViewProj;
uniform float uTime;
uniform float uPointScale;
varying float vAlpha;
void main() {
  vec3 p = aMote.xyz;
  float seed = aMote.w;
  if (seed >= 1.0) {
    float ph = fract((seed - 1.0) + uTime * 0.075);
    p.y = -4.95 + ph * 4.55;
    p.x += sin(uTime * 0.7 + seed * 12.0) * 0.08;
    vAlpha = sin(ph * 3.14159) * 0.88;
  } else {
    p.y += sin(uTime * 0.45 + seed * 19.0) * 0.24;
    p.x += cos(uTime * 0.32 + seed * 13.0) * 0.18;
    vAlpha = 0.35 + 0.45 * (0.5 + 0.5 * sin(uTime * 1.4 + seed * 23.0));
  }
  vec4 clip = uViewProj * vec4(p, 1.0);
  gl_Position = clip;
  float dist = max(clip.w, 1.0);
  gl_PointSize = clamp((seed >= 1.0 ? 18.0 : 24.0) * uPointScale / dist, 1.5, 6.5);
}`;

const MOTE_FS = `
precision mediump float;
varying float vAlpha;
uniform vec3 uMote;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float soft = (1.0 - r * r);
  gl_FragColor = vec4(uMote, vAlpha * soft);
}`;

function compileProgram(gl, vsSource, fsSource) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh) || 'Shader compile failed';
      gl.deleteShader(sh);
      throw new Error(info);
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSource);
  const fs = compile(gl.FRAGMENT_SHADER, fsSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || 'Program link failed';
    gl.deleteProgram(prog);
    throw new Error(info);
  }
  return prog;
}

export function createScene(host, { theme = 'light', scroll = 0, onSteady, onFailure } = {}) {
  let failed = false;
  let disposed = false;
  let active = false;
  let steadyNotified = false;
  let renderedFrames = 0;
  let frame = 0;
  let steadyFrame = 0;
  let last = 0;
  let clock = 0;
  let currentScroll = clamp(Number.isFinite(scroll) ? scroll : 0, 0, 1);
  let currentTheme = theme === 'dark' ? 'dark' : 'light';
  const pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };
  const view = window;

  let canvas = null;
  let gl = null;
  let resizeObserver = null;
  const buffers = [];
  const programs = [];
  const world = buildWorld();

  const projMat = mat4Identity();
  const viewMat = mat4Identity();
  const viewProjMat = mat4Identity();
  const identityMat = mat4Identity();
  const modelMat = mat4Identity();
  const tempMat = mat4Identity();

  let skyProg, solidProg, lineProg, moteProg;
  let skyBuf, staticSolidBuf, staticLineBuf, turntableSolidBuf, turntableLineBuf;
  let pendulumSolidBuf, pendulumLineBuf, fanSolidBuf, fanLineBuf, icosaBuf, octaBuf, moteBuf;
  let uSky = {}, uSolid = {}, uLine = {}, uMote = {};
  let bufferWidth = 1, bufferHeight = 1, pixelScale = 1;

  function finePointer() {
    return typeof view.matchMedia === 'function' && view.matchMedia('(pointer: fine)').matches;
  }

  function uploadBuffer(array) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
    buffers.push(buf);
    return buf;
  }

  function resize() {
    const width = Math.max(1, host.clientWidth || view.innerWidth || 1);
    const height = Math.max(1, host.clientHeight || view.innerHeight || 1);
    const fine = finePointer() && width >= 720;
    const [bw, bh, scale] = computeBufferSize(width, height, view.devicePixelRatio || 1, fine);
    bufferWidth = bw;
    bufferHeight = bh;
    pixelScale = scale;
    canvas.width = bw;
    canvas.height = bh;
    gl.viewport(0, 0, bw, bh);
  }

  function bindSolid(buf, model, count) {
    if (!count) return;
    gl.uniformMatrix4fv(uSolid.uModel, false, model);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(uSolid.aPos);
    gl.enableVertexAttribArray(uSolid.aNorm);
    gl.enableVertexAttribArray(uSolid.aMat);
    gl.vertexAttribPointer(uSolid.aPos, 3, gl.FLOAT, false, 28, 0);
    gl.vertexAttribPointer(uSolid.aNorm, 3, gl.FLOAT, false, 28, 12);
    gl.vertexAttribPointer(uSolid.aMat, 1, gl.FLOAT, false, 28, 24);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  function bindLines(buf, model, count) {
    if (!count) return;
    gl.uniformMatrix4fv(uLine.uModel, false, model);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(uLine.aPos);
    gl.enableVertexAttribArray(uLine.aKind);
    gl.vertexAttribPointer(uLine.aPos, 3, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(uLine.aKind, 1, gl.FLOAT, false, 16, 12);
    gl.drawArrays(gl.LINES, 0, count);
  }

  function draw() {
    const palette = THEMES[currentTheme];
    pose(world, clock, currentScroll);
    const aspect = bufferWidth / (bufferHeight || 1);
    const cam = cameraAt(currentScroll, aspect, pointer);

    mat4Perspective(projMat, cam.fovRad, aspect, 0.08, 90.0);
    mat4LookAt(viewMat, cam.eye, cam.target, cam.up);
    mat4Multiply(viewProjMat, projMat, viewMat);

    gl.clear(gl.DEPTH_BUFFER_BIT);

    // 1. Sky / Sanctuary backdrop quad
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(skyProg);
    gl.uniform3fv(uSky.uVoidTop, palette.voidTop);
    gl.uniform3fv(uSky.uVoidBottom, palette.voidBottom);
    gl.uniform3fv(uSky.uSanctuaryBg, palette.sanctuaryBg);
    gl.uniform1f(uSky.uInterior, cam.interiorBlend);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    gl.enableVertexAttribArray(uSky.aCorner);
    gl.vertexAttribPointer(uSky.aCorner, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(uSky.aCorner);

    // 2. Opaque quantized paper-craft architecture
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.useProgram(solidProg);
    gl.uniformMatrix4fv(uSolid.uViewProj, false, viewProjMat);
    gl.uniform3fv(uSolid.uRamp0, palette.ramp[0]);
    gl.uniform3fv(uSolid.uRamp1, palette.ramp[1]);
    gl.uniform3fv(uSolid.uRamp2, palette.ramp[2]);
    gl.uniform3fv(uSolid.uRamp3, palette.ramp[3]);
    gl.uniform3fv(uSolid.uRamp4, palette.ramp[4]);
    gl.uniform3fv(uSolid.uAccent, palette.accent);
    gl.uniform3fv(uSolid.uGlow, palette.glow);
    gl.uniform3fv(uSolid.uSanctuaryBg, palette.sanctuaryBg);
    gl.uniform1f(uSolid.uTime, clock);

    bindSolid(staticSolidBuf, identityMat, world.staticSolid.count);

    // Turntable truss around spire at [2.35, 6.2, 0.25]
    const trussMat = mat4Compose(modelMat, 2.35, 6.20, 0.25, 0, world.state.turntableYaw, 0);
    bindSolid(turntableSolidBuf, trussMat, world.turntable.solid.count);

    // Swaying crimson pendulum suspended under truss
    const pendPivotAngle = world.state.turntableYaw - 2.35;
    const px = 2.35 + 2.15 * Math.cos(pendPivotAngle);
    const pz = 0.25 - 2.15 * Math.sin(pendPivotAngle);
    mat4Compose(tempMat, px, 6.12, pz, 0, pendPivotAngle, world.state.pendulumSwing);
    bindSolid(pendulumSolidBuf, tempMat, world.pendulum.solid.count);

    // Phase-locked 9-blade axial GPU fan at FAN_HUB_CENTER
    const fanMat = mat4Compose(modelMat, FAN_HUB_CENTER[0], FAN_HUB_CENTER[1], FAN_HUB_CENTER[2], 0, 0, world.state.fanAngle);
    bindSolid(fanSolidBuf, fanMat, world.fan.solid.count);

    gl.disableVertexAttribArray(uSolid.aPos);
    gl.disableVertexAttribArray(uSolid.aNorm);
    gl.disableVertexAttribArray(uSolid.aMat);

    // 3. Stay-cables, chalk lines, bus traces & wireframe polyhedra
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(uLine.uViewProj, false, viewProjMat);
    gl.uniform4fv(uLine.uWire, palette.wire);
    gl.uniform4fv(uLine.uChalk, palette.chalk);
    gl.uniform3fv(uLine.uAccent, palette.accent);

    bindLines(staticLineBuf, identityMat, world.staticLines.count);
    mat4Compose(modelMat, 2.35, 6.20, 0.25, 0, world.state.turntableYaw, 0);
    bindLines(turntableLineBuf, modelMat, world.turntable.lines.count);
    bindLines(pendulumLineBuf, tempMat, world.pendulum.lines.count);
    mat4Compose(modelMat, FAN_HUB_CENTER[0], FAN_HUB_CENTER[1], FAN_HUB_CENTER[2], 0, 0, world.state.fanAngle);
    bindLines(fanLineBuf, modelMat, world.fan.lines.count);

    world.polyhedra.forEach((poly, idx) => {
      const r = world.state.polyRot * poly.speed + idx;
      mat4Compose(modelMat, poly.pos[0], poly.pos[1], poly.pos[2], r * 0.7, r, r * 0.4, poly.scale);
      bindLines(idx === 1 ? octaBuf : icosaBuf, modelMat, poly.mesh.count);
    });

    gl.disableVertexAttribArray(uLine.aPos);
    gl.disableVertexAttribArray(uLine.aKind);

    // 4. Floating dust & rising GPU token motes
    gl.depthMask(false);
    gl.useProgram(moteProg);
    gl.uniformMatrix4fv(uMote.uViewProj, false, viewProjMat);
    gl.uniform1f(uMote.uTime, clock);
    gl.uniform1f(uMote.uPointScale, pixelScale);
    gl.uniform3fv(uMote.uMote, palette.mote);
    gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
    gl.enableVertexAttribArray(uMote.aMote);
    gl.vertexAttribPointer(uMote.aMote, 4, gl.FLOAT, false, 16, 0);
    gl.drawArrays(gl.POINTS, 0, MOTE_COUNT);
    gl.disableVertexAttribArray(uMote.aMote);
    gl.depthMask(true);

    renderedFrames += 1;
    host.dataset.groundColor = cam.interiorBlend > 0.55 ? palette.sanctuaryHex : palette.groundHex;
    if (!steadyNotified && renderedFrames >= 2) {
      steadyNotified = true;
      host.dataset.sceneSteady = 'true';
      if (typeof onSteady === 'function') onSteady(host.dataset.groundColor);
    }
  }

  function onPointer(event) {
    if (event.pointerType === 'touch') return;
    const w = view.innerWidth || host.clientWidth || 1;
    const h = view.innerHeight || host.clientHeight || 1;
    pointerTarget.x = clamp((event.clientX / w) * 2 - 1, -1, 1);
    pointerTarget.y = clamp((event.clientY / h) * 2 - 1, -1, 1);
  }

  function stopLoop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    host.dataset.sceneAnimating = 'false';
  }

  function cleanup() {
    stopLoop();
    if (steadyFrame) {
      cancelAnimationFrame(steadyFrame);
      steadyFrame = 0;
    }
    view.removeEventListener('pointermove', onPointer);
    if (resizeObserver) resizeObserver.disconnect();
    if (canvas) canvas.removeEventListener('webglcontextlost', onContextLost);
    if (gl) {
      buffers.forEach((b) => gl.deleteBuffer(b));
      programs.forEach((p) => gl.deleteProgram(p));
      const ext = typeof gl.getExtension === 'function' ? gl.getExtension('WEBGL_lose_context') : null;
      if (ext && typeof ext.loseContext === 'function') ext.loseContext();
    }
    buffers.length = 0;
    programs.length = 0;
    if (canvas && typeof canvas.remove === 'function') canvas.remove();
  }

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    host.dataset.sceneState = 'fallback';
    cleanup();
    if (typeof onFailure === 'function') onFailure(error);
  }

  function onContextLost(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    fail(new Error('WebGL context lost'));
  }

  function tick(timestamp) {
    frame = 0;
    if (!active || failed || disposed) return;
    frame = requestAnimationFrame(tick);
    if (last && timestamp - last < FRAME_INTERVAL) return;
    const delta = last ? Math.min(0.05, (timestamp - last) / 1000) : 0;
    last = timestamp;
    clock += delta;
    pointer.x += (pointerTarget.x - pointer.x) * 0.06;
    pointer.y += (pointerTarget.y - pointer.y) * 0.06;
    try { draw(); } catch (error) { fail(error); }
  }

  try {
    canvas = document.createElement('canvas');
    canvas.id = 'gl';
    canvas.className = 'stage__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const attrs = { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: 'low-power' };
    gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) throw new Error('WebGL unavailable');

    skyProg = compileProgram(gl, SKY_VS, SKY_FS);
    solidProg = compileProgram(gl, SOLID_VS, SOLID_FS);
    lineProg = compileProgram(gl, LINE_VS, LINE_FS);
    moteProg = compileProgram(gl, MOTE_VS, MOTE_FS);
    programs.push(skyProg, solidProg, lineProg, moteProg);

    uSky = {
      aCorner: gl.getAttribLocation(skyProg, 'aCorner'),
      uVoidTop: gl.getUniformLocation(skyProg, 'uVoidTop'),
      uVoidBottom: gl.getUniformLocation(skyProg, 'uVoidBottom'),
      uSanctuaryBg: gl.getUniformLocation(skyProg, 'uSanctuaryBg'),
      uInterior: gl.getUniformLocation(skyProg, 'uInterior')
    };
    uSolid = {
      aPos: gl.getAttribLocation(solidProg, 'aPos'),
      aNorm: gl.getAttribLocation(solidProg, 'aNorm'),
      aMat: gl.getAttribLocation(solidProg, 'aMat'),
      uViewProj: gl.getUniformLocation(solidProg, 'uViewProj'),
      uModel: gl.getUniformLocation(solidProg, 'uModel'),
      uRamp0: gl.getUniformLocation(solidProg, 'uRamp0'),
      uRamp1: gl.getUniformLocation(solidProg, 'uRamp1'),
      uRamp2: gl.getUniformLocation(solidProg, 'uRamp2'),
      uRamp3: gl.getUniformLocation(solidProg, 'uRamp3'),
      uRamp4: gl.getUniformLocation(solidProg, 'uRamp4'),
      uAccent: gl.getUniformLocation(solidProg, 'uAccent'),
      uGlow: gl.getUniformLocation(solidProg, 'uGlow'),
      uSanctuaryBg: gl.getUniformLocation(solidProg, 'uSanctuaryBg'),
      uTime: gl.getUniformLocation(solidProg, 'uTime')
    };
    uLine = {
      aPos: gl.getAttribLocation(lineProg, 'aPos'),
      aKind: gl.getAttribLocation(lineProg, 'aKind'),
      uViewProj: gl.getUniformLocation(lineProg, 'uViewProj'),
      uModel: gl.getUniformLocation(lineProg, 'uModel'),
      uWire: gl.getUniformLocation(lineProg, 'uWire'),
      uChalk: gl.getUniformLocation(lineProg, 'uChalk'),
      uAccent: gl.getUniformLocation(lineProg, 'uAccent')
    };
    uMote = {
      aMote: gl.getAttribLocation(moteProg, 'aMote'),
      uViewProj: gl.getUniformLocation(moteProg, 'uViewProj'),
      uTime: gl.getUniformLocation(moteProg, 'uTime'),
      uPointScale: gl.getUniformLocation(moteProg, 'uPointScale'),
      uMote: gl.getUniformLocation(moteProg, 'uMote')
    };

    skyBuf = uploadBuffer(new Float32Array([-1, -1, 3, -1, -1, 3]));
    staticSolidBuf = uploadBuffer(world.staticSolid.array);
    staticLineBuf = uploadBuffer(world.staticLines.array);
    turntableSolidBuf = uploadBuffer(world.turntable.solid.array);
    turntableLineBuf = uploadBuffer(world.turntable.lines.array);
    pendulumSolidBuf = uploadBuffer(world.pendulum.solid.array);
    pendulumLineBuf = uploadBuffer(world.pendulum.lines.array);
    fanSolidBuf = uploadBuffer(world.fan.solid.array);
    fanLineBuf = uploadBuffer(world.fan.lines.array);
    icosaBuf = uploadBuffer(world.polyhedra[0].mesh.array);
    octaBuf = uploadBuffer(world.polyhedra[1].mesh.array);
    moteBuf = uploadBuffer(world.motes);

    canvas.addEventListener('webglcontextlost', onContextLost);
    resize();
    host.append(canvas);
    draw();
    host.dataset.sceneState = 'ready';
    host.dataset.sceneAnimating = 'false';
    steadyFrame = requestAnimationFrame(() => {
      steadyFrame = 0;
      if (failed || disposed || steadyNotified) return;
      try { draw(); } catch (error) { fail(error); }
    });
  } catch (error) {
    fail(error);
  }

  if (!failed) {
    if (finePointer()) view.addEventListener('pointermove', onPointer, { passive: true });
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        if (failed || disposed) return;
        try { resize(); if (!active) draw(); } catch (error) { fail(error); }
      });
      resizeObserver.observe(host);
    }
  }

  return {
    setActive(next) {
      const wanted = Boolean(next);
      if (failed || disposed || wanted === active) return;
      active = wanted;
      if (active) {
        last = 0;
        host.dataset.sceneAnimating = 'true';
        frame = requestAnimationFrame(tick);
      } else {
        stopLoop();
      }
    },
    setScroll(nextScroll) {
      if (failed || disposed) return;
      const clamped = clamp(Number.isFinite(nextScroll) ? nextScroll : 0, 0, 1);
      if (Math.abs(clamped - currentScroll) < 1e-5) return;
      currentScroll = clamped;
      if (!active) {
        try { draw(); } catch (error) { fail(error); }
      }
    },
    setTheme(nextTheme) {
      if (failed || disposed) return;
      const normalized = nextTheme === 'dark' ? 'dark' : 'light';
      if (normalized === currentTheme) return;
      currentTheme = normalized;
      if (!active) {
        try { draw(); } catch (error) { fail(error); }
      }
    },
    getGroundColor() {
      return host.dataset.groundColor || THEMES[currentTheme].groundHex;
    },
    dispose() {
      if (disposed) return;
      active = false;
      if (!failed) cleanup();
      disposed = true;
    }
  };
}

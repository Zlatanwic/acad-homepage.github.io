// Paper-plane cyanotype WebGL engine for Kuo Li's homepage.
// Zero third-party runtime dependencies: flat-faceted procedural architecture,
// Etihad Stadium interior pitch skim (12 cigar stay-cable masts, wave roof,
// The Pep Guardiola Stand & 93:20 scoreboard), cantilevered 33 RPM-styled bullet-time Britpop
// vinyl turntable & ruby tonearm, Shanghai->Beijing Tsinghua Old Gate corridor
// & Roofline compute monument, and a phase-locked 9-blade axial GPU fan
// flythrough into an HBM3e skyline & floating 3D Tensor Core MMA matrix.

export const BLADE_COUNT = 9;
export const BLADE_STEP = (Math.PI * 2) / BLADE_COUNT;
export const FAN_HUB_CENTER = Object.freeze([0, -2.7, -6.25]);
export const FAN_PASS_RADIUS = 1.42;
export const ETIHAD_NORTH_ROOF_TOP = 4.44;

// A 33 1/3 RPM record turns at about 3.49 rad/s. The scene deliberately
// renders this motif at roughly 12% speed so the grooves and ruby stylus
// stay legible during the camera flythrough. It is not a physical simulation.
export const TURNTABLE_DISPLAY_RAD_PER_SEC = 0.42;

export const THEMES = Object.freeze({
  light: Object.freeze({
    voidTop: [0.965, 0.99, 1.0],
    voidBottom: [0.875, 0.957, 0.992],
    coreBg: [0.045, 0.145, 0.42],
    groundHex: '#dff4fd',
    coreHex: '#0b256b',
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
    coreBg: [0.012, 0.036, 0.105],
    groundHex: '#050d20',
    coreHex: '#03091b',
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
const MOTE_COUNT = 176;

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
    this.box(cx + (dz * 0.505) * s, y0 + hy * 0.52, cz + (dz * 0.505) * c, wx * 0.36, hy * 0.42, 0.03, 0.06, yaw);
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
      const x = rx * Math.cos(ang), y = 0, z = rz * Math.sin(ang);
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

  arcXZ(cx, cy, cz, r, aStart, aEnd, steps = 14, kind = 2) {
    let prev = [cx + r * Math.cos(aStart), cy, cz + r * Math.sin(aStart)];
    for (let i = 1; i <= steps; i += 1) {
      const a = lerp(aStart, aEnd, i / steps);
      const next = [cx + r * Math.cos(a), cy, cz + r * Math.sin(a)];
      this.segment(prev, next, kind);
      prev = next;
    }
  }

  finish() {
    return { array: new Float32Array(this.data), count: this.vertexCount };
  }
}

// --- Zero-Dependency 5x7 Pixel Block Font (harmonizes with Monocraft UI) ---
const PIXEL_GLYPHS = Object.freeze({
  P: [30, 17, 17, 30, 16, 16, 16],
  E: [31, 16, 16, 30, 16, 16, 31],
  G: [14, 17, 16, 23, 17, 17, 15],
  U: [17, 17, 17, 17, 17, 17, 14],
  A: [14, 17, 17, 31, 17, 17, 17],
  R: [30, 17, 17, 30, 20, 18, 17],
  D: [30, 17, 17, 17, 17, 17, 30],
  I: [14, 4, 4, 4, 4, 4, 14],
  O: [14, 17, 17, 17, 17, 17, 14],
  L: [16, 16, 16, 16, 16, 16, 31],
  '9': [14, 17, 17, 15, 1, 17, 14],
  '3': [14, 17, 1, 6, 1, 17, 14],
  '2': [14, 17, 1, 6, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14],
  ':': [0, 12, 12, 0, 12, 12, 0],
  ' ': [0, 0, 0, 0, 0, 0, 0]
});

function buildPixelBanner(solid, text, cx, cy, cz, px, depth, defaultMat = 0.96, colonMat = 2.0) {
  const chars = Array.from(text);
  const cols = chars.length * 6 - 1;
  const xOrigin = cx - (cols * px) * 0.5;
  for (let ci = 0; ci < chars.length; ci += 1) {
    const ch = chars[ci];
    const rows = PIXEL_GLYPHS[ch] || PIXEL_GLYPHS[' '];
    const mat = ch === ':' ? colonMat : defaultMat;
    const baseCol = ci * 6;
    for (let r = 0; r < 7; r += 1) {
      const mask = rows[r];
      let c = 0;
      while (c < 5) {
        if (((mask >> (4 - c)) & 1) === 0) {
          c += 1;
          continue;
        }
        let end = c + 1;
        while (end < 5 && ((mask >> (4 - end)) & 1) === 1) end += 1;
        const runLen = end - c;
        const x = xOrigin + (baseCol + c + runLen * 0.5) * px;
        const y = cy + (3 - r) * px;
        solid.box(x, y, cz, runLen * px * 0.96, px * 0.92, depth, mat);
        c = end;
      }
    }
  }
}

// --- Act I: Manchester City's Etihad Stadium (Pitch-Level Interior Bowl) ---
// Camera starts inside the South end (z ~ 23.0), skims low across the striped
// sky-blue turf, 93:20 Agüero trajectory, and North goal, viewing the 12
// cigar-shaped stay-cable masts, saddle-wave cable-net roof, The Pep Guardiola
// Stand ("Blue Wall" + Sky Bar), and the 93:20 scoreboard before soaring over
// the North roof into Act II.
function buildEtihadBowl(solid, lines) {
  const cz = 18.0;

  // Pitch surround apron & sub-base
  solid.box(0, -0.14, cz, 10.6, 0.28, 13.8, 0.36);

  // 12 Alternating Mowed Sky-Blue Turf Stripes (x in [-3.9, 3.9], z in [12.3, 23.7])
  const pitchHalfW = 3.90;
  const zNorth = 12.30, zSouth = 23.70;
  const stripeCount = 12;
  for (let i = 0; i < stripeCount; i += 1) {
    const z0 = lerp(zNorth, zSouth, i / stripeCount);
    const z1 = lerp(zNorth, zSouth, (i + 1) / stripeCount);
    const tone = i % 2 === 0 ? 0.67 : 0.57;
    solid.quad(
      [-pitchHalfW, 0.02, z1],
      [pitchHalfW, 0.02, z1],
      [pitchHalfW, 0.02, z0],
      [-pitchHalfW, 0.02, z0],
      tone
    );
  }

  // Crisp Chalk Pitch Markings (y = 0.045, kind = 2)
  const py = 0.045;
  const pX = 3.78, gN = 12.42, gS = 23.58;
  lines.segment([-pX, py, gN], [pX, py, gN], 2);
  lines.segment([-pX, py, gS], [pX, py, gS], 2);
  lines.segment([-pX, py, gN], [-pX, py, gS], 2);
  lines.segment([pX, py, gN], [pX, py, gS], 2);
  lines.segment([-pX, py, cz], [pX, py, cz], 2); // Halfway line
  lines.ring(0, py, cz, 1.12, 1.12, 32, 2);      // Center circle
  solid.box(0, py, cz, 0.12, 0.02, 0.12, 0.96);  // Center spot

  // North & South 18-yard penalty boxes, 6-yard goal boxes, spots & D-arcs
  for (const dir of [-1, 1]) {
    const gl = dir < 0 ? gN : gS;
    const inZ = -dir; // +1 for North (into pitch), -1 for South
    const penZ = gl + inZ * 1.88;
    const sixZ = gl + inZ * 0.64;
    const spotZ = gl + inZ * 1.28;
    lines.segment([-2.16, py, gl], [-2.16, py, penZ], 2);
    lines.segment([2.16, py, gl], [2.16, py, penZ], 2);
    lines.segment([-2.16, py, penZ], [2.16, py, penZ], 2);
    lines.segment([-1.02, py, gl], [-1.02, py, sixZ], 2);
    lines.segment([1.02, py, gl], [1.02, py, sixZ], 2);
    lines.segment([-1.02, py, sixZ], [1.02, py, sixZ], 2);
    solid.box(0, py, spotZ, 0.09, 0.02, 0.09, 0.96);
    if (dir < 0) {
      lines.arcXZ(0, py, spotZ, 0.96, 0.69, Math.PI - 0.69, 12, 2);
    } else {
      lines.arcXZ(0, py, spotZ, 0.96, -Math.PI + 0.69, -0.69, 12, 2);
    }

    // 3D Goalposts, Crossbar & Netting
    const netZ = gl - inZ * 0.34;
    solid.box(-0.54, 0.22, gl, 0.045, 0.40, 0.045, 0.98);
    solid.box(0.54, 0.22, gl, 0.045, 0.40, 0.045, 0.98);
    solid.box(0, 0.41, gl, 1.12, 0.045, 0.045, 0.98);
    for (const gx of [-0.54, -0.27, 0, 0.27, 0.54]) {
      lines.segment([gx, 0.41, gl], [gx, 0.36, netZ], 2);
      lines.segment([gx, 0.36, netZ], [gx, 0.02, netZ], 2);
    }
    lines.segment([-0.54, 0.36, netZ], [0.54, 0.36, netZ], 2);
    lines.segment([-0.54, 0.03, netZ], [0.54, 0.03, netZ], 2);
  }

  // Iconic "93:20" Agüero Championship-Winning Sequence on the North Turf:
  // Agüero -> Balotelli (falling poke pass) -> Agüero touch -> Crimson Rocket into near top corner!
  const p1 = [0.42, 0.055, 16.45];
  const p2 = [-0.46, 0.055, 15.18]; // Balotelli pivot on edge of box
  const p3 = [0.68, 0.055, 14.08];  // Agüero strike point!
  const p4 = [0.38, 0.27, 12.24];   // Rippling North net!
  lines.segment(p1, p2, 2);
  lines.segment(p2, p3, 2);
  lines.segment(p3, p4, 1); // 1% crimson strike trajectory
  lines.segment([p3[0], p3[1] + 0.02, p3[2]], [p4[0], p4[1] + 0.02, p4[2]], 1);
  solid.box(p2[0], 0.06, p2[2], 0.13, 0.04, 0.13, 0.94);
  solid.box(p3[0], 0.08, p3[2], 0.16, 0.08, 0.16, 2.0); // Crimson 93:20 shot marker

  // --- 360-Degree Elliptical Bowl & Expanded North "Pep Guardiola Stand" ---
  const segs = 36;
  const bowlPt = (rx, rz, y, ang) => [rx * Math.cos(ang), y, cz + rz * Math.sin(ang)];
  // Smooth North-end elevation boost centered at ang = -pi/2 (The Pep Guardiola Stand)
  const northWeight = (ang) => {
    const d = Math.atan2(Math.sin(ang + Math.PI * 0.5), Math.cos(ang + Math.PI * 0.5));
    return Math.pow(Math.max(0, Math.cos(d * 1.65)), 2);
  };
  const roofHeightAt = (ang) => {
    const saddle = 3.18 + 0.46 * Math.cos(2 * ang);
    return lerp(saddle, 4.26, northWeight(ang));
  };

  for (let i = 0; i < segs; i += 1) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const nw0 = northWeight(a0), nw1 = northWeight(a1);

    // Pitch-side perimeter advertising / LED hoarding wall
    solid.quad(
      bowlPt(4.65, 6.42, 0.0, a0),
      bowlPt(4.65, 6.42, 0.0, a1),
      bowlPt(4.65, 6.42, 0.28, a1),
      bowlPt(4.65, 6.42, 0.28, a0),
      i % 3 === 0 ? 0.88 : 0.28
    );

    // Lower Seating Bowl (360 deg)
    solid.quad(
      bowlPt(4.72, 6.48, 0.26, a0),
      bowlPt(4.72, 6.48, 0.26, a1),
      bowlPt(5.75, 7.52, 1.12, a1),
      bowlPt(5.75, 7.52, 1.12, a0),
      i % 2 === 0 ? 0.48 : 0.42
    );

    // Middle Hospitality / Fascia Riser
    solid.quad(
      bowlPt(5.75, 7.52, 1.12, a0),
      bowlPt(5.75, 7.52, 1.12, a1),
      bowlPt(5.82, 7.60, 1.48, a1),
      bowlPt(5.82, 7.60, 1.48, a0),
      0.20
    );

    // Upper Bowl: Steeply raked "Blue Wall" on the North Stand, undulating saddle on E/W/S
    const topY0 = lerp(2.68 + 0.28 * Math.cos(2 * a0), 3.66, nw0);
    const topY1 = lerp(2.68 + 0.28 * Math.cos(2 * a1), 3.66, nw1);
    const outRx0 = lerp(7.45, 7.95, nw0), outRz0 = lerp(9.20, 9.75, nw0);
    const outRx1 = lerp(7.45, 7.95, nw1), outRz1 = lerp(9.20, 9.75, nw1);
    solid.quad(
      bowlPt(5.84, 7.62, 1.48, a0),
      bowlPt(5.84, 7.62, 1.48, a1),
      bowlPt(outRx1, outRz1, topY1, a1),
      bowlPt(outRx0, outRz0, topY0, a0),
      nw0 > 0.35 ? 0.56 : 0.45
    );

    // Exterior Stadium Cladding Wall (visible when soaring out over the North Stand!)
    const rH0 = roofHeightAt(a0), rH1 = roofHeightAt(a1);
    solid.quad(
      bowlPt(8.12, 9.92, -0.22, a1),
      bowlPt(8.12, 9.92, -0.22, a0),
      bowlPt(8.12, 9.92, rH0 - 0.18, a0),
      bowlPt(8.12, 9.92, rH1 - 0.18, a1),
      i % 2 === 0 ? 0.58 : 0.50
    );

    // Sweeping Saddle-Wave Cable-Net Roof Canopy (top + underside facets so both pitch & drone views shine)
    const eave0 = bowlPt(8.32, 10.12, rH0, a0);
    const eave1 = bowlPt(8.32, 10.12, rH1, a1);
    const innerR0 = bowlPt(5.05, 6.72, rH0 - 0.30, a0);
    const innerR1 = bowlPt(5.05, 6.72, rH1 - 0.30, a1);
    const pleatTone = i % 2 === 0 ? 0.86 : 0.74;
    solid.quad(innerR0, innerR1, eave1, eave0, pleatTone);       // Sky-facing roof top
    solid.quad(eave0, eave1, innerR1, innerR0, pleatTone - 0.18); // Pitch-facing roof soffit
    lines.segment(innerR0, innerR1, 0); // Inner catenary tension cable ring
    if (i % 2 === 0) lines.segment(eave0, innerR0, 0);
  }

  // --- North End Feature Architecture: THE PEP GUARDIOLA STAND + SKY BAR + 93:20 SCOREBOARD ---
  // 1) Fascia Ribbon & 3D Pixel Relief Lettering: "PEP GUARDIOLA" (facing +Z toward pitch, proud of curved z<=10.85 bowl)
  const fasciaZ = 10.92;
  solid.box(0, 1.34, fasciaZ, 3.76, 0.46, 0.16, 0.10);
  solid.box(0, 1.59, fasciaZ + 0.02, 3.84, 0.05, 0.18, 0.90);
  solid.box(0, 1.09, fasciaZ + 0.02, 3.84, 0.05, 0.18, 0.90);
  buildPixelBanner(solid, 'PEP GUARDIOLA', 0, 1.34, fasciaZ + 0.10, 0.046, 0.07, 0.98, 2.0);

  // 2) Panoramic Sky Bar & Roof-Walk Steel Truss crowning The Pep Guardiola Stand
  solid.box(0, 3.82, 8.62, 4.75, 0.44, 0.68, 0.22); // Sky Bar dark glass gallery
  for (let m = -4; m <= 4; m += 1) {
    solid.box(m * 0.54, 3.82, 8.97, 0.05, 0.42, 0.06, 0.92); // Crisp Sky Bar window mullions
  }
  solid.box(0, 4.10, 8.62, 5.10, 0.12, 0.84, 0.88); // Sky Bar cantilevered roof brow
  // Roof-walk space-frame bridge truss along peak (z = 8.45, top <= ETIHAD_NORTH_ROOF_TOP = 4.44)
  for (let k = -5; k < 5; k += 1) {
    const x0 = k * 0.48, x1 = (k + 1) * 0.48;
    lines.segment([x0, 4.42, 8.52], [x1, 4.42, 8.52], 0);
    lines.segment([x0, 4.18, 8.52], [x1, 4.42, 8.52], 0);
  }

  // 3) Monumental "93:20" Stadium Scoreboard suspended cleanly from the front North Roof gantry (z = 11.42)
  const sbY = 3.58, sbZ = 11.42;
  solid.box(0, sbY, sbZ, 2.52, 0.74, 0.14, 0.06);       // Deep navy LED matrix cabinet
  solid.box(0, sbY + 0.39, sbZ, 2.60, 0.05, 0.18, 0.90); // Top frame bezel
  solid.box(0, sbY - 0.39, sbZ, 2.60, 0.05, 0.18, 2.0);  // 1% crimson championship underline!
  lines.segment([-0.92, sbY + 0.39, sbZ], [-0.92, 3.98, 11.26], 0);
  lines.segment([0.92, sbY + 0.39, sbZ], [0.92, 3.98, 11.26], 0);
  // Glowing white-cyan digits "93" & "20" with 1% crimson ":" colon!
  buildPixelBanner(solid, '93:20', 0, sbY + 0.01, sbZ + 0.09, 0.072, 0.06, 3.0, 2.0);

  // --- 12 Signature Cigar-Shaped Cable-Stayed Steel Masts & Pre-Tensioned Stay-Cables ---
  // Offset by half-step around -pi/2 so twin North masts at +-15 deg frame the camera exit!
  for (let m = 0; m < 12; m += 1) {
    const ang = -Math.PI * 0.5 + ((m + 0.5) / 12) * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const nw = northWeight(ang);
    const mx = 8.68 * ca, mz = cz + 10.48 * sa;
    const mastH = lerp(6.35, 7.45, nw);
    // 3-tier cigar spindle profile: slender pinned foot -> thicker mid-belly -> needle spire tip
    solid.frustum(mx, -0.22, mz, 0.055, 0.055, 0.115, 0.115, mastH * 0.46, 6, 0.92, false, false);
    solid.frustum(mx, -0.22 + mastH * 0.46, mz, 0.115, 0.115, 0.024, 0.024, mastH * 0.54, 6, 0.96, true, false);
    // Mid-mast steel collar ring
    solid.frustum(mx, -0.22 + mastH * 0.45, mz, 0.15, 0.15, 0.15, 0.15, 0.10, 6, 0.72, true, true);

    const tip = [mx, -0.22 + mastH, mz];
    const upperHinge = [mx, -0.22 + mastH * 0.84, mz];
    const rH = roofHeightAt(ang);
    // 3 Fanning Forestay Cables supporting outer eave, mid-canopy & inner tension ring
    lines.segment(tip, bowlPt(8.15, 9.95, rH, ang), 0);
    lines.segment(tip, bowlPt(6.60, 8.35, rH - 0.14, ang), 0);
    lines.segment(upperHinge, bowlPt(5.08, 6.75, rH - 0.28, ang), 0);
    // Cross-bracing stay-cable to adjacent roof bay
    lines.segment(tip, bowlPt(6.85, 8.60, roofHeightAt(ang + 0.22) - 0.10, ang + 0.22), 0);
    // Twin Backstay Cables anchored to exterior tie-down blocks
    const anchor = [9.75 * ca, -0.10, cz + 11.55 * sa];
    lines.segment(tip, anchor, 0);
    lines.segment(upperHinge, anchor, 0);
    solid.box(anchor[0], -0.12, anchor[2], 0.34, 0.28, 0.34, 0.62, -ang);
  }

  // 4 Exterior Cylindrical Spiral Concourse Ramp Rotundas on Stadium Corners
  for (const ang of [-Math.PI * 0.74, -Math.PI * 0.26, Math.PI * 0.26, Math.PI * 0.74]) {
    const rc = [8.65 * Math.cos(ang), -0.22, cz + 10.35 * Math.sin(ang)];
    solid.frustum(rc[0], -0.22, rc[2], 0.68, 0.68, 0.68, 0.68, 2.35, 12, 0.66, true, false);
    for (let step = 0; step < 18; step += 1) {
      const t0 = step / 18, t1 = (step + 1) / 18;
      const h0 = 0.08 + t0 * 2.05, h1 = 0.08 + t1 * 2.05;
      const p0 = t0 * Math.PI * 3, p1 = t1 * Math.PI * 3;
      const i0 = [rc[0] + 0.68 * Math.cos(p0), -0.22 + h0, rc[2] + 0.68 * Math.sin(p0)];
      const o0 = [rc[0] + 0.90 * Math.cos(p0), -0.22 + h0, rc[2] + 0.90 * Math.sin(p0)];
      const o1 = [rc[0] + 0.90 * Math.cos(p1), -0.22 + h1, rc[2] + 0.90 * Math.sin(p1)];
      const i1 = [rc[0] + 0.68 * Math.cos(p1), -0.22 + h1, rc[2] + 0.68 * Math.sin(p1)];
      solid.quad(i0, o0, o1, i1, 0.84);
      lines.segment([o0[0], o0[1] + 0.11, o0[2]], [o1[0], o1[1] + 0.11, o1[2]], 0);
    }
  }
}

// --- Act II: Cantilevered 33 RPM-styled bullet-time Britpop Vinyl Turntable & Gimbal Tonearm ---
export const TURNTABLE_POSE = Object.freeze({
  pos: [2.62, 4.12, 2.15],
  rx: 0.34,
  ry: -0.28,
  rz: 0.13
});

function buildTurntablePlinth(solid, lines) {
  // Architectural space-frame pylon & cantilevered acoustic deck on right plaza (no classical spire!)
  const px = 4.65, pz = 2.05;
  solid.box(px, 0.02, pz, 1.45, 0.48, 1.45, 0.60);
  // Twin open architectural A-frame support legs rising cleanly to cantilevered deck
  solid.box(px - 0.36, 2.05, pz - 0.32, 0.22, 3.85, 0.22, 0.70);
  solid.box(px + 0.36, 2.05, pz + 0.32, 0.22, 3.85, 0.22, 0.66);
  for (let k = 0; k < 4; k += 1) {
    const y0 = 0.35 + k * 0.90, y1 = y0 + 0.90;
    lines.segment([px - 0.36, y0, pz - 0.32], [px + 0.36, y1, pz + 0.32], 0);
    lines.segment([px + 0.36, y0, pz + 0.32], [px - 0.36, y1, pz - 0.32], 0);
  }
  // Horizontal cantilever truss arm holding the floating turntable deck
  lines.segment([px - 0.36, 3.92, pz - 0.32], [2.62, 3.85, 2.15], 0);
  lines.segment([px + 0.36, 3.92, pz + 0.32], [2.62, 3.85, 2.15], 0);
  lines.segment([px, 2.85, pz], [2.95, 3.85, 2.15], 0);
}

function buildVinylPlatter() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  // Machined 32-facet aluminum platter with stroboscopic speed rim
  solid.frustum(0, -0.14, 0, 2.14, 2.14, 2.08, 2.08, 0.14, 32, 0.84, true, true);
  // Deep ultramarine/vinyl record disc sitting atop platter
  solid.frustum(0, 0.005, 0, 1.98, 1.98, 1.98, 1.98, 0.035, 32, 0.12, true, false);
  // Oasis / Britpop Center Record Label: crisp white outer ring + 1% crimson #e0304e inner ring + glowing spindle
  solid.frustum(0, 0.042, 0, 0.68, 0.68, 0.68, 0.68, 0.015, 24, 0.94, true, false);
  solid.frustum(0, 0.058, 0, 0.46, 0.46, 0.46, 0.46, 0.016, 24, 2.0, true, false);
  solid.frustum(0, 0.075, 0, 0.075, 0.075, 0.05, 0.05, 0.16, 12, 3.0, true, false);

  // Concentric vinyl micro-grooves + segmented light-catching specular groove arcs
  for (const r of [0.84, 1.06, 1.28, 1.50, 1.72, 1.90]) {
    lines.ring(0, 0.052, 0, r, r, 36, 0);
  }
  lines.arcXZ(0, 0.056, 0, 1.38, 0.25, 1.15, 10, 2);
  lines.arcXZ(0, 0.056, 0, 1.62, Math.PI + 0.25, Math.PI + 1.15, 10, 2);
  // Stroboscopic rim calibration ticks
  for (let i = 0; i < 32; i += 2) {
    const a = (i / 32) * Math.PI * 2;
    lines.segment([2.11 * Math.cos(a), -0.02, 2.11 * Math.sin(a)], [2.11 * Math.cos(a), -0.11, 2.11 * Math.sin(a)], 2);
  }
  return { solid: solid.finish(), lines: lines.finish() };
}

function buildTonearm() {
  // Built in local coordinates pivoted at gimbal origin [0, 0, 0]
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  // Gimbal bearing housing & cylindrical rear counterweight
  solid.frustum(0, -0.12, 0, 0.22, 0.22, 0.22, 0.22, 0.28, 14, 0.82, true, true);
  lines.ring(0, 0.20, 0, 0.28, 0.28, 20, 0);
  solid.box(0.42, 0.08, 0.16, 0.34, 0.28, 0.28, 0.54, -0.36); // Counterweight mass
  solid.box(0.24, 0.08, 0.09, 0.38, 0.07, 0.07, 0.88, -0.36); // Rear stub shaft

  // Cantilevered tonearm tube reaching across vinyl grooves to (-1.36, 0.06, -0.58)
  const armYaw = -0.40;
  solid.box(-0.68, 0.09, -0.29, 1.48, 0.055, 0.055, 0.92, armYaw);
  lines.segment([0, 0.15, 0], [-1.36, 0.13, -0.58], 0);
  // Angled headshell + 1% Crimson Ruby Stylus Cartridge (#e0304e) tracking the groove!
  solid.box(-1.44, 0.08, -0.68, 0.30, 0.06, 0.16, 2.0, -0.78);
  solid.box(-1.52, 0.01, -0.74, 0.055, 0.11, 0.055, 2.0, -0.78); // Stylus needle tip
  return { solid: solid.finish(), lines: lines.finish() };
}

// --- Act III: Shanghai -> Beijing (Tongji -> Tsinghua Old Gate) Corridor & Roofline Monument ---
function buildCorridorAndRoofline(solid, lines) {
  // Upper Campus Plaza Terrace (stops cleanly at z = +0.20 so camera descends over an open amphitheater!)
  solid.box(-2.95, -0.45, 3.25, 8.8, 0.45, 6.1, 0.58);
  solid.box(3.35, -0.45, 3.25, 7.6, 0.45, 6.1, 0.58);
  // Central stepped amphitheater stair-ramp between z = +1.8 and z = +0.20
  for (let st = 0; st < 7; st += 1) {
    const z = 1.95 - st * 0.28;
    const y = -0.32 - st * 0.26;
    solid.box(0.20, y, z, 2.15, 0.24, 0.32, 0.68);
  }
  // Left & right elevated terrace wings flanking the GPU Foundry forecourt (z in [-2.95, +0.20])
  solid.box(-3.25, -0.45, -1.38, 5.2, 0.45, 3.16, 0.56);
  solid.box(3.55, -0.45, -1.38, 5.6, 0.45, 3.16, 0.56);

  // 1) Left Foreground: Shanghai / Tongji Modernist Bauhaus Studio Cluster (x ~ -3.4, z ~ +2.5)
  const shX = -3.45, shZ = 2.55;
  solid.box(shX, 0.22, shZ, 1.95, 0.88, 1.15, 0.72, 0.16);
  solid.box(shX + 0.55, 0.78, shZ - 0.25, 1.25, 0.62, 0.92, 0.82, 0.16);
  solid.box(shX - 0.35, 0.52, shZ + 0.56, 1.15, 0.08, 0.22, 0.92, 0.16); // Bauhaus horizontal brise-soleil
  solid.box(shX - 0.35, 0.26, shZ + 0.56, 1.15, 0.08, 0.22, 0.92, 0.16);

  // 2) "Shanghai -> Beijing" High-Speed Rail / Optical Data Arch Viaduct spanning to Tsinghua Gate
  const vStart = [-3.05, 0.26, 1.85];
  const vEnd = [-1.95, 0.26, -0.48];
  const vSteps = 10;
  for (let i = 0; i < vSteps; i += 1) {
    const t0 = i / vSteps, t1 = (i + 1) / vSteps;
    const tm = (t0 + t1) * 0.5;
    const vx = lerp(vStart[0], vEnd[0], tm);
    const vz = lerp(vStart[2], vEnd[2], tm);
    const vy = 0.24 + Math.sin(tm * Math.PI) * 0.16;
    solid.box(vx, vy, vz, 0.46, 0.09, 0.28, 0.84, -0.44);
    // Parabolic arch rib above viaduct deck + suspender cables
    const archY0 = 0.26 + Math.sin(t0 * Math.PI) * 0.92;
    const archY1 = 0.26 + Math.sin(t1 * Math.PI) * 0.92;
    const pA0 = [lerp(vStart[0], vEnd[0], t0), archY0, lerp(vStart[2], vEnd[2], t0)];
    const pA1 = [lerp(vStart[0], vEnd[0], t1), archY1, lerp(vStart[2], vEnd[2], t1)];
    lines.segment(pA0, pA1, 0);
    if (i % 2 === 1) {
      lines.segment([vx, vy + 0.05, vz], [vx, 0.26 + Math.sin(tm * Math.PI) * 0.92, vz], 0);
      solid.box(vx, vy + 0.07, vz, 0.10, 0.04, 0.18, 3.0, -0.44); // Glowing north-bound packet / train!
    }
  }

  // 3) Sculpted Triple-Arch Tsinghua Old Gate (二校门) at [-2.15, -0.22, -1.32]
  const gx = -2.15, gy = -0.22, gz = -1.32;
  solid.box(gx, gy + 0.10, gz, 3.18, 0.20, 0.64, 0.70); // Stepped granite base
  // 4 Classical Pilaster Piers framing Central Arch & Twin Side Arches
  for (const [px, w] of [[-1.34, 0.34], [-0.52, 0.32], [0.52, 0.32], [1.34, 0.34]]) {
    solid.box(gx + px, gy + 0.30, gz, w + 0.08, 0.24, 0.54, 0.76); // Pedestal
    solid.box(gx + px, gy + 1.04, gz, w, 1.28, 0.46, 0.86);        // Shaft
    solid.box(gx + px, gy + 1.72, gz, w + 0.08, 0.10, 0.52, 0.94); // Classical capital
  }
  // Sculpted Arch Spandrels over Central Portal (span 0.72) & Side Portals (span 0.48)
  const buildPortalArch = (ax, spanHalf, springY, lintelY) => {
    const aSegs = 8;
    for (let s = 0; s < aSegs; s += 1) {
      const a0 = (s / aSegs) * Math.PI, a1 = ((s + 1) / aSegs) * Math.PI;
      const x0 = ax - spanHalf * Math.cos(a0), y0 = springY + spanHalf * 0.85 * Math.sin(a0);
      const x1 = ax - spanHalf * Math.cos(a1), y1 = springY + spanHalf * 0.85 * Math.sin(a1);
      // Spandrel masonry filling between arch curve and upper lintel
      solid.quad([x0, y0, gz + 0.22], [x1, y1, gz + 0.22], [x1, lintelY, gz + 0.22], [x0, lintelY, gz + 0.22], 0.88);
      solid.quad([x1, y1, gz - 0.22], [x0, y0, gz - 0.22], [x0, lintelY, gz - 0.22], [x1, lintelY, gz - 0.22], 0.72);
      lines.segment([x0, y0, gz + 0.23], [x1, y1, gz + 0.23], 2);
    }
  };
  buildPortalArch(gx, 0.36, gy + 1.18, gy + 1.76);
  buildPortalArch(gx - 0.93, 0.24, gy + 1.05, gy + 1.76);
  buildPortalArch(gx + 0.93, 0.24, gy + 1.05, gy + 1.76);
  // Entablature Cornice, Central Attic Crown & "清华园" Plaque Tablet
  solid.box(gx, gy + 1.86, gz, 3.14, 0.18, 0.56, 0.92);
  solid.box(gx, gy + 2.26, gz, 1.38, 0.58, 0.44, 0.88);
  solid.box(gx, gy + 2.24, gz + 0.24, 0.68, 0.26, 0.04, 0.12); // Inscribed plaque recess
  // Curved Classical Attic Pediment & Twin Finials
  for (let s = 0; s < 8; s += 1) {
    const a0 = (s / 8) * Math.PI, a1 = ((s + 1) / 8) * Math.PI;
    const x0 = gx - 0.68 * Math.cos(a0), x1 = gx - 0.68 * Math.cos(a1);
    const y0 = gy + 2.55 + 0.28 * Math.sin(a0), y1 = gy + 2.55 + 0.28 * Math.sin(a1);
    solid.quad([x0, gy + 2.55, gz + 0.23], [x1, gy + 2.55, gz + 0.23], [x1, y1, gz + 0.23], [x0, y0, gz + 0.23], 0.94);
    lines.segment([x0, y0, gz + 0.24], [x1, y1, gz + 0.24], 2);
  }
  solid.box(gx - 0.66, gy + 2.68, gz, 0.12, 0.24, 0.12, 0.96);
  solid.box(gx + 0.66, gy + 2.68, gz, 0.12, 0.24, 0.12, 0.96);

  // 4) Tiered KV-Cache Origami Pavilions (FP16 / INT8 / CPU memory tiers)
  const kvHouses = [
    [-4.15, -0.22, -1.05, 0.78, 0.84, 0.36, 0.72, 0.16],
    [-4.65, -0.22, -1.95, 0.74, 0.72, 0.34, 0.70, -0.14],
    [-3.65, -0.22, -2.25, 0.70, 0.66, 0.32, 0.68, 0.22],
    [-4.18, 0.74, -1.65, 0.62, 0.60, 0.28, 0.62, 0.08],
    [1.65, -0.22, 0.65, 0.72, 0.68, 0.32, 0.68, -0.18],
    [2.38, -0.22, 0.95, 0.66, 0.60, 0.28, 0.64, 0.12]
  ];
  for (const [x, y, z, w, h, rh, d, yaw] of kvHouses) {
    solid.gableHouse(x, y, z, w, h, rh, d, yaw, 0.64);
  }

  // 5) Right Wing Landmark: The Roofline Compute Monument (算力屋脊纪念碑, z = -1.62)
  // Operational-Intensity plinth -> 45-deg Memory-Bandwidth Ramp -> Ridge-Point Beacon -> Compute Ceiling!
  const rz = -1.62, ry = -0.22;
  solid.box(3.45, ry + 0.12, rz, 4.10, 0.24, 1.28, 0.56); // Operational Intensity X-axis base
  for (let tk = 0; tk < 9; tk += 1) {
    const tx = 1.62 + tk * 0.45;
    lines.segment([tx, ry + 0.25, rz + 0.65], [tx, ry + 0.25, rz + 0.50], 2);
  }
  // Ascending Memory-Bandwidth Slope (x: 1.58 -> 3.38, y: 0.02 -> 2.86)
  const rampSteps = 14;
  for (let s = 0; s < rampSteps; s += 1) {
    const u = (s + 0.5) / rampSteps;
    const sx = lerp(1.62, 3.38, u);
    const topY = lerp(0.18, 2.86, u);
    const colH = topY - (ry + 0.24);
    solid.box(sx, ry + 0.24 + colH * 0.5, rz, 0.15, colH, 0.94, s % 2 === 0 ? 0.74 : 0.64);
  }
  // Crisp continuous Roofline slope ribbon + parallel memory-channel chalk lines
  solid.quad([1.54, 0.06, rz + 0.52], [3.38, 2.92, rz + 0.52], [3.38, 2.92, rz - 0.52], [1.54, 0.06, rz - 0.52], 0.90);
  lines.segment([1.52, 0.10, rz + 0.46], [3.38, 2.96, rz + 0.46], 2);
  lines.segment([1.52, 0.10, rz - 0.46], [3.38, 2.96, rz - 0.46], 2);

  // Horizontal Compute-Bound Peak FLOP/s Plateau (x: 3.38 -> 5.38, y = 2.88)
  solid.box(4.38, 2.82, rz, 2.02, 0.22, 1.06, 0.92);
  lines.segment([3.38, 2.96, rz + 0.46], [5.38, 2.96, rz + 0.46], 2);
  lines.segment([3.38, 2.96, rz - 0.46], [5.38, 2.96, rz - 0.46], 2);
  // Architectural support colonnade beneath Compute-Bound plateau
  for (const px of [3.55, 4.38, 5.18]) {
    solid.box(px, ry + 1.48, rz - 0.34, 0.18, 2.48, 0.18, 0.62);
    solid.box(px, ry + 1.48, rz + 0.34, 0.18, 2.48, 0.18, 0.68);
  }
  // 1% Crimson Ridge-Point Beacon Pylon at the exact Memory/Compute inflection knee!
  solid.box(3.38, 3.12, rz, 0.24, 0.38, 0.24, 2.0);
  solid.box(3.38, 3.38, rz, 0.12, 0.18, 0.12, 3.0);

  // Optical RDMA / NVLink interconnect catenaries tying Turntable, Tsinghua Gate, Roofline & GPU Foundry
  lines.catenary([2.62, 3.82, 2.15], [-2.15, 2.35, -1.32], 0.44, 12, 0);
  lines.catenary([2.62, 3.82, 2.15], [3.38, 3.12, -1.62], 0.32, 10, 0);
  lines.catenary([-2.15, 1.85, -1.55], [-2.85, 0.10, -5.75], 0.48, 12, 0);
  lines.catenary([3.38, 2.92, -1.62], [2.85, 0.10, -5.75], 0.48, 12, 0);

  // Serene Luminous "Blue Moon" Disc high in the northern sky
  const moonX = -5.6, moonY = 8.4, moonZ = -6.4, moonR = 1.72;
  for (let i = 0; i < 28; i += 1) {
    const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2;
    solid.tri(
      [moonX, moonY, moonZ],
      [moonX + moonR * Math.cos(a0), moonY + moonR * Math.sin(a0), moonZ],
      [moonX + moonR * Math.cos(a1), moonY + moonR * Math.sin(a1), moonZ],
      3.0
    );
  }
  lines.ring(moonX, moonY, moonZ + 0.05, 2.12, 2.12, 36, 2, Math.PI * 0.5, 0.18);
}

// --- Act IV: Monumental Axial GPU Shroud, Vapor-Chamber Canyon, Cyberpunk HBM3e Skyline & 8x8 SM Die ---
function buildGpuFoundry(solid, lines) {
  const [fx, fy, fz] = FAN_HUB_CENTER; // [0, -2.7, -6.25]
  const shroudZ = -6.0;
  const rIntake = 2.48;

  // Sunken Foundry Forecourt & Stepped Retaining Walls (y = -5.6 -> -0.22)
  solid.box(0, -5.85, -3.2, 12.8, 0.50, 6.2, 0.46);
  solid.box(-5.7, -2.9, -3.2, 1.4, 5.4, 6.0, 0.40);
  solid.box(5.7, -2.9, -3.2, 1.4, 5.4, 6.0, 0.40);

  // GPU Shroud Front Plate with Circular Intake Funnel (r = 2.48)
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
    solid.quad([ix0, iy0, shroudZ], [ox0, oy0, shroudZ], [ox1, oy1, shroudZ], [ix1, iy1, shroudZ], i % 6 < 3 ? 0.64 : 0.52);
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

  // Exterior Side Heatsink Fin Grilles & PCIe / NVLink Edge-Fingers
  for (const side of [-1, 1]) {
    for (let f = 0; f < 9; f += 1) {
      solid.box(side * (3.35 + f * 0.21), -2.55, -5.86, 0.06, 4.4, 0.28, 0.44);
    }
    solid.box(side * 4.2, -0.15, -5.76, 1.9, 0.26, 0.36, 0.82);
    solid.box(side * 4.2, -5.15, -5.76, 1.9, 0.26, 0.36, 0.82);
  }
  for (let p = -10; p <= 10; p += 1) {
    if (Math.abs(p) === 2) continue;
    solid.box(p * 0.42, -5.38, -5.68, 0.18, 0.42, 0.14, p % 3 === 0 ? 3.0 : 0.84);
  }
  for (const ang of [-0.28, 0.28, Math.PI - 0.28, Math.PI + 0.28]) {
    const midX = fx + 1.52 * Math.cos(ang), midY = fy + 1.52 * Math.sin(ang);
    solid.box(midX, midY, -6.64, 1.92, 0.10, 0.14, 0.38, 0);
  }

  // --- Interior Silicon & Vapor-Chamber Canyon (z = -6.6 -> -20.6) ---
  // Zero chapel arches, zero pews, zero cross!
  solid.quad([-5.5, -5.2, -20.6], [5.5, -5.2, -20.6], [5.5, 0.8, -20.6], [-5.5, 0.8, -20.6], 4.0);
  solid.quad([-5.5, -5.2, -6.6], [-5.5, -5.2, -20.6], [-5.5, 0.8, -20.6], [-5.5, 0.8, -6.6], 4.0);
  solid.quad([5.5, -5.2, -20.6], [5.5, -5.2, -6.6], [5.5, 0.8, -6.6], [5.5, 0.8, -20.6], 4.0);
  solid.quad([-5.5, 0.8, -6.6], [-5.5, 0.8, -20.6], [5.5, 0.8, -20.6], [5.5, 0.8, -6.6], 4.0);
  solid.quad([-5.5, -5.2, -20.6], [-5.5, -5.2, -6.6], [5.5, -5.2, -6.6], [5.5, -5.2, -20.6], 0.14);

  // Outer Aluminum Heatsink Fin Walls
  for (let k = 0; k < 21; k += 1) {
    const z = -7.2 - k * 0.58;
    for (const side of [-1, 1]) {
      solid.box(side * 3.85, -2.25, z, 1.65, 5.4, 0.08, k % 2 === 0 ? 0.44 : 0.34);
      solid.box(side * 3.00, -2.25, z, 0.07, 5.1, 0.11, 0.66);
    }
  }

  // Angular Industrial Vapor-Chamber Trusses & Longitudinal Square Heatpipes (Hard 45-deg chamfers!)
  for (const z of [-8.0, -10.2, -12.4, -14.6, -16.8, -18.6]) {
    solid.box(0, -0.18, z, 4.30, 0.16, 0.22, 0.68); // Flat horizontal vapor-chamber beam
    solid.box(-2.62, -0.68, z, 1.32, 0.14, 0.20, 0.56, 0); // Angled gussets via diagonal struts
    solid.box(2.62, -0.68, z, 1.32, 0.14, 0.20, 0.56, 0);
    lines.segment([-3.10, -1.25, z], [-2.10, -0.22, z], 0);
    lines.segment([-2.10, -0.22, z], [2.10, -0.22, z], 0);
    lines.segment([2.10, -0.22, z], [3.10, -1.25, z], 0);
  }
  for (const hx of [-1.72, -0.86, 0.86, 1.72]) {
    solid.box(hx, -0.05, -13.3, 0.14, 0.14, 12.4, 0.74);
  }

  // Asymmetric Cyberpunk HBM3e 3D-Stacked TSV Memory Skyscrapers & PagedAttention Slots
  // [x, z, diesTall, wx, dz] — staggered heights & depths on left and right!
  const hbmTowers = [
    [-2.05, -8.35, 5, 0.86, 1.15],
    [2.18, -8.75, 8, 0.92, 1.22],
    [-1.82, -10.35, 9, 0.88, 1.18],
    [1.92, -11.05, 6, 0.84, 1.08],
    [-2.25, -12.45, 11, 0.96, 1.28],
    [2.28, -13.15, 10, 0.94, 1.24],
    [-1.88, -14.65, 7, 0.86, 1.12],
    [1.86, -15.25, 11, 0.92, 1.20],
    [-2.22, -16.85, 9, 0.90, 1.18],
    [2.18, -17.35, 8, 0.88, 1.16]
  ];
  for (const [hx, hz, dies, wx, dz] of hbmTowers) {
    const sign = hx < 0 ? -1 : 1;
    for (let d = 0; d < dies; d += 1) {
      const ty = -5.06 + d * 0.27;
      const topCap = d === dies - 1;
      solid.box(hx, ty, hz, wx, 0.21, dz, topCap ? 0.84 : 0.34 + (d % 3) * 0.12);
    }
    // Vertical Through-Silicon Via (TSV) luminescent edge pin line facing canyon center
    const innerX = hx - sign * (wx * 0.5 + 0.02);
    const topY = -5.06 + (dies - 1) * 0.27 + 0.11;
    lines.segment([innerX, -5.16, hz - dz * 0.35], [innerX, topY, hz - dz * 0.35], 2);
    lines.segment([innerX, -5.16, hz + dz * 0.35], [innerX, topY, hz + dz * 0.35], 2);

    // 45-degree Manhattan PCB Differential Bus Traces on Silicon Interposer Floor!
    const kneeX = sign * 0.62;
    const busX = sign * (0.14 + (Math.abs(Math.round(hz)) % 3) * 0.14);
    const kneeZ = hz - Math.abs(innerX - kneeX);
    lines.segment([innerX, -5.15, hz], [kneeX, -5.15, kneeZ], 2);
    lines.segment([kneeX, -5.15, kneeZ], [busX, -5.15, kneeZ - 0.48], 2);
    lines.segment([busX, -5.15, kneeZ - 0.48], [busX, -5.15, -19.1], 0);
  }

  // --- Rear Silicon Die Backdrop (z = -19.45): Uniform 8x8 SM Compute Checkerboard (NO CROSS!) ---
  const dieZ = -19.45, dieY = -2.28;
  solid.box(0, dieY, dieZ - 0.12, 4.96, 4.72, 0.14, 0.18); // Interposer package frame
  solid.box(0, dieY, dieZ, 4.24, 4.24, 0.10, 0.26);        // Exposed silicon die reticle
  lines.segment([-2.14, dieY + 2.14, dieZ + 0.06], [2.14, dieY + 2.14, dieZ + 0.06], 2);
  lines.segment([-2.14, dieY - 2.14, dieZ + 0.06], [2.14, dieY - 2.14, dieZ + 0.06], 2);

  // 8 x 8 = 64 Uniform Streaming Multiprocessor (SM) Compute Tiles (zero central cruciform bar!)
  const pitch = 0.48;
  for (let ix = 0; ix < 8; ix += 1) {
    for (let iy = 0; iy < 8; iy += 1) {
      const tx = (ix - 3.5) * pitch;
      const ty = dieY + (iy - 3.5) * pitch;
      const cornerDma = (ix === 0 || ix === 7) && (iy === 0 || iy === 7);
      const checker = (ix + iy) % 2 === 0;
      const diagWave = (ix + iy) % 4 === 0;
      const mat = cornerDma ? 3.0 : (diagWave ? 0.88 : (checker ? 0.64 : 0.44));
      solid.box(tx, ty, dieZ + 0.07, 0.36, 0.36, 0.08, mat);
    }
  }
}

// --- Dynamic Climax Centerpiece: Deconstructed 3x3x3 3D Tensor Core MMA Cube ---
function buildTensorCore() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  const pitch = 0.44;
  const sz = 0.29;

  for (let ix = -1; ix <= 1; ix += 1) {
    for (let iy = -1; iy <= 1; iy += 1) {
      for (let iz = -1; iz <= 1; iz += 1) {
        const manhattan = Math.abs(ix) + Math.abs(iy) + Math.abs(iz);
        // Leave center-face ports slightly recessed so glowing inner core shines out!
        if (manhattan === 1) {
          solid.box(ix * pitch * 0.72, iy * pitch * 0.72, iz * pitch * 0.72, sz * 0.78, sz * 0.78, sz * 0.78, 3.0);
          continue;
        }
        const isCore = manhattan === 0;
        const isCrimsonTile = (ix === 1 && iy === 1 && iz === 1) || (ix === -1 && iy === -1 && iz === 1);
        const mat = isCore ? 3.0 : (isCrimsonTile ? 2.0 : ((ix + iy + iz) % 2 === 0 ? 0.88 : 0.66));
        solid.box(ix * pitch, iy * pitch, iz * pitch, sz, sz, sz, mat);
      }
    }
  }

  // Isometric tensor slice bounding wireframe + internal MMA dataflow axes
  const b = 0.68;
  for (const s1 of [-b, b]) {
    for (const s2 of [-b, b]) {
      lines.segment([-b, s1, s2], [b, s1, s2], 2);
      lines.segment([s1, -b, s2], [s1, b, s2], 2);
      lines.segment([s1, s2, -b], [s1, s2, b], 2);
    }
  }
  return { solid: solid.finish(), lines: lines.finish() };
}

function buildTensorHalo() {
  const lines = new LineBuilder();
  // Octagonal Shared-Memory / DMA orbital frame around the 3D Tensor Core
  lines.ring(0, 0, 0, 1.32, 1.32, 8, 2, Math.PI * 0.5, 0);
  lines.ring(0, 0, 0, 1.46, 1.46, 8, 0, Math.PI * 0.5, Math.PI / 8);
  return lines.finish();
}

function buildWarpScanline() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  // Razor-thin 1% crimson Warp-Scheduler scan bar sweeping across the 8x8 SM silicon die
  solid.box(0, 0, 0, 3.92, 0.055, 0.04, 2.0);
  lines.segment([-2.12, 0, 0.03], [2.12, 0, 0.03], 1);
  return { solid: solid.finish(), lines: lines.finish() };
}

// --- Dynamic Wireframe Meshes: 2x2x2 TileLang Tiling Lattice & Geodesic Polyhedron ---
function buildTileLatticeWireframe() {
  const lines = new LineBuilder();
  for (const g of [-0.6, 0, 0.6]) {
    for (const h of [-0.6, 0, 0.6]) {
      if (Math.abs(g) === 0 && Math.abs(h) === 0) continue;
      lines.segment([-0.6, g, h], [0.6, g, h], 0);
      lines.segment([g, -0.6, h], [g, 0.6, h], 0);
      lines.segment([g, h, -0.6], [g, h, 0.6], 0);
    }
  }
  return lines.finish();
}

function buildGeodesicWireframe() {
  const lines = new LineBuilder();
  const phi = (1 + Math.sqrt(5)) * 0.5;
  const raw = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  const verts = raw.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  });
  for (let i = 0; i < verts.length; i += 1) {
    for (let j = i + 1; j < verts.length; j += 1) {
      const d = Math.hypot(verts[i][0] - verts[j][0], verts[i][1] - verts[j][1], verts[i][2] - verts[j][2]);
      if (d < 1.15) lines.segment(verts[i], verts[j], 0);
    }
  }
  return lines.finish();
}

// --- Dynamic 9-Blade Sculpted Axial GPU Intake Fan ---
function buildAxialFan() {
  const solid = new MeshBuilder();
  const lines = new LineBuilder();
  const rHub = 0.58, rTip = 2.38;

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
      solid.quad(f00, f10, f11, f01, 0.78);
      solid.quad(b01, b11, b10, b00, 0.44);
      solid.quad(f01, f11, b11, b01, 0.90);
      solid.quad(b00, b10, f10, f00, 0.36);
      if (ru === rSteps - 1) solid.quad(f10, b10, b11, f11, 0.86);
    }
  }
  return { solid: solid.finish(), lines: lines.finish() };
}

// --- Phase-Locked Axial Fan Angle (Collision-Free Passage at Any Timestamp) ---
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
  // Act I-A: Pitch-level opening inside Etihad South end — grass, 93:20 trajectory, Pep Guardiola Stand & 12 masts
  { s: 0.00, eye: [0.00, 1.32, 23.05], target: [0.00, 2.50, 10.40], fov: 50 },
  // Act I-B: Low-altitude skim across the center circle toward North box, tilting up at Pep Guardiola Stand & 93:20 board
  { s: 0.12, eye: [0.00, 1.08, 16.85], target: [0.00, 3.18, 9.20], fov: 49 },
  // Act I-C: Spidercam ascent in front of North Stand fascia (y = 5.42 > roof 4.44 before crossing z = 10.8!)
  { s: 0.20, eye: [0.00, 5.42, 11.35], target: [0.40, 4.20, 3.00], fov: 47 },
  // Act II-A: Soaring over The Pep Guardiola Stand roof between twin North masts -> 33 RPM-styled bullet-time Turntable & Tonearm!
  { s: 0.27, eye: [0.08, 5.52, 7.55], target: [1.15, 3.70, 1.20], fov: 45 },
  // Act II-B / III-A: Past spinning Vinyl Turntable -> Shanghai->Beijing Viaduct, Tsinghua Old Gate & Roofline Monument
  { s: 0.46, eye: [-0.12, 2.75, 3.65], target: [0.18, 1.05, -2.90], fov: 45 },
  // Act III-B: Over open central amphitheater stair-ramp between Tsinghua Gate & Roofline Ridge-Point
  { s: 0.58, eye: [0.00, 0.88, 0.55], target: [0.00, -1.65, -6.25], fov: 45 },
  // Act III-C: Aligned with sunken Axial GPU Foundry intake shroud
  { s: 0.68, eye: [0.00, -1.28, -1.55], target: [0.00, -2.35, -7.80], fov: 45 },
  // Act IV-A1: Bullet-time phase-locked 9-blade fan framing left & right
  { s: 0.78, eye: [0.00, FAN_HUB_CENTER[1] + FAN_PASS_RADIUS, -4.95], target: [0.00, -2.38, -13.50], fov: 50 },
  // Act IV-A2: Exact collision-free passage through rotor plane at z = -6.25
  { s: 0.84, eye: [0.00, FAN_HUB_CENTER[1] + FAN_PASS_RADIUS, FAN_HUB_CENTER[2]], target: [0.00, -2.35, -15.80], fov: 48 },
  // Act IV-B: Inside Tensor Core Canyon — facing floating 3x3x3 Tensor Cube & 8x8 SM Silicon Die
  { s: 1.00, eye: [0.00, -2.42, -11.20], target: [0.00, -2.32, -17.20], fov: 44 }
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

  // Narrow-viewport adaptation:
  // - Inside Etihad bowl (s < 0.24): widen FOV without pushing Z backward into South Stand!
  // - In exterior courtyard (s in [0.26, 0.60]): gentle pullback to frame Turntable + Tsinghua + Roofline.
  // - Before GPU fan gap (s >= 0.72): taper pullback to 0 so blade clearance stays exact!
  const courtyardMask = smoothstep(0.24, 0.31, s) * (1 - smoothstep(0.56, 0.71, s));
  if (safeAspect < 1.1) {
    const narrow = clamp((1.1 - safeAspect) / 0.65, 0, 1);
    eye[2] += narrow * 2.6 * courtyardMask;
    fov += narrow * 8.5 * (1 - 0.42 * smoothstep(0.72, 0.86, s));
  }

  // Subtle pointer parallax; zeroed during fan-blade passage for collision safety
  const parallaxMask = (1 - smoothstep(0.62, 0.73, s)) + 0.22 * smoothstep(0.91, 0.98, s);
  const px = clamp(pointer?.x || 0, -1, 1) * parallaxMask;
  const py = clamp(pointer?.y || 0, -1, 1) * parallaxMask;
  eye[0] += px * 0.28;
  eye[1] -= py * 0.14;

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
  const scale = Math.min(safeDpr, fine ? 1.35 : 1.05) * 0.86;
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), scale];
}

export function buildWorld() {
  const staticSolid = new MeshBuilder();
  const staticLines = new LineBuilder();
  buildEtihadBowl(staticSolid, staticLines);
  buildTurntablePlinth(staticSolid, staticLines);
  buildCorridorAndRoofline(staticSolid, staticLines);
  buildGpuFoundry(staticSolid, staticLines);

  const turntable = buildVinylPlatter();
  const tonearm = buildTonearm();
  const fan = buildAxialFan();
  const tensorCore = buildTensorCore();
  const tensorHalo = buildTensorHalo();
  const warpScan = buildWarpScanline();
  const tileLattice = buildTileLatticeWireframe();
  const geodesic = buildGeodesicWireframe();

  const rand = seeded(20270901);
  const motes = new Float32Array(MOTE_COUNT * 4);
  for (let i = 0; i < MOTE_COUNT; i += 1) {
    const interior = i >= 112;
    if (interior) {
      motes[i * 4] = (rand() - 0.5) * 4.6;
      motes[i * 4 + 1] = -4.9 + rand() * 4.6;
      motes[i * 4 + 2] = -7.4 - rand() * 11.6;
      motes[i * 4 + 3] = 1 + rand(); // >= 1 marks rising interior GPU token mote
    } else {
      motes[i * 4] = (rand() - 0.5) * 18.0;
      motes[i * 4 + 1] = -0.8 + rand() * 11.5;
      motes[i * 4 + 2] = -5.5 + rand() * 29.5; // spans GPU court through Etihad pitch!
      motes[i * 4 + 3] = rand(); // < 1 marks exterior sky mote
    }
  }

  const state = {
    turntableYaw: 0,
    tonearmSway: 0,
    fanAngle: fanAngleAt(0, 0),
    tensorRot: 0,
    warpScanY: 0,
    polyRot: 0,
    time: 0,
    scroll: 0
  };

  return {
    staticSolid: staticSolid.finish(),
    staticLines: staticLines.finish(),
    turntable,
    tonearm,
    fan,
    tensorCore,
    tensorHalo,
    warpScan,
    polyhedra: [
      // 2x2x2 TileLang Tiling Lattice hovering directly above the Roofline Ridge-Point Beacon!
      { mesh: tileLattice, kind: 'tile', pos: [3.38, 4.18, -1.62], scale: 0.52, speed: 0.26 },
      // Geodesic polyhedron floating above the stadium-to-courtyard transition
      { mesh: geodesic, kind: 'geo', pos: [-3.95, 5.65, 4.25], scale: 0.62, speed: -0.21 },
      // Second TileLang block near the GPU Foundry intake
      { mesh: tileLattice, kind: 'tile', pos: [-3.25, 2.85, -3.45], scale: 0.44, speed: 0.19 }
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
  world.state.turntableYaw = -time * TURNTABLE_DISPLAY_RAD_PER_SEC; // bullet-time 33 RPM motif
  world.state.tonearmSway = Math.sin(time * 1.15) * 0.026;
  world.state.fanAngle = fanAngleAt(s, time);
  world.state.tensorRot = time * 0.34;
  world.state.warpScanY = Math.sin(time * 1.05) * 1.72;
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
uniform vec3 uCoreBg;
uniform float uInterior;
void main() {
  vec3 sky = mix(uVoidBottom, uVoidTop, smoothstep(0.0, 0.92, vUv.y));
  vec3 col = mix(sky, uCoreBg, uInterior);
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
uniform vec3 uCoreBg;
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
    gl_FragColor = vec4(clamp(uCoreBg + grain * 0.35, 0.0, 1.0), 1.0);
    return;
  }
  if (vMat > 2.5) {
    float pulse = 0.94 + 0.06 * sin(uTime * 2.2 + vWorldPos.y * 1.4);
    gl_FragColor = vec4(clamp(uGlow * pulse + grain * 0.2, 0.0, 1.0), 1.0);
    return;
  }
  vec3 n = normalize(vNormal);
  vec3 sunDir = normalize(vec3(0.52, 0.78, 0.34));
  float diff = max(dot(n, sunDir), 0.0);
  float hemi = n.y * 0.5 + 0.5;

  // Inside the GPU Tensor Core canyon (z < -6.55), illuminate HBM3e & SM die from the floating 3D Tensor Core!
  float inChamber = step(vWorldPos.z, -6.55);
  vec3 corePos = vec3(0.0, -2.28, -15.60);
  vec3 coreDir = normalize(corePos - vWorldPos);
  float coreDist = length(corePos - vWorldPos);
  float coreLight = max(dot(n, coreDir), 0.0) * (1.0 / (1.0 + coreDist * 0.12));

  if (vMat > 1.5) {
    vec3 crimson = (diff > 0.22 || inChamber > 0.5) ? uAccent : uAccent * 0.78;
    gl_FragColor = vec4(clamp(crimson + grain * 0.25, 0.0, 1.0), 1.0);
    return;
  }

  float extShade = diff * 0.66 + hemi * 0.34 + (vMat - 0.5) * 0.62;
  float intShade = coreLight * 0.82 + hemi * 0.24 + (vMat - 0.5) * 0.74;
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

export function createScene(host, { theme = 'light', scroll = 0, onSteady, onFailure, onGroundChange } = {}) {
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
  const deckBaseMat = mat4Identity();
  const localMat = mat4Identity();

  let skyProg, solidProg, lineProg, moteProg;
  let skyBuf, staticSolidBuf, staticLineBuf;
  let turntableSolidBuf, turntableLineBuf, tonearmSolidBuf, tonearmLineBuf;
  let fanSolidBuf, fanLineBuf, tensorSolidBuf, tensorLineBuf, tensorHaloBuf;
  let warpSolidBuf, warpLineBuf, tileBuf, geoBuf, moteBuf;
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

    mat4Perspective(projMat, cam.fovRad, aspect, 0.08, 95.0);
    mat4LookAt(viewMat, cam.eye, cam.target, cam.up);
    mat4Multiply(viewProjMat, projMat, viewMat);

    // Precompute tilted turntable parent transform so platter & tonearm share one exact plane
    mat4Compose(
      deckBaseMat,
      TURNTABLE_POSE.pos[0],
      TURNTABLE_POSE.pos[1],
      TURNTABLE_POSE.pos[2],
      TURNTABLE_POSE.rx,
      TURNTABLE_POSE.ry,
      TURNTABLE_POSE.rz
    );

    gl.clear(gl.DEPTH_BUFFER_BIT);

    // 1. Sky / Tensor-Core backdrop quad
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(skyProg);
    gl.uniform3fv(uSky.uVoidTop, palette.voidTop);
    gl.uniform3fv(uSky.uVoidBottom, palette.voidBottom);
    gl.uniform3fv(uSky.uCoreBg, palette.coreBg);
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
    gl.uniform3fv(uSolid.uCoreBg, palette.coreBg);
    gl.uniform1f(uSolid.uTime, clock);

    bindSolid(staticSolidBuf, identityMat, world.staticSolid.count);

    // Spinning 33 RPM-styled bullet-time vinyl platter in tilted deck plane
    mat4Compose(localMat, 0, 0, 0, 0, world.state.turntableYaw, 0);
    mat4Multiply(modelMat, deckBaseMat, localMat);
    bindSolid(turntableSolidBuf, modelMat, world.turntable.solid.count);

    // Gimbal counterweight tonearm & 1% crimson ruby stylus tracking the record
    mat4Compose(localMat, 2.02, 0.06, 0.56, 0, world.state.tonearmSway, 0);
    mat4Multiply(modelMat, deckBaseMat, localMat);
    bindSolid(tonearmSolidBuf, modelMat, world.tonearm.solid.count);

    // Phase-locked 9-blade axial GPU fan at FAN_HUB_CENTER
    mat4Compose(modelMat, FAN_HUB_CENTER[0], FAN_HUB_CENTER[1], FAN_HUB_CENTER[2], 0, 0, world.state.fanAngle);
    bindSolid(fanSolidBuf, modelMat, world.fan.solid.count);

    // Floating Deconstructed 3x3x3 3D Tensor Core MMA Cube
    const tr = world.state.tensorRot;
    mat4Compose(modelMat, 0, -2.28, -15.60, 0.48 + Math.sin(tr * 1.4) * 0.12, tr, 0.36);
    bindSolid(tensorSolidBuf, modelMat, world.tensorCore.solid.count);

    // Dynamic Crimson Warp-Scheduler Scanline sweeping across the 8x8 SM Silicon Die
    mat4Compose(modelMat, 0, -2.28 + world.state.warpScanY, -19.34, 0, 0, 0);
    bindSolid(warpSolidBuf, modelMat, world.warpScan.solid.count);

    gl.disableVertexAttribArray(uSolid.aPos);
    gl.disableVertexAttribArray(uSolid.aNorm);
    gl.disableVertexAttribArray(uSolid.aMat);

    // 3. Stay-cables, pitch chalk, vinyl grooves, PCB bus traces & TileLang wireframes
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(uLine.uViewProj, false, viewProjMat);
    gl.uniform4fv(uLine.uWire, palette.wire);
    gl.uniform4fv(uLine.uChalk, palette.chalk);
    gl.uniform3fv(uLine.uAccent, palette.accent);

    bindLines(staticLineBuf, identityMat, world.staticLines.count);

    mat4Compose(localMat, 0, 0, 0, 0, world.state.turntableYaw, 0);
    mat4Multiply(modelMat, deckBaseMat, localMat);
    bindLines(turntableLineBuf, modelMat, world.turntable.lines.count);

    mat4Compose(localMat, 2.02, 0.06, 0.56, 0, world.state.tonearmSway, 0);
    mat4Multiply(modelMat, deckBaseMat, localMat);
    bindLines(tonearmLineBuf, modelMat, world.tonearm.lines.count);

    mat4Compose(modelMat, FAN_HUB_CENTER[0], FAN_HUB_CENTER[1], FAN_HUB_CENTER[2], 0, 0, world.state.fanAngle);
    bindLines(fanLineBuf, modelMat, world.fan.lines.count);

    mat4Compose(modelMat, 0, -2.28, -15.60, 0.48 + Math.sin(tr * 1.4) * 0.12, tr, 0.36);
    bindLines(tensorLineBuf, modelMat, world.tensorCore.lines.count);

    // Counter-rotating Shared-Memory / DMA octagonal halo around the Tensor Core
    mat4Compose(modelMat, 0, -2.28, -15.60, 0.18 * Math.sin(tr), -tr * 0.45, -tr * 0.65);
    bindLines(tensorHaloBuf, modelMat, world.tensorHalo.count);

    mat4Compose(modelMat, 0, -2.28 + world.state.warpScanY, -19.34, 0, 0, 0);
    bindLines(warpLineBuf, modelMat, world.warpScan.lines.count);

    world.polyhedra.forEach((poly, idx) => {
      const r = world.state.polyRot * poly.speed + idx;
      mat4Compose(modelMat, poly.pos[0], poly.pos[1], poly.pos[2], r * 0.65, r, r * 0.4, poly.scale);
      bindLines(poly.kind === 'geo' ? geoBuf : tileBuf, modelMat, poly.mesh.count);
    });

    gl.disableVertexAttribArray(uLine.aPos);
    gl.disableVertexAttribArray(uLine.aKind);

    // 4. Floating stadium dust & rising GPU token motes
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
    const groundColor = cam.interiorBlend > 0.55 ? palette.coreHex : palette.groundHex;
    if (host.dataset.groundColor !== groundColor) {
      host.dataset.groundColor = groundColor;
      if (typeof onGroundChange === 'function') onGroundChange(groundColor);
    }
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
    view.removeEventListener('resize', onResize);
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

  function onResize() {
    if (failed || disposed) return;
    try { resize(); if (!active) draw(); } catch (error) { fail(error); }
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
      uCoreBg: gl.getUniformLocation(skyProg, 'uCoreBg'),
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
      uCoreBg: gl.getUniformLocation(solidProg, 'uCoreBg'),
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
    tonearmSolidBuf = uploadBuffer(world.tonearm.solid.array);
    tonearmLineBuf = uploadBuffer(world.tonearm.lines.array);
    fanSolidBuf = uploadBuffer(world.fan.solid.array);
    fanLineBuf = uploadBuffer(world.fan.lines.array);
    tensorSolidBuf = uploadBuffer(world.tensorCore.solid.array);
    tensorLineBuf = uploadBuffer(world.tensorCore.lines.array);
    tensorHaloBuf = uploadBuffer(world.tensorHalo.array);
    warpSolidBuf = uploadBuffer(world.warpScan.solid.array);
    warpLineBuf = uploadBuffer(world.warpScan.lines.array);
    tileBuf = uploadBuffer(world.polyhedra[0].mesh.array);
    geoBuf = uploadBuffer(world.polyhedra[1].mesh.array);
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
    view.addEventListener('resize', onResize, { passive: true });
    if (finePointer()) view.addEventListener('pointermove', onPointer, { passive: true });
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(onResize);
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

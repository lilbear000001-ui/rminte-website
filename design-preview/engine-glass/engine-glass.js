// Engine diagram, three.js version: three frosted glass plates (and an SSD plate) with cells embedded in the glass.
// Pilot for #engine on the home page. three.js 0.186.1 comes from ./vendor/three-engine.js (see vendor/README.md).
//
// How the glass is layered. three's transmission only refracts opaque objects, never another transmissive object, so plates
// cannot simply be stacked. Each plate (its cells + its glass) is rendered on its own, in far-to-near order, and the result of
// the previous layers is handed to the next one as scene.background; that texture is then part of the opaque scene the next
// glass refracts. A glass plate therefore sees the plates below it, frosted. The floor reflection runs the same chain from a
// camera mirrored in the floor (near-to-far reversed, since that camera looks up from below).
import * as THREE from './vendor/three-engine.js';

const {clamp, lerp} = THREE.MathUtils;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ constants */
const PW = 4.5, PD = 2.7, PH = .28, BEVEL = .1;
const CAM = {R: 23, tx: 1.1, ty: [-.1, -.5, -.1], tz: 0, az: .62, el: .47, fov: .31 / DEG, near: 1, far: 60};
// The floor sits just under the lowest plate of each scene (it is only ever seen as a reflection), and the camera drops a little
// in scene 1 so the SSD plate and its reflection fit.
const FLOOR = [-2.45, -4.2, -2.45];
// Plates, bottom to top. y / sc: per-scene height and scale (the SSD plate only exists in scene 1).
const PLATES = [
  {name: 'ssd', w: PW, d: 1.02, y: [-3.5, -3.5, -3.5], sc: [0, 1, 0]},
  {name: 'base', w: PW, d: PD, y: [-1.7, -1.7, -1.7], sc: [1, 1, 1]},
  {name: 'mid', w: PW, d: PD, y: [0, .06, 0], sc: [1, 1, 1]},
  {name: 'top', w: PW, d: PD, y: [1.7, 1.8, 1.66], sc: [1, 1, 1]}
];
const PMX = .36, PMZ = .3; // inner margin of a plate
const ENV = {top: .8, back: .3, stripA: 2.2, stripB: 1.7, stripC: .8}; // studio light radiances, linear (overridable with ?envTop= ...)
// The palette below was tuned as display values (written straight to the screen); the scene is linear, so convert once.
const lin = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
const L3 = c => c.map(lin);
// Brightness steps for the cells: silver-white levels, never pure white. SAP is the one sapphire accent (shared prefix).
const GAIN = .7; // the frosted glass adds its own haze on top, so the cells themselves sit one step lower
const lit = c => L3(c).map(v => v * GAIN);
const WH = lit([.8, .82, .85]), SIL = lit([.68, .7, .73]), MID = lit([.46, .48, .51]), DIM = L3([.13, .14, .155]);
const SAP = lit([0xA8 / 255, 0xB8 / 255, 0xF0 / 255]); // sapphire-300, used only for the shared-prefix cache cells
const BLOCK_BIG = lit([.54, .56, .59]);

const bezier = (x1, y1, x2, y2) => { // CSS cubic-bezier(), the site's settle curve is (.32,.72,0,1)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d; }
    return Y(t);
  };
};
const settle = bezier(.32, .72, 0, 1);
const hsh = i => (((i * 2654435761) >>> 0) % 100);

/* ------------------------------------------------------------------ plate outline */
// A polygon whose corners carry fillet radii -> a dense contour with outward normals. Used for the slab walls, the SDF bake,
// and to find the vertex a label is attached to.
function filletPolygon(V) {
  const n = V.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = V[i], b = V[(i + 1) % n]; area += a.x * b.z - b.x * a.z; }
  const sg = area > 0 ? 1 : -1, pts = [];
  for (let i = 0; i < n; i++) {
    const p0 = V[(i + n - 1) % n], p1 = V[i], p2 = V[(i + 1) % n];
    let d1x = p1.x - p0.x, d1z = p1.z - p0.z, l = Math.hypot(d1x, d1z); d1x /= l; d1z /= l;
    let d2x = p2.x - p1.x, d2z = p2.z - p1.z; l = Math.hypot(d2x, d2z); d2x /= l; d2z /= l;
    const cross = d1x * d2z - d1z * d2x, turn = Math.atan2(cross, d1x * d2x + d1z * d2z);
    const r = p1.r, t = r * Math.tan(Math.abs(turn) / 2);
    const sx = p1.x - d1x * t, sz = p1.z - d1z * t;
    const n1x = sg * d1z, n1z = -sg * d1x;             // outward normal of the incoming edge
    const s = cross * sg > 0 ? 1 : -1;                 // +1 convex corner (centre inside the plate), -1 concave
    const cx = sx - s * r * n1x, cz = sz - s * r * n1z;
    const seg = Math.max(3, Math.ceil(Math.abs(turn) / (Math.PI / 2) * clamp(Math.round(8 + r * 20), 6, 16)));
    for (let k = 0; k <= seg; k++) {
      const a = turn * k / seg, ca = Math.cos(a), sa = Math.sin(a);
      const nx = n1x * ca - n1z * sa, nz = n1x * sa + n1z * ca;
      pts.push({x: cx + s * r * nx, z: cz + s * r * nz, nx, nz});
    }
  }
  return pts;
}

// Rounded rectangle with a cut front-right corner and an optional notch in the front edge (z+ is toward the viewer).
function makeOutline(W, D, o = {}) {
  const hx = W / 2, hz = D / 2, R = o.R ?? .42, c = o.chamfer ?? 0, cr = o.chamferR ?? .3;
  const v = [{x: -hx, z: -hz, r: R}, {x: hx, z: -hz, r: R}];
  if (c) v.push({x: hx, z: hz - c, r: cr}, {x: hx - c, z: hz, r: cr});
  else v.push({x: hx, z: hz, r: R});
  if (o.notch) {
    const n = o.notch;
    v.push({x: n.x1, z: hz, r: n.rm}, {x: n.x1, z: hz - n.depth, r: n.rb}, {x: n.x0, z: hz - n.depth, r: n.rb}, {x: n.x0, z: hz, r: n.rm});
  }
  v.push({x: -hx, z: hz, r: R});
  return filletPolygon(v);
}

/* ------------------------------------------------------------------ slab geometry */
// Rings along the contour: bottom rim, bottom bevel arc, wall, top bevel arc, top rim. Normals are analytic, so the bevel is a
// true round (a quarter circle of radius b) and shades smoothly. The two caps are triangulated from the outermost rings.
function buildSlab(outline, H, b) {
  const n = outline.length, S = 7, rings = [];
  rings.push({i: b, y: -H / 2, c: 0, s: -1});
  for (let k = 1; k <= S; k++) { const f = -Math.PI / 2 + k * (Math.PI / 2) / S; rings.push({i: b - b * Math.cos(f), y: -H / 2 + b + b * Math.sin(f), c: Math.cos(f), s: Math.sin(f)}); }
  rings.push({i: 0, y: H / 2 - b, c: 1, s: 0});
  for (let k = 1; k <= S; k++) { const f = k * (Math.PI / 2) / S; rings.push({i: b - b * Math.cos(f), y: H / 2 - b + b * Math.sin(f), c: Math.cos(f), s: Math.sin(f)}); }
  rings[S].c = 1; rings[S].s = 0; rings[S].i = 0;
  const last = rings.length - 1;
  rings[last].c = 0; rings[last].s = 1;
  const pos = new Float32Array(rings.length * n * 3), nor = new Float32Array(rings.length * n * 3), uv = new Float32Array(rings.length * n * 2);
  rings.forEach((r, ri) => outline.forEach((p, i) => {
    const o = ri * n + i, x = p.x - p.nx * r.i, z = p.z - p.nz * r.i;
    pos.set([x, r.y, z], o * 3);
    nor.set([p.nx * r.c, r.s, p.nz * r.c], o * 3);
    uv.set([x / PW + .5, z / PD + .5], o * 2);
  }));
  const idx = [];
  // winding: a side quad must face the way its vertex normal points
  const quad = (a, bb, c, d, flip) => flip ? idx.push(a, c, bb, bb, c, d) : idx.push(a, bb, c, bb, d, c);
  const probe = (ri) => {
    const a = ri * n, bb = ri * n + 1, c = (ri + 1) * n;
    const A = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]], B = [pos[bb * 3] - A[0], pos[bb * 3 + 1] - A[1], pos[bb * 3 + 2] - A[2]], C = [pos[c * 3] - A[0], pos[c * 3 + 1] - A[1], pos[c * 3 + 2] - A[2]];
    const cr = [B[1] * C[2] - B[2] * C[1], B[2] * C[0] - B[0] * C[2], B[0] * C[1] - B[1] * C[0]];
    return cr[0] * nor[a * 3] + cr[1] * nor[a * 3 + 1] + cr[2] * nor[a * 3 + 2] < 0;
  };
  const flip = probe(S + 1);
  for (let ri = 0; ri < rings.length - 1; ri++) for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(ri * n + i, ri * n + j, (ri + 1) * n + i, (ri + 1) * n + j, flip); }
  const contour = (ri) => outline.map((p, i) => new THREE.Vector2(pos[(ri * n + i) * 3], pos[(ri * n + i) * 3 + 2]));
  const cap = (ri, up) => {
    const tri = THREE.ShapeUtils.triangulateShape(contour(ri), []);
    for (const [a, bb, c] of tri) {
      const A = ri * n + a, B = ri * n + bb, C = ri * n + c;
      const e = (pos[B * 3] - pos[A * 3]) * (pos[C * 3 + 2] - pos[A * 3 + 2]) - (pos[B * 3 + 2] - pos[A * 3 + 2]) * (pos[C * 3] - pos[A * 3]); // y of the cross product
      (e > 0) === !up ? idx.push(A, B, C) : idx.push(A, C, B);
    }
  };
  cap(last, true); cap(0, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Signed-distance field of the outline, baked once into a half-float texture: R = depth inside the plate, GB = inward direction.
// The engraved lines in the glass shader are iso-lines of R, so they follow the notch and the cut corner exactly.
function bakeSdf(outline, W, D, pad, res) {
  const w = Math.ceil((W + 2 * pad) * res), h = Math.ceil((D + 2 * pad) * res), x0 = -W / 2 - pad, z0 = -D / 2 - pad;
  const m = outline.length, data = new Uint16Array(w * h * 4), half = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = x0 + (i + .5) / res, pz = z0 + (j + .5) / res;
    let best = 1e9, bx = 0, bz = 0, inside = false;
    for (let k = 0; k < m; k++) {
      const a = outline[k], b = outline[(k + 1) % m], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez;
      const t = l2 ? clamp(((px - a.x) * ex + (pz - a.z) * ez) / l2, 0, 1) : 0, cx = a.x + ex * t, cz = a.z + ez * t, d2 = (px - cx) ** 2 + (pz - cz) ** 2;
      if (d2 < best) { best = d2; bx = cx; bz = cz; }
      if ((a.z > pz) !== (b.z > pz) && px < a.x + (pz - a.z) / (b.z - a.z) * ex) inside = !inside;
    }
    const d = Math.sqrt(best) || 1e-6, s = inside ? 1 : -1, o = (j * w + i) * 4;
    data[o] = half(s * d);
    data[o + 1] = half(s * (px - bx) / d);
    data[o + 2] = half(s * (pz - bz) / d);
    data[o + 3] = half(1);
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return {tex, box: new THREE.Vector4(x0, z0, w / res, h / res)};
}

/* ------------------------------------------------------------------ environment */
// The studio the glass reflects: a dark gradient, a soft top box, a back light and three long strip lights. Baked into an
// equirect half-float map and prefiltered by PMREM; the scene rotates it slowly (and with the pointer) so highlights drift.
function envColor(rx, ry, rz) {
  const nrm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
  const dot = (a) => rx * a[0] + ry * a[1] + rz * a[2];
  const h = ry * .5 + .5;
  // dark graphite room, a touch brighter overhead (linear radiance)
  let r = lerp(.003, .014, h), g = lerp(.0032, .0148, h), b = lerp(.0036, .0165, h);
  const add = (k, c) => { r += c[0] * k; g += c[1] * k; b += c[2] * k; };
  const sm = x => { x = clamp((x - .1) / .5, 0, 1); return x * x * (3 - 2 * x); };
  const strip = (dir, axis, w) => Math.exp(-((dot(axis) / w) ** 2)) * sm(dot(dir)); // a long soft strip light facing `dir`
  add(Math.pow(Math.max(dot(nrm(.1, 1, -.25)), 0), 5) * ENV.top, [.97, .98, 1]);           // soft box overhead
  add(Math.pow(Math.max(dot(nrm(-.15, .42, -.9)), 0), 3) * ENV.back, [.95, .96, .98]);    // wide back light
  add(strip(nrm(-1, .25, .15), nrm(0, 0, 1), .09) * ENV.stripA, [1, 1, 1]);               // three long strips
  add(strip(nrm(.7, .2, -.8), nrm(.7, 0, .7), .08) * ENV.stripB, [.95, .96, .98]);
  add(strip(nrm(.2, .35, 1), nrm(1, 0, 0), .07) * ENV.stripC, [1, 1, 1]);
  return [r, g, b];
}
function makeEnvTexture(w = 512, h = 256) {
  const data = new Uint16Array(w * h * 4), half = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < h; j++) {
    const lat = ((j + .5) / h - .5) * Math.PI, y = Math.sin(lat), cl = Math.cos(lat);
    for (let i = 0; i < w; i++) {
      const phi = ((i + .5) / w - .5) * 2 * Math.PI, c = envColor(cl * Math.cos(phi), y, cl * Math.sin(phi)), o = (j * w + i) * 4;
      data[o] = half(c[0]); data[o + 1] = half(c[1]); data[o + 2] = half(c[2]); data[o + 3] = half(1);
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
// A faint pool of graphite light behind everything, so the glass has something to refract at the edges.
function makeGlowTexture(w = 128, h = 128) {
  const data = new Uint16Array(w * h * 4), half = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (i + .5) / w - .45, dy = ((j + .5) / h - .46) * .8, k = Math.exp(-(dx * dx + dy * dy) * 22), o = (j * w + i) * 4;
    data[o] = half(lin(.045) * k); data[o + 1] = half(lin(.05) * k); data[o + 2] = half(lin(.055) * k); data[o + 3] = half(1);
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ glass material */
// MeshPhysicalMaterial (transmission, thickness, IOR, attenuation, GGX reflections from the studio) patched in three places:
//  - the transmitted sample is a crisp look-up plus a wide, mip-blurred one: content stays readable but a soft haze blooms
//    around bright cells (frosted glass, not clear glass);
//  - roughness is lower on the polished bevel and wall than on the satin faces;
//  - the top face carries engraved lines, ticks and vents (normal perturbation, so they catch light and refract).
const TRANSMISSION_SAMPLE = `vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
	float spread = applyIorToRoughness( roughness, ior );
	vec4 crisp = textureBicubic( transmissionSamplerMap, fragCoord, uLodSharp * ( 0.4 + spread * 1.6 ) );
	// haze: Gaussian-weighted taps on a Vogel disc, rotated per pixel (interleaved gradient noise), on a low mip. A bright cell
	// blooms into a round soft halo; a single high mip would show its square texels.
	vec2 texel = 1.0 / transmissionSamplerSize;
	float rot = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
	vec3 haze = vec3( 0.0 ), far = vec3( 0.0 );
	float wsum = 0.0;
	for ( int i = 0; i < 32; i ++ ) {
		float f = ( float( i ) + 0.5 ) / 32.0, r = sqrt( f ) * uHazeR * 2.2, a = float( i ) * 2.39996 + rot;
		float w = exp( - f * 2.42 );
		haze += w * textureLod( transmissionSamplerMap, fragCoord + vec2( cos( a ), sin( a ) ) * r * texel, uLodHaze ).rgb;
		wsum += w;
	}
	haze /= wsum;
	for ( int i = 0; i < 12; i ++ ) {
		float f = ( float( i ) + 0.5 ) / 12.0, r = sqrt( f ) * uHazeR * 6.0, a = float( i ) * 2.39996 - rot;
		far += textureLod( transmissionSamplerMap, fragCoord + vec2( cos( a ), sin( a ) ) * r * texel, uLodHaze + 1.5 ).rgb;
	}
	haze = mix( haze, far / 12.0, 0.3 );
	return vec4( crisp.rgb * uSharp + haze * uHaze + vec3( uMilk ), crisp.a );
}
`;
function glassChunk() {
  const src = THREE.ShaderChunk.transmission_pars_fragment;
  const a = src.indexOf('vec4 getTransmissionSample('), b = src.indexOf('vec3 volumeAttenuation(');
  return src.slice(0, a) + TRANSMISSION_SAMPLE + '\n\t' + src.slice(b);
}
const GLASS_FRAG_HEAD = `
varying vec3 vObj; varying vec3 vObjN;
uniform sampler2D uSdf; uniform vec4 uSdfBox; uniform float uEngrave; uniform vec2 uHalf;
uniform float uSharp, uHaze, uMilk, uLodSharp, uLodHaze, uHazeR, uEdgeRough, uRim, uTime, uGroove, uFlow;
`;
const GLASS_ROUGHNESS = `
float roughnessFactor = roughness;
float eTop = smoothstep( 0.55, 0.95, abs( vObjN.y ) );
float edgeMask = 1.0 - eTop;
roughnessFactor = mix( uEdgeRough, roughness, eTop );
`;
const GLASS_NORMAL = `
vec2 tilt = vec2( 0.0 );
float grooveMask = 0.0;
if ( eTop > 0.001 ) {
	float tt = uTime * 0.35;
	tilt += vec2( sin( vObj.x * 1.7 + tt ) * 0.010 + sin( vObj.z * 3.1 - tt * 1.3 ) * 0.007, cos( vObj.z * 1.9 + tt * 0.8 ) * 0.010 + cos( vObj.x * 2.3 + tt ) * 0.007 ) * eTop * uFlow;
	if ( uEngrave > 0.5 && vObjN.y > 0.9 ) {
		vec2 p = vObj.xz; // p.y is the plate's z
		vec3 sd = texture2D( uSdf, ( p - uSdfBox.xy ) / uSdfBox.zw ).xyz;
		// keylines following the outline (iso-lines of the signed distance)
		float u1 = ( sd.x - 0.165 ) / 0.0055, u2 = ( sd.x - 0.207 ) / 0.0035;
		float g1 = exp( - u1 * u1 ), g2 = exp( - u2 * u2 );
		tilt -= sd.yz * ( 1.3 * u1 * g1 + 1.0 * u2 * g2 );
		grooveMask = max( g1, g2 * 0.8 );
		// ruler ticks along the front edge, every fifth one longer
		float cell = p.x / 0.09, fx = ( fract( cell + 0.5 ) - 0.5 ) * 0.09, idx = floor( cell + 0.5 );
		float len = mod( idx, 5.0 ) < 0.5 ? 0.13 : 0.07, zt = uHalf.y - 0.285;
		float inX = step( -0.74, p.x ) * step( p.x, 1.4 ), inZ = smoothstep( 0.0, 0.006, zt - p.y ) * smoothstep( 0.0, 0.006, p.y - ( zt - len ) );
		float ut = fx / 0.0042, gt = exp( - ut * ut ) * inX * inZ;
		tilt.x -= 1.2 * ut * gt; grooveMask = max( grooveMask, gt );
		// vents: seven fine slots parallel to the front edge
		float vz = ( p.y - 0.4 ) / 0.056, fz = ( fract( vz + 0.5 ) - 0.5 ) * 0.056, vi = floor( vz + 0.5 );
		float inV = step( 0.0, vi ) * step( vi, 6.0 ) * smoothstep( 0.0, 0.01, p.x - 0.3 ) * smoothstep( 0.0, 0.01, 1.3 - p.x );
		float uv_ = fz / 0.0065, gv = exp( - uv_ * uv_ ) * inV;
		tilt.y -= 1.2 * uv_ * gv; grooveMask = max( grooveMask, gv );
	}
}
vec3 tiltView = mat3( viewMatrix ) * ( mat3( modelMatrix ) * vec3( tilt.x, 0.0, tilt.y ) );
normal = normalize( normal + tiltView );
roughnessFactor = mix( roughnessFactor, 0.14, grooveMask * 0.7 );
`;
const GLASS_EMISSIVE = `
totalEmissiveRadiance += vec3( 0.55, 0.57, 0.6 ) * pow( edgeMask, 1.3 ) * ( 0.4 + 0.6 * step( 0.0, vObjN.y ) ) * uRim;
totalEmissiveRadiance += vec3( 0.9, 0.93, 0.97 ) * grooveMask * uGroove;
`;
function makeGlass(sdf, engrave, half, flag) {
  const u = {
    uSdf: {value: sdf?.tex ?? null}, uSdfBox: {value: sdf?.box ?? new THREE.Vector4()}, uEngrave: {value: engrave ? 1 : 0}, uHalf: {value: new THREE.Vector2(half[0], half[1])},
    uSharp: {value: flag('sharp', .68)}, uHaze: {value: flag('hazeW', .75)}, uMilk: {value: flag('milk', .004)}, uLodSharp: {value: 1.1}, uLodHaze: {value: 3}, uHazeR: {value: 14},
    uEdgeRough: {value: flag('edgeRough', .07)}, uRim: {value: flag('rim', .03)}, uTime: {value: 0}, uGroove: {value: flag('groove', .012)}, uFlow: {value: 1}
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: flag('rough', .4), metalness: 0, transmission: 1, thickness: flag('thick', .36), ior: flag('ior', 1.5),
    attenuationColor: new THREE.Color(0xe4e9ee), attenuationDistance: flag('att', 2.6),
    specularIntensity: flag('spec', 1), envMapIntensity: 1, side: THREE.FrontSide
  });
  m.userData.u = u;
  m.customProgramCacheKey = () => 'rm-glass-' + (engrave ? 'e' : 'p');
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vObjN = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLASS_FRAG_HEAD)
      .replace('#include <transmission_pars_fragment>', glassChunk())
      .replace('#include <roughnessmap_fragment>', GLASS_ROUGHNESS)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + GLASS_NORMAL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + GLASS_EMISSIVE);
  };
  return m;
}

/* ------------------------------------------------------------------ cells (the content inside the glass) */
// Small rounded blocks with real, uniform corner radius. Cells that share a size share one InstancedMesh.
const BLOCK_VERT = `
attribute vec4 aCol;
varying vec3 vN; varying vec4 vC;
void main() {
	vC = aCol;
	vN = normalize( mat3( modelMatrix ) * normal );
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0 );
}`;
const BLOCK_FRAG = `
varying vec3 vN; varying vec4 vC; uniform vec3 uL;
void main() {
	vec3 n = normalize( vN );
	float l = max( dot( n, uL ), 0.0 ), side = 1.0 - abs( n.y );
	vec3 c = vC.rgb * ( 0.5 + 0.5 * l ) * ( 1.0 - side * 0.25 ) + vec3( 0.21, 0.26, 0.32 ) * pow( l, 8.0 ) * 0.12;
	gl_FragColor = vec4( c * mix( 0.8, 1.0, vC.a ), 1.0 );
}`;
const radiusFor = (sx, sy, sz) => Math.min(sy * .45, Math.min(sx, sz) * .2, .035);

/* ------------------------------------------------------------------ the engine */
export function createEngineGlass(stage, opts = {}) {
  const canvas = stage.querySelector('canvas');
  const flag = (k, d = 1) => opts.options?.[k] !== undefined ? Number(opts.options[k]) : d;
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return {ok: false, reason: 'WebGL 2 is not available'};
  const hasFloat = probe.getExtension('EXT_color_buffer_float') || probe.getExtension('EXT_color_buffer_half_float');
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  if (!hasFloat) return {ok: false, reason: 'Floating-point render targets are not available'};

  const reduced = !!opts.reduced;
  const F = {floor: flag('floor'), dof: flag('dof'), bloom: flag('bloom'), engrave: flag('craft'), haze: flag('haze')};
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance'});
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = {neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, reinhard: THREE.ReinhardToneMapping, linear: THREE.LinearToneMapping}[opts.options?.tone ?? 'aces'];
  renderer.toneMappingExposure = flag('exposure', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1.08, CAM.near, CAM.far);
  const mirrorCam = new THREE.PerspectiveCamera(CAM.fov, 1.08, CAM.near, CAM.far);

  /* environment, backdrop, lights */
  const pmrem = new THREE.PMREMGenerator(renderer);
  for (const k of Object.keys(ENV)) if (opts.options?.['env_' + k] !== undefined) ENV[k] = Number(opts.options['env_' + k]);
  const envSrc = makeEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envSrc).texture;
  envSrc.dispose(); pmrem.dispose();
  scene.environmentIntensity = flag('env', 1);
  const glow = makeGlowTexture();
  const glint = new THREE.PointLight(0xffffff, 0, 0, 2); // a crisp specular glint that follows the pointer
  scene.add(glint);

  /* plates */
  const hz = PD / 2;
  const mainOutline = makeOutline(PW, PD, {chamfer: .62, chamferR: .3, notch: {x0: -1.75, x1: -.95, depth: .34, rm: .1, rb: .12}});
  const ssdOutline = makeOutline(PW, 1.02, {R: .3, chamfer: .26, chamferR: .12, notch: {x0: -1.35, x1: -1.05, depth: .2, rm: .06, rb: .08}});
  const sdf = bakeSdf(mainOutline, PW, PD, .1, 118);
  const glassMain = makeGlass(sdf, !!F.engrave, [PW / 2, hz], flag);
  const glassSsd = makeGlass(null, false, [PW / 2, .51], flag);
  const glasses = [glassSsd, glassMain, glassMain, glassMain];
  const slabGeo = {main: buildSlab(mainOutline, PH, BEVEL), ssd: buildSlab(ssdOutline, PH, BEVEL)};

  // The inside of the slab (floor and far walls), drawn as an opaque back-face shell behind the cells. three's own back-face
  // pass for transmissive objects would frost the cells a second time, so the glass is front-face only and this stands in.
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x151515, roughness: flag('shellRough', .5), metalness: 0, side: THREE.BackSide,
    emissive: new THREE.Color(0x1b1b1c), emissiveIntensity: flag('veil', .5), envMapIntensity: flag('shellEnv', 1)
  });
  const blockMat = new THREE.ShaderMaterial({vertexShader: BLOCK_VERT, fragmentShader: BLOCK_FRAG, uniforms: {uL: {value: new THREE.Vector3(-.3, .9, .35).normalize()}}});
  const plates = PLATES.map((p, i) => {
    const group = new THREE.Group();
    const glass = new THREE.Mesh(i === 0 ? slabGeo.ssd : slabGeo.main, glasses[i]);
    glass.frustumCulled = false;
    const shell = new THREE.Mesh(glass.geometry, shellMat);
    shell.frustumCulled = false;
    group.add(shell, glass);
    scene.add(group);
    return {def: p, group, glass, outline: i === 0 ? ssdOutline : mainOutline, groups: new Map(), cells: [], y: p.y[0], s: p.sc[0]};
  });

  const AW = PW - PMX * 2, AD = PD - PMZ * 2;
  function addCell(pi, c) {
    const P = plates[pi], key = [c.sx, c.sy, c.sz].map(v => v.toFixed(4)).join('|');
    let g = P.groups.get(key);
    if (!g) {
      const geo = new THREE.RoundedBoxGeometry(c.sx, c.sy, c.sz, 3, radiusFor(c.sx, c.sy, c.sz));
      g = {geo, n: 0, items: []};
      P.groups.set(key, g);
    }
    c.g = g; c.i = g.items.length;
    g.items.push(c);
    P.cells.push(c);
  }
  // ---- plate 1 (base): 12 x 5 compute units, lit sparsely; more of them in scene 2, pulsing
  {
    const cols = 12, rows = 5, cw = AW / cols, cd = AD / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = hsh(r * cols + c);
      addCell(1, {x: -AW / 2 + cw * (c + .5), z: -AD / 2 + cd * (r + .5), sx: cw * .76, sy: .07, sz: cd * .7, f: x => {
        const lit = [h < 12, h < 38, h < 88];
        const pulse = .8 + .2 * Math.sin(x.t * 1.2 + c * .5 + r);
        let col = [0, 0, 0], glowV = 0;
        for (let s = 0; s < 3; s++) {
          const w = x.w[s], tint = lit[s] ? SIL : DIM;
          col = col.map((v, j) => v + w * tint[j]);
          glowV += w * (lit[s] ? (s === 2 ? .7 + .3 * Math.sin(x.t * 1.2 + c * .5 + r) : 1) : 0);
        }
        const k = lit[2] && x.w[2] > .5 ? pulse : 1;
        return {col: col.map(v => v * k), glow: glowV, vis: 1};
      }});
    }
  }
  // ---- plate 2 (middle): scene 0 = 18 small blocks + one whole block, scene 1 = KV cache, scene 2 = three kernels merging
  {
    const cw0 = AW * .46 / 6, rh = AD * .84 / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      addCell(2, {x: -AW / 2 + cw0 * (c + .5), z: -AD / 2 + AD * .08 + rh * (r + .5), sx: cw0 * .78, sy: .08, sz: rh * .72, f: x => ({col: WH.map(v => v * .9), glow: .6, vis: x.s(0, (r * 6 + c) * 14)})});
    }
    addCell(2, {x: AW * .26, z: 0, sx: AW * .46, sy: .09, sz: AD * .84, f: x => ({col: BLOCK_BIG, glow: .6, vis: x.s(0, 260)})});
    const cols = 12, rows = 5, cw = AW / cols, cd = AD / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let k = -1;
      if (r < 3) { if (c < 12 - 3 - r) k = r; } else if (r === 3) { if (c < 9) k = 1; } else if (c < 6) k = 0;
      const shared = k >= 0 && c < 3, col = k < 0 ? DIM : shared ? SAP : [WH, SIL, MID][k === 0 ? 0 : k === 1 ? 1 : 2], i = r * cols + c;
      addCell(2, {x: -AW / 2 + cw * (c + .5), z: -AD / 2 + cd * (r + .5), sx: cw * .78, sy: .07, sz: cd * .7, f: x => ({col, glow: k < 0 ? 0 : .55 + (shared ? .3 : 0), vis: x.s(1, i * 9)})});
    }
    [-1, 0, 1].forEach(n => addCell(2, {x: 0, z: 0, sx: AW * .3, sy: .09, sz: AD * .5, f: x => {
      const m = x.m;
      return {x: n * (AW * .36 * (1 - m) + AW * .3 * m), col: MID.map((v, j) => v + (SIL[j] - v) * m * .3), glow: .4 + .1 * m, vis: x.s(2, 0)};
    }}));
    [-.28, .28].forEach(z => addCell(2, {x: 0, z: z * AD, sx: AW * .92, sy: .05, sz: AD * .024, f: x => ({col: WH, glow: .9, vis: x.m > .6 ? x.s(2, 0) : 0})}));
    [-.46, .46].forEach(xx => addCell(2, {x: xx * AW, z: 0, sx: AW * .012, sy: .05, sz: AD * .56, f: x => ({col: WH, glow: .9, vis: x.m > .6 ? x.s(2, 0) : 0})}));
  }
  // ---- plate 3 (top): scene 0 = three rays, scene 1 = three request streams, scene 2 = eight scan lines
  {
    [[-.28, .92], [0, .64], [.28, .78]].forEach(([z, w], i) => addCell(3, {x: -AW / 2 + AW * w / 2, z: z * AD, sx: AW * w, sy: .05, sz: .045, f: x => ({col: WH, glow: .9, vis: x.s(0, i * 90)})}));
    [[-.3, WH, .5], [0, SIL, .36], [.3, MID, .62]].forEach(([z, col, sp]) => {
      for (let k = 0; k < 6; k++) addCell(3, {x: 0, z: z * AD, sx: .46, sy: .06, sz: .12, f: x => {
        const L = AW + .9, p = (x.t * sp + k * (L / 6)) % L, fade = Math.min(1, Math.min(p, L - p) / .5);
        return {x: -AW / 2 - .45 + p, col, glow: .8 * fade, vis: x.s(1, k * 40) * fade};
      }});
    });
    for (let k = 0; k < 8; k++) addCell(3, {x: 0, z: -AD * .42 + k * (AD * .84 / 7), sx: AW * .9, sy: .05, sz: .05, f: x => {
      const q = .5 + .5 * Math.sin(x.t * 2.4 - k * .7);
      return {col: SIL.map(v => v * (.35 + .65 * q)), glow: q * .9, vis: x.s(2, k * 40)};
    }});
  }
  // ---- plate 0 (SSD): twelve flash packages
  {
    const aw = PW - .5, ad = 1.02 - .34, cw = aw / 12;
    for (let c = 0; c < 12; c++) addCell(0, {x: -aw / 2 + cw * (c + .5), z: 0, sx: cw * .72, sy: .06, sz: ad * .7, f: x => ({col: MID, glow: .3, vis: x.s(1, c * 25)})});
  }
  for (const P of plates) for (const g of P.groups.values()) {
    const mesh = new THREE.InstancedMesh(g.geo, blockMat, g.items.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.col = new Float32Array(g.items.length * 4);
    g.attr = new THREE.InstancedBufferAttribute(g.col, 4);
    g.attr.setUsage(THREE.DynamicDrawUsage);
    g.geo.setAttribute('aCol', g.attr);
    mesh.frustumCulled = false;
    g.mesh = mesh;
    P.group.add(mesh);
  }

  /* ground: dark glossy floor that mirrors the stack */
  let floorY = FLOOR[0];
  const rtOpts = {type: THREE.HalfFloatType, depthBuffer: true};
  const rtRefl = new THREE.WebGLRenderTarget(4, 4, {...rtOpts, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter});
  const rtHeight = new THREE.WebGLRenderTarget(4, 4, {...rtOpts});
  const reflMat = new THREE.Matrix4();
  const floorMat = new THREE.ShaderMaterial({
    uniforms: {uRefl: {value: rtRefl.texture}, uHeight: {value: rtHeight.texture}, uTex: {value: reflMat}, uStrength: {value: flag('refl', 2.4)}, uFalloff: {value: .55}, uBlur: {value: 1.15}, uCenter: {value: new THREE.Vector2(0, 0)}},
    vertexShader: `uniform mat4 uTex; varying vec4 vProj; varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vProj = uTex * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uRefl, uHeight; uniform float uStrength, uFalloff, uBlur; uniform vec2 uCenter; varying vec4 vProj; varying vec3 vW;
      void main(){
        vec2 uv = vProj.xy / vProj.w;
        float h = texture2D(uHeight, uv).r;
        float fade = exp(-max(h,0.) * uFalloff);
        float lod = clamp(h * uBlur, 0., 5.);
        vec3 r = textureLod(uRefl, uv, lod).rgb;
        vec3 v = normalize(cameraPosition - vW);
        float F = 0.1 + 0.9 * pow(1. - max(v.y, 0.), 4.);
        float edge = 1. - smoothstep(2.6, 7.0, length((vW.xz - uCenter) * vec2(.8, 1.)));
        vec3 c = r * fade * (.2 + .7 * F) * uStrength * edge;
        gl_FragColor = vec4(c, 1.);
      }`
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.frustumCulled = false;
  floor.visible = !!F.floor;
  scene.add(floor);

  /* depth proxies for the depth of field and for the floor-reflection fade: slabs only, no cells, no transmission */
  const proxyScene = new THREE.Scene();
  const proxyOf = geometry => { const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()); m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false; m.frustumCulled = false; proxyScene.add(m); return m; };
  const proxies = plates.map(P => proxyOf(P.glass.geometry));
  const proxyFloor = proxyOf(floor.geometry);
  function syncProxies(withFloor) {
    proxies.forEach((m, i) => { m.matrixWorld.copy(plates[i].group.matrixWorld); m.visible = plates[i].s > .02; });
    proxyFloor.matrixWorld.copy(floor.matrixWorld); proxyFloor.visible = withFloor;
  }
  const heightMat = new THREE.ShaderMaterial({
    uniforms: {uFloorY: {value: floorY}},
    vertexShader: 'uniform float uFloorY; varying float vH; void main(){ vec4 w = modelMatrix * vec4(position,1.); vH = w.y - uFloorY; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying float vH; void main(){ gl_FragColor = vec4(vH, 0., 0., 1.); }'
  });

  /* layered rendering */
  let rtA = null, rtB = null, rtMirrorA = null, rtMirrorB = null, W = 4, H = 4, dpr = 1;
  const stackRT = (w, h) => new THREE.WebGLRenderTarget(w, h, {...rtOpts, samples: 4});
  function layout() {
    const w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = mirrorCam.aspect = w / h;
    camera.updateProjectionMatrix(); mirrorCam.updateProjectionMatrix();
    W = Math.round(w * dpr); H = Math.round(h * dpr);
    for (const t of [rtA, rtB, rtMirrorA, rtMirrorB]) t?.dispose();
    rtA = stackRT(W, H); rtB = stackRT(W, H);
    const mw = Math.round(W * .6), mh = Math.round(H * .6);
    rtMirrorA = stackRT(mw, mh); rtMirrorB = stackRT(mw, mh);
    rtRefl.setSize(mw, mh); rtHeight.setSize(mw, mh);
    for (const m of [glassMain, glassSsd]) { // blur radii are authored in CSS pixels
      const u = m.userData.u;
      u.uLodSharp.value = flag('sharpLod', 1.7) + Math.log2(dpr) * .9; u.uLodHaze.value = flag('hazeLod', 1.8) + Math.log2(dpr); u.uHazeR.value = flag('hazeR', 6) * dpr;
    }
    composer?.setPixelRatio(dpr); composer?.setSize(w, h);
    dirty = true;
  }

  const clearHeight = new THREE.Color(8, 0, 0), clearBlack = new THREE.Color(0, 0, 0);
  function renderChain(cam, order, withFloor, A, B) {
    // far-to-near: each layer draws over the previous result (its texture is the next scene.background). Strict ping-pong,
    // so a layer never samples the target it is drawing into. Returns the target that holds the finished image.
    let prev = null;
    order.forEach((P, k) => {
      for (const Q of plates) Q.group.visible = Q === P;
      floor.visible = k === 0 && withFloor && !!F.floor;
      scene.background = k === 0 ? glow : prev.texture;
      const target = k % 2 ? B : A;
      renderer.setRenderTarget(target);
      renderer.render(scene, cam);
      prev = target;
    });
    for (const Q of plates) Q.group.visible = true;
    floor.visible = !!F.floor;
    scene.background = null;
    return prev;
  }

  function mirrorCamera() {
    const c = camera.position, t = target;
    mirrorCam.position.set(c.x, 2 * floorY - c.y, c.z);
    mirrorCam.up.set(0, -1, 0);
    mirrorCam.lookAt(t.x, 2 * floorY - t.y, t.z);
    mirrorCam.updateMatrixWorld();
    reflMat.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1)
      .multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  }

  // The first pass of the composer: runs the whole layered render and hands the result to the post chain.
  const copyQuad = new THREE.FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: {tDiffuse: {value: null}}, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }'
  }));
  const blit = (rend, from, to) => { copyQuad.material.uniforms.tDiffuse.value = from.texture; rend.setRenderTarget(to); copyQuad.render(rend); };
  class LayerPass extends THREE.Pass {
    constructor() { super(); this.needsSwap = false; }
    render(rend, writeBuffer, readBuffer) {
      const near = plates.filter(P => P.s > .02).sort((a, b) => a.y - b.y); // bottom -> top; the camera is above everything
      if (F.floor && near.length) {
        mirrorCamera();
        // the mirrored camera looks up from below, so the nearest plate is the lowest: draw top -> bottom
        blit(rend, renderChain(mirrorCam, [...near].reverse(), false, rtMirrorA, rtMirrorB), rtRefl);
        // height of the reflected surface above the floor, for the fade
        syncProxies(false);
        proxyScene.overrideMaterial = heightMat;
        rend.setClearColor(clearHeight, 1);
        rend.setRenderTarget(rtHeight); rend.clear();
        rend.render(proxyScene, mirrorCam);
        rend.setClearColor(clearBlack, 1);
        proxyScene.overrideMaterial = null;
      }
      const done = near.length ? renderChain(camera, near, true, rtA, rtB) : null;
      if (done) blit(rend, done, readBuffer); else { rend.setRenderTarget(readBuffer); rend.clear(); }
    }
    setSize() {}
  }

  /* post: depth of field -> bloom -> tone map -> dither */
  const composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType}));
  composer.addPass(new LayerPass());
  const bokeh = new THREE.BokehPass(proxyScene, camera, {focus: CAM.R, aperture: flag('aperture', .0016), maxblur: flag('maxblur', .006)});
  bokeh.enabled = !!F.dof;
  composer.addPass(bokeh);
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), flag('bloomStrength', .2), flag('bloomRadius', .5), flag('bloomThreshold', .45));
  bloom.enabled = !!F.bloom;
  composer.addPass(bloom);
  composer.addPass(new THREE.OutputPass());
  const finish = new THREE.ShaderPass({
    uniforms: {tDiffuse: {value: null}, uSeed: {value: 0}},
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv); float n = hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 17.3) - 1.0; gl_FragColor = vec4(c.rgb + n / 255.0, 1.0); }`
  });
  composer.addPass(finish);

  /* state */
  const W3 = [1, 0, 0];
  let scene_ = 0, sceneT = -1e9, now = performance.now(), last = now, t = 0;
  const tw = plates.map(P => ({t0: 0, y0: P.y, y1: P.y, s0: P.s, s1: P.s, dur: 1000}));
  let az = CAM.az, el = CAM.el, tAz = CAM.az, tEl = CAM.el, px = 0, py = 0;
  let dirty = true, visible = true, raf = 0, disposed = false;
  const target = new THREE.Vector3(CAM.tx, CAM.ty[0], CAM.tz);
  const aux = {floor: FLOOR[0], ty: CAM.ty[0]}, auxTw = {t0: 0, f0: FLOOR[0], f1: FLOOR[0], y0: CAM.ty[0], y1: CAM.ty[0]};

  function setScene(i, instant) {
    scene_ = i;
    sceneT = (instant || reduced) ? -1e9 : performance.now();
    plates.forEach((P, k) => {
      const q = tw[k], extract = P.def.sc[i] > P.s;
      Object.assign(q, {y0: P.y, s0: P.s, y1: P.def.y[i], s1: P.def.sc[i], dur: 1000});
      q.t0 = sceneT + (k === 0 ? (extract ? 280 : 0) : (3 - k) * 70);
      if (instant || reduced) { P.y = q.y1; P.s = q.s1; }
    });
    Object.assign(auxTw, {t0: sceneT + 70, f0: aux.floor, f1: FLOOR[i], y0: aux.ty, y1: CAM.ty[i]});
    if (instant || reduced) { aux.floor = FLOOR[i]; aux.ty = CAM.ty[i]; }
    if (instant || reduced) for (let s = 0; s < 3; s++) W3[s] = s === i ? 1 : 0;
    dirty = true;
    if (reduced && rtA) frame(performance.now(), true);
  }

  /* pointer: the camera orbits a little and the glint follows; at rest everything drifts slowly */
  if (!reduced) {
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
      tAz = CAM.az + px * .22; tEl = CAM.el - py * .1;
    });
    stage.addEventListener('pointerleave', () => { tAz = CAM.az; tEl = CAM.el; px = py = 0; });
  }

  /* labels: attached to the right-most vertex of each plate's top face, in screen space */
  const labels = [...stage.querySelectorAll('.lbl')].map(el => ({el, p: +el.dataset.p, w: 0}));
  const v3 = new THREE.Vector3();
  function placeLabels() {
    const bw = stage.clientWidth, bh = stage.clientHeight;
    for (const L of labels) {
      const P = plates[L.p];
      if (!L.w) L.w = L.el.offsetWidth;
      let bx = -1e9, by = 0;
      for (let i = 0; i < P.outline.length; i += 2) {
        const o = P.outline[i];
        v3.set(o.x * P.s, P.y + PH / 2 * P.s, o.z * P.s).project(camera);
        const X = (v3.x * .5 + .5) * bw;
        if (X > bx) { bx = X; by = (1 - (v3.y * .5 + .5)) * bh; }
      }
      const lx = clamp(bx + 8, 0, Math.max(0, bw - L.w - 2));
      L.el.style.transform = `translate(${lx.toFixed(1)}px,${(by - 14).toFixed(1)}px)`;
    }
  }
  function relayout() { for (const L of labels) L.w = 0; dirty = true; frame(performance.now(), true); }

  /* the frame */
  const ctx = {w: W3, t: 0, m: 0, s: () => 0};
  const m4 = new THREE.Matrix4(), cam3 = new THREE.Vector3();
  let acc = 0, accN = 0, statT = performance.now();
  function frame(time, force) {
    if (disposed) return;
    const cpu0 = performance.now();
    now = time; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const animating = !reduced;
    t = reduced ? 3 : now / 1000;
    const settling = plates.some((P, k) => now < tw[k].t0 + tw[k].dur) || now < auxTw.t0 + 1000 || W3.some((w, s) => Math.abs(w - (s === scene_ ? 1 : 0)) > .002);
    const moving = Math.abs(tAz - az) > 1e-4 || Math.abs(tEl - el) > 1e-4;
    if (!animating && !dirty && !force && !settling && !moving) return;

    // scene weights, plate heights and scales
    for (let s = 0; s < 3; s++) { const tg = s === scene_ ? 1 : 0; W3[s] += (tg - W3[s]) * (reduced ? 1 : 1 - Math.exp(-dt * (tg ? 2.6 : 5))); }
    plates.forEach((P, k) => {
      const q = tw[k], e = reduced ? 1 : settle(clamp((now - q.t0) / q.dur, 0, 1));
      P.y = lerp(q.y0, q.y1, e); P.s = lerp(q.s0, q.s1, e);
    });
    az += (tAz - az) * (1 - Math.exp(-dt * 5)); el += (tEl - el) * (1 - Math.exp(-dt * 5));
    {
      const e = reduced ? 1 : settle(clamp((now - auxTw.t0) / 1000, 0, 1));
      aux.floor = lerp(auxTw.f0, auxTw.f1, e); aux.ty = lerp(auxTw.y0, auxTw.y1, e);
      floorY = aux.floor; floor.position.y = floorY; heightMat.uniforms.uFloorY.value = floorY;
      target.set(CAM.tx, aux.ty, CAM.tz);
    }
    camera.position.set(target.x + CAM.R * Math.cos(el) * Math.sin(az), target.y + CAM.R * Math.sin(el), target.z + CAM.R * Math.cos(el) * Math.cos(az));
    camera.lookAt(target);
    camera.updateMatrixWorld();

    // glint and studio drift
    const drift = reduced ? 0 : Math.sin(t * .25);
    scene.environmentRotation.set(0, drift * .35 + px * .5, 0);
    glint.position.set(-3 + px * 14 + (reduced ? 0 : Math.sin(t * .25) * 4), 8 - py * 6, 10);
    glint.intensity = flag('glint', 12);
    for (const m of [glassMain, glassSsd]) m.userData.u.uTime.value = t;
    floorMat.uniforms.uCenter.value.set(0, 0);

    // plate transforms + cell instances
    const sinceScene = now - sceneT;
    ctx.t = t; ctx.m = clamp((W3[2] - .35) / .65, 0, 1);
    ctx.s = (sc, delay) => {
      const w = W3[sc];
      if (sc !== scene_) return w > .01 ? w : 0;
      const k = clamp((sinceScene - delay) / 520, 0, 1);
      return Math.min(settle(k), w * 1.4);
    };
    const fl = reduced ? 0 : Math.sin(t * .7);
    plates.forEach((P, pi) => {
      const sc = P.s;
      P.group.visible = sc > .02;
      P.group.position.set(0, P.y + fl * .025 * (pi - 1.5), 0);
      P.group.scale.setScalar(Math.max(sc, 1e-4));
      P.group.updateMatrixWorld(true);
      for (const g of P.groups.values()) {
        for (const c of g.items) {
          const r = c.f(ctx), v = r.vis === undefined ? 1 : r.vis, k = Math.max(v, 1e-4);
          m4.set(k, 0, 0, r.x ?? c.x, 0, k, 0, -.04, 0, 0, k, r.z ?? c.z, 0, 0, 0, 1);
          g.mesh.setMatrixAt(c.i, m4);
          g.col[c.i * 4] = r.col[0]; g.col[c.i * 4 + 1] = r.col[1]; g.col[c.i * 4 + 2] = r.col[2]; g.col[c.i * 4 + 3] = r.glow * v;
        }
        g.mesh.instanceMatrix.needsUpdate = true;
        g.attr.needsUpdate = true;
      }
    });
    floor.updateMatrixWorld(true);
    const dist = camera.position.distanceTo(target);
    bokeh.uniforms.focus.value = dist - .4;
    finish.uniforms.uSeed.value = reduced ? 0 : (now % 1000) * .01;

    renderer.info.reset();
    syncProxies(!!F.floor); // depth of field reads the slabs and the floor
    composer.render(dt);
    placeLabels();
    dirty = false;

    if (opts.debug) {
      acc += performance.now() - cpu0; accN++;
      if (accN >= 30) {
        const i = renderer.info, span = (now - statT) / accN;
        opts.onStats?.(`${(1000 / span).toFixed(0)} fps · ${span.toFixed(1)} ms/frame (cpu ${(acc / accN).toFixed(1)})\n${i.render.calls} draws · ${(i.render.triangles / 1000).toFixed(0)}k tris\ncanvas ${W}×${H} @${dpr}x · scene ${scene_}`);
        acc = 0; accN = 0; statT = now;
      }
    }
  }
  function loop(time) {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = time; return; }
    frame(time);
  }

  const ro = new ResizeObserver(() => { layout(); frame(performance.now(), true); });
  ro.observe(stage);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); dirty = true; } });
  io.observe(stage);
  layout();
  setScene(0, true);
  frame(performance.now(), true);
  if (!reduced) raf = requestAnimationFrame(loop);

  return {
    ok: true, setScene, relayout, flags: F,
    renderer, scene, camera, plates, composer, bokeh, bloom, glassMain, glassSsd, floorMat,
    dispose() { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); }
  };
}

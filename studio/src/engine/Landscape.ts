import * as THREE from 'three';

/** Ruído de valor 2D determinístico + fBm (sem dependências). */
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, oct = 5): number {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * (noise(x * f, y * f) * 2 - 1);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface SiteBounds {
  /** altura do terreno do lugar em coordenadas do lugar (X à direita, Z à frente) */
  H: (X: number, Z: number) => number;
  x0: number; x1: number; z0: number; z1: number;
}

export interface MountainSpec { X: number; Z: number; height: number; radius: number }

export interface LandscapeOptions {
  size?: number;
  segments?: number;
  mountains?: MountainSpec[];
  /** nível médio do vale e da encosta do outro lado */
  low?: number;
  high?: number;
}

/**
 * Paisagem em volta do lugar: emenda com a borda do terreno medido e se afasta em morros,
 * com montanhas nomeadas. A malha é mais densa perto do centro (onde se anda) e rala longe.
 */
export function buildLandscape(site: SiteBounds, opt: LandscapeOptions = {}) {
  const size = opt.size ?? 2400, seg = opt.segments ?? 300;
  const low = opt.low ?? -6, high = opt.high ?? 6;
  const mountains = opt.mountains ?? [];
  const cx = (site.x0 + site.x1) / 2, cz = (site.z0 + site.z1) / 2;
  const inset = 0.8;

  const heightAt = (X: number, Z: number): number => {
    const qx = Math.min(site.x1 - inset, Math.max(site.x0 + inset, X));
    const qz = Math.min(site.z1 - inset, Math.max(site.z0 + inset, Z));
    const d = Math.hypot(X - qx, Z - qz);
    const edge = site.H(qx, qz);
    if (d <= 0) return edge - 0.35; // por baixo do terreno medido
    const amp = Math.min(28, 3 + d * 0.05);
    let far = low + (high - low) * sstep(-40, 160, X) + fbm(X / 140, Z / 140) * amp + fbm(X / 35, Z / 35, 3) * Math.min(3, d * 0.02);
    for (const m of mountains) {
      const r = Math.hypot(X - m.X, Z - m.Z) / m.radius;
      const ridge = 1 - Math.abs(fbm(X / 90 + 11, Z / 90 - 7, 4));
      far += m.height * Math.exp(-r * r * 1.6) * (0.75 + 0.35 * ridge);
    }
    // anel de serras no horizonte
    const R = Math.hypot(X - cx, Z - cz);
    far += 90 * sstep(500, 1100, R) * (0.6 + 0.4 * fbm(X / 300, Z / 300, 3));
    const t = sstep(0, 70, d);
    return edge * (1 - t) + far * t;
  };

  // grade não uniforme: s em [-1,1] -> sign(s)*|s|^p
  const p = 2.1;
  const warp = (s: number) => Math.sign(s) * Math.pow(Math.abs(s), p) * (size / 2);
  const n = seg + 1;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const grass = new THREE.Color('#9fae8f'), dry = new THREE.Color('#b9b69a'), rock = new THREE.Color('#9a9a92'), forest = new THREE.Color('#7c8d72');
  const c = new THREE.Color();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const X = cx + warp((i / seg) * 2 - 1), Z = cz + warp((j / seg) * 2 - 1);
      const y = heightAt(X, Z);
      const k = (j * n + i) * 3;
      pos[k] = X; pos[k + 1] = y; pos[k + 2] = -Z;
      const w = fbm(X / 60, Z / 60, 3) * 0.5 + 0.5;
      c.copy(grass).lerp(dry, w * 0.5).lerp(forest, sstep(0.55, 0.8, fbm(X / 120 + 3, Z / 120, 3) + 0.5));
      c.lerp(rock, sstep(60, 160, y));
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < seg; j++)
    for (let i = 0; i < seg; i++) {
      const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // a ordem dos índices acima deixa a face para baixo com Z invertido; corrige se preciso
  const nrm = geo.getAttribute('normal');
  if (nrm.getY(Math.floor(n * n / 2)) < 0) {
    for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.name = 'paisagem';

  // mata nativa espalhada nos morros (instâncias: barato de desenhar)
  const trees = new THREE.Group();
  const count = 4500;
  const coneG = new THREE.ConeGeometry(1, 1, 7);
  coneG.translate(0, 0.5, 0);
  const crownG = new THREE.IcosahedronGeometry(1, 0);
  const conif = new THREE.InstancedMesh(coneG, new THREE.MeshStandardMaterial({ color: '#6f7f68', roughness: 1, flatShading: true }), count);
  const broad = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: '#86977c', roughness: 1, flatShading: true }), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), tp = new THREE.Vector3();
  let nc = 0, nb = 0, seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < count * 4 && (nc < count || nb < count); t++) {
    const ang = rnd() * Math.PI * 2, rad = 75 + Math.pow(rnd(), 1.4) * 700;
    const X = cx + Math.cos(ang) * rad, Z = cz + Math.sin(ang) * rad;
    if (X > site.x0 - 6 && X < site.x1 + 6 && Z > site.z0 - 6 && Z < site.z1 + 6) continue;
    const dens = fbm(X / 110 + 5, Z / 110 - 2, 3);
    if (dens < 0.05) continue;
    const y = heightAt(X, Z);
    if (y > 170) continue;
    const h = 8 + rnd() * 14;
    if (rnd() < 0.35 && nc < count) {
      s.set(h * 0.28, h, h * 0.28);
      tp.set(X, y - 0.5, -Z);
      conif.setMatrixAt(nc++, m4.compose(tp, q.identity(), s));
    } else if (nb < count) {
      const r = h * 0.35;
      s.set(r, r * 0.8, r);
      tp.set(X, y + h * 0.55, -Z);
      broad.setMatrixAt(nb++, m4.compose(tp, q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), s));
    }
  }
  conif.count = nc;
  broad.count = nb;
  conif.castShadow = broad.castShadow = false;
  trees.add(conif, broad);
  trees.name = 'mata';
  return { mesh, trees, heightAt };
}

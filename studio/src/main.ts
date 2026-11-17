import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import './ui/hud.css';
import { Physics, CharacterBody } from './engine/Physics';
import { Input } from './engine/Input';
import { Look } from './engine/controls/Look';
import { FirstPerson } from './engine/controls/FirstPerson';
import { Spectator } from './engine/controls/Spectator';
import { buildLandscape } from './engine/Landscape';
import { Hud, type Mode } from './ui/hud';
import { loadChacara } from './sites/chacara';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
app.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 8000);
const input = new Input(renderer.domElement);
const hud = new Hud(input);

// céu físico + luz do sol na mesma direção
const sky = new Sky();
sky.scale.setScalar(6000);
const su = sky.material.uniforms;
su.turbidity.value = 4;
su.rayleigh.value = 1.4;
su.mieCoefficient.value = 0.004;
su.mieDirectionalG.value = 0.8;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(-125));
su.sunPosition.value.copy(sunDir);
scene.add(sky);
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(sky.clone());
scene.environment = pmrem.fromScene(envScene, 0, 1, 9000).texture;
scene.environmentIntensity = 0.55;
scene.fog = new THREE.Fog('#c9d6de', 350, 2600);

const sun = new THREE.DirectionalLight('#fff4e6', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 400 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target, new THREE.HemisphereLight('#dfe9f3', '#7d7a66', 0.6));

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.enabled = false;

const look = new Look();
let mode: Mode = 'andar';
let fp: FirstPerson, spec: Spectator, body: CharacterBody, phys: Physics;
let site: ReturnType<typeof loadChacara>;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function setMode(m: Mode) {
  const prev = mode;
  mode = m;
  hud.setMode(m);
  orbit.enabled = m === 'geral';
  if (m === 'geral') {
    input.exitLock();
    const t = new THREE.Vector3(-6, -2, -10);
    orbit.target.copy(t);
    camera.position.set(-70, 55, 45);
    camera.lookAt(t);
  } else {
    if (prev === 'geral') {
      // volta a olhar na direção da câmera de órbita
      const d = camera.getWorldDirection(new THREE.Vector3());
      look.yaw = Math.atan2(-d.x, -d.z);
      look.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    }
    if (m === 'andar' && prev !== 'andar') {
      // pousa no chão abaixo de onde estava a câmera
      const x = camera.position.x, z = camera.position.z;
      const g = phys.groundY(x, z, body.collider);
      if (g !== null && prev === 'voar') body.teleport(new THREE.Vector3(x, g + 0.05, z));
      else if (prev === 'geral') spawn();
    }
    if (m === 'voar') spec.stop();
  }
}

function spawn() {
  body.teleport(site.spawn.feet);
  look.lookAt(site.spawn.feet.clone().setY(site.spawn.feet.y + 1.65), site.spawn.lookAt);
  look.apply(0, 0, camera);
  if (mode !== 'andar') setMode('andar');
}

async function init() {
  site = loadChacara();
  scene.add(site.root);
  site.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = m.castShadow || false; }
  });
  sun.position.copy(sunDir).multiplyScalar(160).add(new THREE.Vector3(-8, 0, -10));
  sun.target.position.set(-8, 0, -10);

  const land = buildLandscape({ H: site.H, ...site.bounds }, { mountains: site.mountains, low: site.low, high: site.high });
  scene.add(land.mesh, land.trees);

  phys = await Physics.create();
  site.root.updateMatrixWorld(true);
  land.mesh.updateMatrixWorld(true);

  // colisão: tudo que é sólido; água, banhado e folhagem não
  const solid: THREE.Mesh[] = [];
  const isVisible = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
  let terrain: THREE.Mesh | null = null;
  site.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !isVisible(m)) return;
    if (m.name === 'terreno') { terrain = m; return; }
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.some((x) => site.nonColliding.has(x))) return;
    solid.push(m);
  });
  const tris = phys.addStaticMeshes(solid);
  if (terrain) phys.addStaticMeshes([withHoles(terrain, site.holes)]);
  phys.addStaticMeshes([land.mesh]);

  // nomes dos elementos sob a mira
  const named: THREE.Object3D[] = Object.values(site.elements).filter((g) => g.visible);
  for (const g of named) g.traverse((o) => (o.userData.elNome = (g.userData as { nome?: string }).nome));

  body = new CharacterBody(phys, site.spawn.feet);
  fp = new FirstPerson(body, look);
  spec = new Spectator(look);
  phys.step();
  hud.onMode = (m) => setMode(m);
  hud.onSpawn = () => spawn();
  renderer.domElement.addEventListener('click', () => { if (mode !== 'geral') input.requestLock(); });
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyV') setMode(mode === 'voar' ? 'andar' : 'voar');
    if (e.code === 'KeyG') setMode(mode === 'geral' ? 'andar' : 'geral');
  });
  setMode('andar');
  spawn();
  hud.ready();
  (window as unknown as Record<string, unknown>).__studio = { input, fp, spec, camera, body, setMode, phys, site, stats: { solidMeshes: solid.length, tris } };
  requestAnimationFrame(frame);

  // raio da mira (algumas vezes por segundo)
  const ray = new THREE.Raycaster();
  ray.far = 80;
  setInterval(() => {
    if (mode === 'geral') { hud.target.textContent = ''; return; }
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hit = ray.intersectObjects(named, true)[0];
    hud.target.textContent = hit ? `${hit.object.userData.elNome ?? ''} · ${hit.distance.toFixed(1).replace('.', ',')} m` : '';
  }, 200);
}

/** Cópia do terreno sem os triângulos dentro dos buracos (ex.: fosso da fogueira). */
function withHoles(mesh: THREE.Mesh, holes: { x: number; z: number; r: number }[]): THREE.Mesh {
  if (!holes.length) return mesh;
  const g = (mesh.geometry as THREE.BufferGeometry).clone().applyMatrix4(mesh.matrixWorld);
  const pos = g.getAttribute('position'), index = g.getIndex()!;
  const keep: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    if (holes.some((h) => Math.hypot(cx - h.x, cz - h.z) < h.r)) continue;
    keep.push(a, b, c);
  }
  g.setIndex(keep);
  const out = new THREE.Mesh(g);
  out.updateMatrixWorld(true);
  return out;
}

const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0;
const tmp = new THREE.Vector3();
const STEP = 1 / 60;
let acc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.25);
  // física em passo fixo (60 Hz): o andar fica igual em qualquer taxa de quadros
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 8) {
    if (mode === 'andar') fp.update(STEP, input, camera);
    else if (mode === 'voar') spec.update(STEP, input, camera);
    phys.step();
    acc -= STEP;
    n++;
  }
  if (n === 8) acc = 0;
  if (mode === 'andar') fp.sync(dt, camera);
  else if (mode === 'geral') { input.takeLook(); orbit.update(); }
  // sombra acompanha quem está olhando (dentro do lugar)
  const focus = mode === 'geral' ? orbit.target : camera.position;
  tmp.set(THREE.MathUtils.clamp(focus.x, -60, 45), 0, THREE.MathUtils.clamp(focus.z, -70, 48));
  sun.target.position.copy(tmp);
  sun.position.copy(sunDir).multiplyScalar(160).add(tmp);
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) {
    const f = body.feet(tmp);
    hud.status.textContent = `${Math.round(fpsN / fpsAcc)} qps · x ${f.x.toFixed(1)} z ${(-f.z).toFixed(1)} · alt ${f.y.toFixed(1)} m`;
    fpsAcc = 0; fpsN = 0;
  }
  requestAnimationFrame(frame);
}

init().catch((e) => {
  console.error(e);
  hud.fail('Não foi possível montar a cena: ' + (e?.message ?? e));
});

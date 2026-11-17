import * as THREE from 'three';
import params from './params.json';
import { createChacara } from './legacy.js';
import type { MountainSpec } from '../../engine/Landscape';

export interface Site {
  name: string;
  root: THREE.Object3D;
  /** altura do terreno em coordenadas do lugar (X direita, Z à frente da janela das fotos) */
  H: (X: number, Z: number) => number;
  bounds: { x0: number; x1: number; z0: number; z1: number };
  /** elementos com nome (para mostrar na mira e, depois, editar) */
  elements: Record<string, THREE.Object3D>;
  /** materiais que não colidem (água, folhagem…) */
  nonColliding: Set<THREE.Material>;
  /** buraco no colisor do terreno (fogueira) */
  holes: { x: number; z: number; r: number }[];
  spawn: { feet: THREE.Vector3; lookAt: THREE.Vector3 };
  mountains: MountainSpec[];
  low: number;
  high: number;
}

/** Chácara: maquete estrutural v9 com os ajustes do Giovanni. Coordenadas do mundo: x = X, z = -Z. */
export function loadChacara(): Site {
  const c = createChacara(THREE, params);
  const P = c.P;
  const f = c.ELS.fogueira as THREE.Object3D;
  c.world.updateMatrixWorld(true);
  const fp = f.getWorldPosition(new THREE.Vector3());
  const holes = f.visible ? [{ x: fp.x, z: fp.z, r: (P.fogueira.diametro / 2 - 0.1) * P.escala * Math.min(f.scale.x, f.scale.z) }] : [];
  const sX = 0.6, sZ = 1.6;
  return {
    name: 'Chácara',
    root: c.world,
    H: c.H,
    bounds: { x0: -62, x1: 45, z0: -48, z1: 70 },
    elements: c.ELS,
    nonColliding: new Set([c.M.water, c.M.marsh, c.M.tree]),
    holes,
    spawn: { feet: new THREE.Vector3(sX, c.H(sX, sZ), -sZ), lookAt: new THREE.Vector3(P.fogueira.cx, 0.5, -P.fogueira.cz) },
    // a montanha da vista fica do outro lado do rio (lado esquerdo da janela); posição a confirmar
    mountains: [
      { X: -420, Z: 60, height: 240, radius: 230 },
      { X: -300, Z: -320, height: 120, radius: 160 },
    ],
    low: -P.terreno.quedaEsquerda - 1.5,
    high: P.barranco.altura + 2,
  };
}

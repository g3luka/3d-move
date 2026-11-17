import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export type Rapier = typeof RAPIER;

/** Mundo físico (Rapier, WebAssembly). Só colisão estática + personagem cinemático. */
export class Physics {
  readonly world: RAPIER.World;
  private constructor(readonly R: Rapier) {
    this.world = new R.World({ x: 0, y: -9.81, z: 0 });
  }

  static async create(): Promise<Physics> {
    await RAPIER.init();
    return new Physics(RAPIER);
  }

  /**
   * Junta as malhas num único colisor de triângulos (bem mais leve que um colisor por peça).
   * As malhas já devem estar com matrixWorld atualizada.
   */
  addStaticMeshes(meshes: THREE.Mesh[]): number {
    const verts: number[] = [];
    const idx: number[] = [];
    const p = new THREE.Vector3();
    for (const m of meshes) {
      const g = m.geometry as THREE.BufferGeometry;
      const pos = g.getAttribute('position');
      if (!pos) continue;
      const base = verts.length / 3;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        verts.push(p.x, p.y, p.z);
      }
      const index = g.getIndex();
      if (index) for (let i = 0; i < index.count; i++) idx.push(base + index.getX(i));
      else for (let i = 0; i < pos.count; i++) idx.push(base + i);
    }
    if (!idx.length) return 0;
    const desc = this.R.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx));
    this.world.createCollider(desc);
    return idx.length / 3;
  }

  /** Altura do chão (primeiro colisor) abaixo de um ponto, lançando um raio de cima para baixo. */
  groundY(x: number, z: number, exclude?: RAPIER.Collider): number | null {
    const top = 600;
    const ray = new this.R.Ray({ x, y: top, z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, 2000, true, undefined, undefined, exclude);
    return hit ? top - hit.timeOfImpact : null;
  }

  step(): void {
    this.world.step();
  }
}

/** Personagem em primeira pessoa: cápsula cinemática com degrau automático e rampa máxima. */
export class CharacterBody {
  readonly radius = 0.3;
  readonly halfHeight = 0.6; // cápsula total = 2*(0.6+0.3) = 1,8 m
  readonly eye = 1.65; // altura dos olhos acima dos pés
  private body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private cc: RAPIER.KinematicCharacterController;
  grounded = false;
  vy = 0;

  constructor(phys: Physics, feet: THREE.Vector3) {
    const R = phys.R;
    this.body = phys.world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(feet.x, feet.y + this.radius + this.halfHeight, feet.z),
    );
    this.collider = phys.world.createCollider(R.ColliderDesc.capsule(this.halfHeight, this.radius), this.body);
    this.cc = phys.world.createCharacterController(0.03);
    this.cc.setUp({ x: 0, y: 1, z: 0 });
    this.cc.enableAutostep(0.45, 0.2, true);
    this.cc.enableSnapToGround(0.5);
    this.cc.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
    this.cc.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    this.cc.setApplyImpulsesToDynamicBodies(false);
  }

  /** Move a cápsula; desired é o deslocamento horizontal desejado neste quadro. */
  move(desired: THREE.Vector3, dt: number, jump: boolean): void {
    if (this.grounded) {
      this.vy = Math.max(this.vy, -1);
      if (jump) this.vy = 5.2;
    }
    this.vy -= 18 * dt;
    this.vy = Math.max(this.vy, -40);
    const d = { x: desired.x, y: this.vy * dt, z: desired.z };
    this.cc.computeColliderMovement(this.collider, d);
    const m = this.cc.computedMovement();
    this.grounded = this.cc.computedGrounded();
    if (this.grounded && this.vy < 0) this.vy = 0;
    const t = this.body.translation();
    this.body.setNextKinematicTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });
  }

  teleport(feet: THREE.Vector3): void {
    this.vy = 0;
    this.body.setTranslation({ x: feet.x, y: feet.y + this.radius + this.halfHeight, z: feet.z }, true);
  }

  /** Posição dos olhos (depois do passo da física). */
  eyePosition(out: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    return out.set(t.x, t.y - this.halfHeight - this.radius + this.eye, t.z);
  }

  feet(out: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    return out.set(t.x, t.y - this.halfHeight - this.radius, t.z);
  }
}

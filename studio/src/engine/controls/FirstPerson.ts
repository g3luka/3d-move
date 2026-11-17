import * as THREE from 'three';
import type { Input } from '../Input';
import type { CharacterBody } from '../Physics';
import type { Look } from './Look';

/** Andar como em jogo de tiro em primeira pessoa: WASD, Shift corre, Espaço pula, com colisão. */
export class FirstPerson {
  walkSpeed = 1.6;
  runSpeed = 4.5;
  private vel = new THREE.Vector3();
  private f = new THREE.Vector3();
  private r = new THREE.Vector3();
  private bob = 0;

  constructor(private body: CharacterBody, private look: Look) {}

  update(dt: number, input: Input, camera: THREE.PerspectiveCamera): void {
    const [dx, dy] = input.takeLook();
    this.look.apply(dx, dy, camera);
    const a = input.axes();
    const run = input.down('ShiftLeft', 'ShiftRight') || Math.hypot(a.x, a.y) > 0.92 && input.stick.y !== 0;
    const speed = run ? this.runSpeed : this.walkSpeed;
    this.look.forward(this.f).multiplyScalar(a.y);
    this.look.right(this.r).multiplyScalar(a.x);
    const target = this.f.add(this.r).multiplyScalar(speed);
    // aceleração suave (no ar, menos controle)
    const k = 1 - Math.exp(-(this.body.grounded ? 12 : 2) * dt);
    this.vel.x += (target.x - this.vel.x) * k;
    this.vel.z += (target.z - this.vel.z) * k;
    this.body.move(this.vel.clone().multiplyScalar(dt), dt, input.down('Space') || input.touchJump);
    input.touchJump = false;
  }

  /** Depois do passo da física: posiciona a câmera nos olhos, com um leve balanço ao andar. */
  sync(dt: number, camera: THREE.PerspectiveCamera): void {
    this.body.eyePosition(camera.position);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (this.body.grounded && sp > 0.3) this.bob += dt * sp * 2.4;
    camera.position.y += Math.sin(this.bob) * 0.025 * Math.min(1, sp / 2);
  }
}

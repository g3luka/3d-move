import * as THREE from 'three';
import type { Input } from '../Input';
import type { Look } from './Look';

/** Modo espectador: voa livre, sem colisão. E/Espaço sobe, Q/C desce, Shift acelera. */
export class Spectator {
  speed = 8;
  private vel = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor(private look: Look) {}

  update(dt: number, input: Input, camera: THREE.PerspectiveCamera): void {
    const [dx, dy] = input.takeLook();
    this.look.apply(dx, dy, camera);
    const a = input.axes();
    this.dir.set(0, 0, 0);
    camera.getWorldDirection(this.tmp);
    this.dir.addScaledVector(this.tmp, a.y);
    this.look.right(this.tmp);
    this.dir.addScaledVector(this.tmp, a.x);
    let up = 0;
    if (input.down('KeyE', 'Space') || input.touchUp) up += 1;
    if (input.down('KeyQ', 'KeyC', 'ControlLeft') || input.touchDown) up -= 1;
    this.dir.y += up;
    const fast = input.down('ShiftLeft', 'ShiftRight') ? 4 : 1;
    const target = this.dir.multiplyScalar(this.speed * fast);
    const k = 1 - Math.exp(-6 * dt);
    this.vel.lerp(target, k);
    camera.position.addScaledVector(this.vel, dt);
  }

  stop(): void {
    this.vel.set(0, 0, 0);
  }
}

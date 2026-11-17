import * as THREE from 'three';

/** Olhar em primeira pessoa (guinada + arfagem), sem rolagem. */
export class Look {
  yaw = 0;
  pitch = 0;
  sensitivity = 0.0022;
  private e = new THREE.Euler(0, 0, 0, 'YXZ');

  apply(dx: number, dy: number, camera: THREE.Camera): void {
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(-1.52, Math.min(1.52, this.pitch));
    this.e.set(this.pitch, this.yaw, 0);
    camera.quaternion.setFromEuler(this.e);
  }

  /** Aponta para um alvo a partir de uma posição. */
  lookAt(from: THREE.Vector3, to: THREE.Vector3): void {
    const d = to.clone().sub(from);
    this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  right(out: THREE.Vector3): THREE.Vector3 {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }
}

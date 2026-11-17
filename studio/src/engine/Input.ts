/** Teclado, mouse (pointer lock com alternativa de arrastar) e toque (joystick virtual + arrastar para olhar). */
export class Input {
  readonly keys = new Set<string>();
  lookDX = 0;
  lookDY = 0;
  /** Eixos do joystick de toque: x = lado, y = frente (-1..1). */
  stick = { x: 0, y: 0 };
  touchUp = false;
  touchDown = false;
  touchJump = false;
  locked = false;
  pointerLockFailed = false;
  onLockChange?: (locked: boolean) => void;

  private dragId: number | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(private el: HTMLElement) {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('pointerlockerror', () => {
      this.pointerLockFailed = true;
      this.onLockChange?.(false);
    });
    addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.lookDX += e.movementX;
        this.lookDY += e.movementY;
      }
    });

    // Arrastar para olhar (mouse sem pointer lock e toque fora do joystick)
    el.addEventListener('pointerdown', (e) => {
      if (this.locked || this.dragId !== null) return;
      this.dragId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.dragId) return;
      const k = e.pointerType === 'touch' ? 1.6 : 1;
      this.lookDX += (e.clientX - this.lastX) * k;
      this.lookDY += (e.clientY - this.lastY) * k;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.dragId) this.dragId = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  requestLock(): void {
    if (this.pointerLockFailed || matchMedia('(pointer: coarse)').matches) return;
    try {
      const r = this.el.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {
        this.pointerLockFailed = true;
        this.onLockChange?.(false);
      });
    } catch {
      this.pointerLockFailed = true;
    }
  }

  exitLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** Lê e zera o movimento do olhar acumulado. */
  takeLook(): [number, number] {
    const r: [number, number] = [this.lookDX, this.lookDY];
    this.lookDX = this.lookDY = 0;
    return r;
  }

  down(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  /** Eixos de movimento combinando teclado e joystick. */
  axes(): { x: number; y: number } {
    let x = this.stick.x;
    let y = this.stick.y;
    if (this.down('KeyW', 'ArrowUp')) y += 1;
    if (this.down('KeyS', 'ArrowDown')) y -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }
}

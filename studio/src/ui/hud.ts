import type { Input } from '../engine/Input';

export type Mode = 'andar' | 'voar' | 'geral';

const HELP: Record<Mode, string> = {
  andar:
    '<b>Andar</b> · <span class="desk">clique na cena para olhar com o mouse (<kbd>Esc</kbd> solta) · <kbd>W A S D</kbd> anda · <kbd>Shift</kbd> corre · <kbd>Espaço</kbd> pula · <kbd>V</kbd> voar</span><span class="touch">joystick anda, arraste a tela para olhar</span>',
  voar:
    '<b>Voar</b> · <span class="desk">clique para olhar · <kbd>W A S D</kbd> voa · <kbd>E</kbd>/<kbd>Espaço</kbd> sobe · <kbd>Q</kbd> desce · <kbd>Shift</kbd> rápido · <kbd>V</kbd> andar</span><span class="touch">joystick voa, botões sobem e descem</span>',
  geral: '<b>Visão geral</b> · arraste para girar, role ou pince para aproximar, botão direito ou dois dedos para deslocar',
};

/** Interface por cima da cena: modos, ajuda, mira, nome do que está na mira, controles de toque. */
export class Hud {
  private buttons = new Map<Mode, HTMLButtonElement>();
  private help: HTMLDivElement;
  private cross: HTMLDivElement;
  readonly target: HTMLDivElement;
  readonly status: HTMLDivElement;
  private loading: HTMLDivElement;
  private upBtn: HTMLButtonElement;
  private downBtn: HTMLButtonElement;
  private jumpBtn: HTMLButtonElement;
  onMode?: (m: Mode) => void;
  onSpawn?: () => void;

  constructor(input: Input) {
    const bar = el('div', 'hud-bar');
    for (const [m, label] of [['andar', 'Andar'], ['voar', 'Voar'], ['geral', 'Visão geral']] as [Mode, string][]) {
      const b = el('button') as HTMLButtonElement;
      b.textContent = label;
      b.onclick = () => this.onMode?.(m);
      bar.append(b);
      this.buttons.set(m, b);
    }
    const sp = el('button') as HTMLButtonElement;
    sp.textContent = 'Voltar à janela';
    sp.onclick = () => this.onSpawn?.();
    bar.append(sp);
    this.help = el('div', 'hud-help') as HTMLDivElement;
    this.cross = el('div', 'hud-cross') as HTMLDivElement;
    this.target = el('div', 'hud-target') as HTMLDivElement;
    this.status = el('div', 'hud-status') as HTMLDivElement;
    this.loading = el('div', 'hud-loading') as HTMLDivElement;
    this.loading.textContent = 'Montando a chácara…';

    // controles de toque
    const stick = el('div', 'stick touch');
    const knob = el('i');
    stick.append(knob);
    let sid: number | null = null, ox = 0, oy = 0;
    stick.addEventListener('pointerdown', (e) => {
      sid = e.pointerId;
      const r = stick.getBoundingClientRect();
      ox = r.left + r.width / 2;
      oy = r.top + r.height / 2;
      stick.setPointerCapture(e.pointerId);
      move(e);
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== sid) return;
      let dx = (e.clientX - ox) / 50, dy = (e.clientY - oy) / 50;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      input.stick.x = dx;
      input.stick.y = -dy;
      knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
    };
    stick.addEventListener('pointermove', move);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== sid) return;
      sid = null;
      input.stick.x = input.stick.y = 0;
      knob.style.transform = '';
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    const tb = el('div', 'tbtns touch');
    this.upBtn = hold('Subir', (v) => (input.touchUp = v));
    this.downBtn = hold('Descer', (v) => (input.touchDown = v));
    this.jumpBtn = hold('Pular', (v) => { if (v) input.touchJump = true; });
    tb.append(this.upBtn, this.downBtn, this.jumpBtn);

    document.body.append(bar, this.help, this.cross, this.target, this.status, stick, tb, this.loading);
  }

  setMode(m: Mode): void {
    for (const [k, b] of this.buttons) b.setAttribute('aria-pressed', String(k === m));
    this.help.innerHTML = HELP[m];
    this.cross.style.display = m === 'geral' ? 'none' : '';
    this.upBtn.hidden = this.downBtn.hidden = m !== 'voar';
    this.jumpBtn.hidden = m !== 'andar';
    document.querySelectorAll<HTMLElement>('.stick').forEach((s) => (s.style.display = m === 'geral' ? 'none' : ''));
  }

  ready(): void {
    this.loading.classList.add('done');
  }

  fail(msg: string): void {
    this.loading.textContent = msg;
  }
}

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function hold(label: string, set: (v: boolean) => void): HTMLButtonElement {
  const b = el('button') as HTMLButtonElement;
  b.textContent = label;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => set(false));
  return b;
}

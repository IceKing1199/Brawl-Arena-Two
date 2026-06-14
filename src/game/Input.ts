import { normalize, Vec2 } from './types';

export class Input {
  private keys = new Set<string>();
  private joyPointer: number | null = null;
  private joyVec: Vec2 = { x: 0, z: 0 };
  private pointerWorld: Vec2 | null = null;
  private canvasFire = false;
  private buttonFire = false;
  private stick = document.querySelector<HTMLDivElement>('#joy-stick')!;
  private base = document.querySelector<HTMLDivElement>('#joy-base')!;
  private fireBtn = document.querySelector<HTMLButtonElement>('#fire-btn')!;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('pointerdown', (e) => this.onCanvasPointer(e, true));
    canvas.addEventListener('pointermove', (e) => this.onCanvasPointer(e, this.canvasFire));
    window.addEventListener('pointerup', () => (this.canvasFire = false));
    this.setupJoystick();
    this.setupFireButton();
  }

  setPointerWorld(x: number, z: number) {
    this.pointerWorld = { x, z };
  }

  getMovement(): Vec2 {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const keyboard = normalize({ x, z });
    if (keyboard.x || keyboard.z) return keyboard;
    return this.joyVec;
  }

  getAim(playerX: number, playerZ: number, fallback: Vec2): Vec2 {
    if (this.pointerWorld) {
      const dir = normalize({ x: this.pointerWorld.x - playerX, z: this.pointerWorld.z - playerZ });
      if (dir.x || dir.z) return dir;
    }
    const move = this.getMovement();
    if (move.x || move.z) return move;
    return fallback;
  }

  wantsFire() {
    return this.canvasFire || this.buttonFire || this.keys.has('Space');
  }

  private onCanvasPointer(e: PointerEvent, fire: boolean) {
    if (e.pointerType === 'touch') return;
    this.canvasFire = fire;
  }

  private setupJoystick() {
    const reset = () => {
      this.joyPointer = null;
      this.joyVec = { x: 0, z: 0 };
      this.stick.style.left = '39px';
      this.stick.style.top = '39px';
    };

    const update = (e: PointerEvent) => {
      const rect = this.base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const max = rect.width / 2 - 25;
      const len = Math.min(max, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const sx = Math.cos(angle) * len;
      const sy = Math.sin(angle) * len;
      this.stick.style.left = `${39 + sx}px`;
      this.stick.style.top = `${39 + sy}px`;
      this.joyVec = normalize({ x: sx / max, z: sy / max });
    };

    this.base.addEventListener('pointerdown', (e) => {
      this.joyPointer = e.pointerId;
      this.base.setPointerCapture(e.pointerId);
      update(e);
    });
    this.base.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyPointer) update(e);
    });
    this.base.addEventListener('pointerup', reset);
    this.base.addEventListener('pointercancel', reset);
  }

  private setupFireButton() {
    this.fireBtn.addEventListener('pointerdown', (e) => {
      this.buttonFire = true;
      this.fireBtn.setPointerCapture(e.pointerId);
    });
    const up = () => (this.buttonFire = false);
    this.fireBtn.addEventListener('pointerup', up);
    this.fireBtn.addEventListener('pointercancel', up);
  }
}

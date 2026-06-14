import * as THREE from 'three';
import { PlayerState, Vec2 } from './types';

const hpCanvas = document.createElement('canvas');
hpCanvas.width = 128;
hpCanvas.height = 22;

export class Player {
  readonly group = new THREE.Group();
  private sprite: THREE.Sprite;
  private hpBar: THREE.Sprite;
  private hp = 100;
  private name = 'Player';
  private lastAim: Vec2 = { x: 1, z: 0 };

  constructor(
    readonly id: string,
    texture: THREE.Texture,
    scene: THREE.Scene,
    private local = false
  ) {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 28),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    this.group.add(shadow);

    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    this.sprite.scale.set(4.2, 6.5, 1);
    this.sprite.position.set(0, 3.35, 0);
    this.group.add(this.sprite);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.18, 8, 40),
      new THREE.MeshBasicMaterial({ color: local ? 0x31e4ff : 0xff3e9d })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    this.group.add(ring);

    this.hpBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.makeHpTexture(), transparent: true }));
    this.hpBar.scale.set(3.4, 0.58, 1);
    this.hpBar.position.set(0, 6.55, 0);
    this.group.add(this.hpBar);

    scene.add(this.group);
  }

  setPosition(x: number, z: number) {
    this.group.position.x = x;
    this.group.position.z = z;
  }

  getPosition(): Vec2 {
    return { x: this.group.position.x, z: this.group.position.z };
  }

  setAim(dir: Vec2) {
    if (dir.x || dir.z) this.lastAim = dir;
    this.sprite.scale.x = this.lastAim.x < -0.05 ? -4.2 : 4.2;
  }

  getAim() {
    return this.lastAim;
  }

  setHp(hp: number) {
    this.hp = Math.max(0, Math.min(100, hp));
    const mat = this.hpBar.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = this.makeHpTexture();
    mat.needsUpdate = true;
  }

  getHp() {
    return this.hp;
  }

  applyState(state: PlayerState) {
    this.name = state.name;
    this.setPosition(state.x, state.z);
    this.setAim({ x: state.aimX, z: state.aimZ });
    this.setHp(state.hp);
  }

  toState(): PlayerState {
    const p = this.getPosition();
    return {
      id: this.id,
      name: this.name,
      x: p.x,
      z: p.z,
      aimX: this.lastAim.x,
      aimZ: this.lastAim.z,
      hp: this.hp
    };
  }

  destroy(scene: THREE.Scene) {
    scene.remove(this.group);
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();
    });
  }

  private makeHpTexture() {
    const ctx = hpCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, hpCanvas.width, hpCanvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, 128, 22);
    ctx.fillStyle = this.local ? '#28ddff' : '#ff3f95';
    ctx.fillRect(4, 4, Math.max(0, 120 * (this.hp / 100)), 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 125, 19);
    const tex = new THREE.CanvasTexture(hpCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

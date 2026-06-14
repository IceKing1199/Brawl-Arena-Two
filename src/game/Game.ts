import * as THREE from 'three';
import { Input } from './Input';
import { Player } from './Player';
import { Projectile } from './Projectile';
import { MAP_H, MAP_W, World } from './World';
import { clamp, distance2D, FireState, PlayerState, Vec2 } from './types';
import { NetClient } from '../net/NetClient';
import { UI } from '../ui/ui';

type Fx = { mesh: THREE.Mesh; life: number };

export class Game {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 220);
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private world!: World;
  private input!: Input;
  private net = new NetClient();
  private players = new Map<string, Player>();
  private projectiles: Projectile[] = [];
  private fx: Fx[] = [];
  private local!: Player;
  private bot!: Player;
  private avatarTexture!: THREE.Texture;
  private active = false;
  private fireCooldown = 0;
  private sendTimer = 0;
  private teamScore = 0;
  private enemyScore = 0;

  constructor(private canvas: HTMLCanvasElement, private ui: UI) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#17072c');
  }

  async init() {
    this.avatarTexture = await new THREE.TextureLoader().loadAsync('/assets/character_clean.png');
    this.avatarTexture.colorSpace = THREE.SRGBColorSpace;
    this.input = new Input(this.canvas);
    this.addLights();
    this.world = new World(this.scene);
    this.createPlayers();
    this.bindPointerAim();
    this.bindNetwork();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.net.connect();
    this.loop();
  }

  private createPlayers() {
    this.local = new Player(this.net.id, this.avatarTexture, this.scene, true);
    this.local.setPosition(0, -27.5);
    this.players.set(this.net.id, this.local);

    this.bot = new Player('training_bot', this.avatarTexture, this.scene, false);
    this.bot.setPosition(0, 27.5);
    this.bot.setHp(100);
  }

  private bindUI() {
    this.ui.playBtn.addEventListener('click', () => {
      this.active = true;
      this.resetRound();
      this.ui.showGame();
    });
    this.ui.exitBtn.addEventListener('click', () => {
      this.active = false;
      this.ui.showMenu();
    });
  }

  private bindNetwork() {
    this.net.on('welcome', ({ players }) => {
      for (const state of players) if (state.id !== this.net.id) this.upsertRemote(state);
    });
    this.net.on('playerJoined', (state) => this.upsertRemote(state));
    this.net.on('playerLeft', (id) => {
      const player = this.players.get(id);
      if (!player || player === this.local) return;
      player.destroy(this.scene);
      this.players.delete(id);
    });
    this.net.on('state', (state) => {
      if (state.id !== this.net.id) this.upsertRemote(state);
    });
    this.net.on('fire', (state) => {
      if (state.id !== this.net.id) this.spawnProjectile(state.id, { x: state.x, z: state.z }, { x: state.dirX, z: state.dirZ });
    });
  }

  private upsertRemote(state: PlayerState) {
    let player = this.players.get(state.id);
    if (!player) {
      player = new Player(state.id, this.avatarTexture, this.scene, false);
      this.players.set(state.id, player);
    }
    player.applyState(state);
  }

  private bindPointerAim() {
    const update = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.raycaster.setFromCamera({ x, y }, this.camera);
      const target = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.ground, target)) {
        this.input.setPointerWorld(target.x, target.z);
      }
    };
    this.canvas.addEventListener('pointermove', update);
    this.canvas.addEventListener('pointerdown', update);
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.033);
    if (this.active) this.update(dt);
    this.updateFx(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.fireCooldown -= dt;
    this.moveLocal(dt);
    this.handleFire();
    this.updateProjectiles(dt);
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = 0.055;
      this.net.sendState(this.local.toState());
    }
  }

  private moveLocal(dt: number) {
    const pos = this.local.getPosition();
    const move = this.input.getMovement();
    const speed = 15;
    const nextX = clamp(pos.x + move.x * speed * dt, -MAP_W / 2 + 2, MAP_W / 2 - 2);
    const nextZ = clamp(pos.z + move.z * speed * dt, -MAP_H / 2 + 3, MAP_H / 2 - 3);

    let x = pos.x;
    let z = pos.z;
    if (!this.world.isBlocked(nextX, z, 1.05)) x = nextX;
    if (!this.world.isBlocked(x, nextZ, 1.05)) z = nextZ;
    this.local.setPosition(x, z);

    const aim = this.input.getAim(x, z, this.local.getAim());
    this.local.setAim(aim);
  }

  private handleFire() {
    if (!this.input.wantsFire() || this.fireCooldown > 0) return;
    this.fireCooldown = 0.42;
    const pos = this.local.getPosition();
    const dir = this.local.getAim();
    const start = { x: pos.x + dir.x * 1.7, z: pos.z + dir.z * 1.7 };
    this.spawnProjectile(this.net.id, start, dir);
    this.net.sendFire({ id: this.net.id, x: start.x, z: start.z, dirX: dir.x, dirZ: dir.z });
  }

  private spawnProjectile(ownerId: string, start: Vec2, dir: Vec2) {
    this.projectiles.push(new Projectile(ownerId, start, dir, this.scene));
  }

  private updateProjectiles(dt: number) {
    const alive: Projectile[] = [];
    for (const p of this.projectiles) {
      const stillAlive = p.update(dt);
      const hitWall = this.world.isBlocked(p.x, p.z, p.radius);
      const hitBot = p.ownerId !== 'training_bot' && distance2D({ x: p.x, z: p.z }, this.bot.getPosition()) < 1.65;
      if (!stillAlive || hitWall || hitBot) {
        if (hitBot) this.damageBot();
        this.makeImpact(p.x, p.z);
        p.destroy(this.scene);
      } else {
        alive.push(p);
      }
    }
    this.projectiles = alive;
  }

  private damageBot() {
    this.bot.setHp(this.bot.getHp() - 25);
    if (this.bot.getHp() <= 0) {
      this.teamScore += 1;
      this.ui.setScore(this.teamScore, this.enemyScore);
      this.ui.setStatus('Enemy knocked out!');
      this.ui.flashBanner();
      window.setTimeout(() => {
        this.bot.setHp(100);
        this.bot.setPosition(0, 27.5);
        this.ui.setStatus('Defeat opposing brawlers');
      }, 1100);
    }
  }

  private resetRound() {
    for (const p of this.projectiles) p.destroy(this.scene);
    this.projectiles = [];
    this.local.setPosition(0, -27.5);
    this.local.setHp(100);
    this.bot.setPosition(0, 27.5);
    this.bot.setHp(100);
    this.teamScore = 0;
    this.enemyScore = 0;
    this.ui.setScore(0, 0);
    this.ui.setStatus('Defeat opposing brawlers');
  }

  private makeImpact(x: number, z: number) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.08, 8, 30),
      new THREE.MeshBasicMaterial({ color: 0xffb3ee, transparent: true, opacity: 0.9 })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, 0.18, z);
    this.scene.add(mesh);
    this.fx.push({ mesh, life: 0.28 });
  }

  private updateFx(dt: number) {
    this.fx = this.fx.filter((fx) => {
      fx.life -= dt;
      fx.mesh.scale.addScalar(dt * 8);
      const mat = fx.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, fx.life / 0.28);
      if (fx.life <= 0) {
        this.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        mat.dispose();
        return false;
      }
      return true;
    });
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const viewH = 62;
    this.camera.left = (-viewH * aspect) / 2;
    this.camera.right = (viewH * aspect) / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.position.set(0, 58, 46);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private addLights() {
    const ambient = new THREE.HemisphereLight('#ffe6ff', '#12051e', 2.2);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight('#fff6dc', 2.5);
    sun.position.set(8, 18, -12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);
  }
}

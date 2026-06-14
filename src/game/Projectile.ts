import * as THREE from 'three';
import { Vec2 } from './types';

let projectileCounter = 0;

export class Projectile {
  readonly id = `p_${projectileCounter++}`;
  readonly mesh: THREE.Mesh;
  private ttl = 1.25;
  private speed = 34;
  readonly radius = 0.55;

  constructor(
    readonly ownerId: string,
    start: Vec2,
    private dir: Vec2,
    scene: THREE.Scene
  ) {
    const geo = new THREE.SphereGeometry(this.radius, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff4ec8,
      emissive: 0x8f0050,
      emissiveIntensity: 1.6,
      roughness: 0.35
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(start.x, 1.1, start.z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  update(dt: number) {
    this.ttl -= dt;
    this.mesh.position.x += this.dir.x * this.speed * dt;
    this.mesh.position.z += this.dir.z * this.speed * dt;
    const scale = 1 + Math.sin((1.25 - this.ttl) * 20) * 0.08;
    this.mesh.scale.setScalar(scale);
    return this.ttl > 0;
  }

  get x() { return this.mesh.position.x; }
  get z() { return this.mesh.position.z; }

  destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

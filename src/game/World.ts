import * as THREE from 'three';
import { Collider } from './types';
import { makeFloorTexture, makeTextTexture, toon } from './textures';

export const MAP_W = 44;
export const MAP_H = 74;

export class World {
  readonly group = new THREE.Group();
  readonly colliders: Collider[] = [];

  private readonly green = toon('#0fb7a2');
  private readonly gold = toon('#e5a62c');
  private readonly purple = toon('#56206e');
  private readonly darkPurple = toon('#261240');
  private readonly pink = toon('#cc3f95');
  private readonly bone = toon('#e8e8f0');
  private readonly rail = toon('#15cdb9');

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.group);
    this.build();
  }

  isBlocked(x: number, z: number, radius = 0.9) {
    for (const c of this.colliders) {
      const left = c.x - c.w / 2 - radius;
      const right = c.x + c.w / 2 + radius;
      const top = c.z - c.h / 2 - radius;
      const bottom = c.z + c.h / 2 + radius;
      if (x > left && x < right && z > top && z < bottom) return true;
    }
    return false;
  }

  private build() {
    this.addFloor();
    this.addOuterWalls();
    this.addDecor();
    this.addGameplayObjects();
    this.addShopSign();
  }

  private addFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W, MAP_H),
      new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private addOuterWalls() {
    this.addBox(0, -MAP_H / 2 - 1, MAP_W + 4, 2, 2.3, this.darkPurple, true);
    this.addBox(0, MAP_H / 2 + 1, MAP_W + 4, 2, 2.3, this.darkPurple, true);
    this.addBox(-MAP_W / 2 - 1, 0, 2, MAP_H + 4, 2.3, this.darkPurple, true);
    this.addBox(MAP_W / 2 + 1, 0, 2, MAP_H + 4, 2.3, this.darkPurple, true);

    for (const z of [-31, 31]) {
      this.addBox(0, z, 36, 1.1, 1, this.rail, false);
      this.addBox(-18, z, 1.1, 7, 1, this.gold, false);
      this.addBox(18, z, 1.1, 7, 1, this.gold, false);
    }
  }

  private addDecor() {
    for (const x of [-18, 18]) {
      for (const z of [-25, 25]) this.addLantern(x, z);
      this.addStatue(x, -16);
      this.addStatue(x, 16);
    }
    this.addDisplay(-17, -30, 6, 3);
    this.addDisplay(17, -30, 6, 3);
    this.addDisplay(-17, 30, 6, 3);
    this.addDisplay(17, 30, 6, 3);
    this.addCoffin(-12, -34);
    this.addCoffin(12, 34);
  }

  private addGameplayObjects() {
    this.addCoverCluster(-13, -10);
    this.addCoverCluster(13, -10);
    this.addCoverCluster(-13, 10);
    this.addCoverCluster(13, 10);
    this.addBush(0, -17, 7, 8);
    this.addBush(0, 17, 7, 8);
    this.addDisplay(-10, 0, 4, 9, true);
    this.addDisplay(10, 0, 4, 9, true);
    this.addDisplay(-8, -25, 8, 3, true);
    this.addDisplay(8, 25, 8, 3, true);
    this.addBreakBlocks(0, -7);
    this.addBreakBlocks(0, 7);
    this.addSpawnPad(0, -29, '#28a8ff');
    this.addSpawnPad(0, 29, '#ff3d96');
  }

  private addShopSign() {
    const signMat = new THREE.MeshBasicMaterial({ map: makeTextTexture('BRAWL ARENA'), transparent: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.8), signMat);
    sign.position.set(0, 6, 35.2);
    sign.rotation.x = -0.32;
    this.group.add(sign);
  }

  private addBox(x: number, z: number, w: number, h: number, y: number, mat: THREE.Material, solid: boolean) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, y, h), mat);
    mesh.position.set(x, y / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    if (solid) this.colliders.push({ x, z, w, h });
    return mesh;
  }

  private addCoverCluster(x: number, z: number) {
    const s = 2.25;
    const layout = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [0, 0],
      [-1, 1]
    ];
    for (const [cx, cz] of layout) this.addBox(x + cx * s, z + cz * s, 2, 2, 1.6, this.green, true);
  }

  private addBush(x: number, z: number, w: number, h: number) {
    const bush = this.addBox(x, z, w, h, 0.9, this.pink, false);
    bush.scale.y = 0.7;
    for (let i = 0; i < 18; i++) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), this.pink);
      tuft.position.set(x + (Math.random() - 0.5) * w, 0.85, z + (Math.random() - 0.5) * h);
      tuft.scale.set(1.2, 0.55, 1.2);
      this.group.add(tuft);
    }
  }

  private addDisplay(x: number, z: number, w: number, h: number, solid = false) {
    this.addBox(x, z, w, h, 1.1, this.purple, solid);
    this.addBox(x, z - h / 2 - 0.22, w + 0.5, 0.28, 1.45, this.gold, false);
    this.addBox(x, z + h / 2 + 0.22, w + 0.5, 0.28, 1.45, this.gold, false);
    for (let i = 0; i < 3; i++) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), toon(i % 2 ? '#ed28ff' : '#35ff9d'));
      gem.position.set(x - w / 3 + i * w / 3, 1.25, z);
      gem.castShadow = true;
      this.group.add(gem);
    }
  }

  private addBreakBlocks(x: number, z: number) {
    for (let i = -1; i <= 1; i++) {
      const b = this.addBox(x + i * 2.05, z, 1.8, 1.8, 1.45, this.bone, true);
      b.rotation.y = (i * Math.PI) / 18;
    }
  }

  private addSpawnPad(x: number, z: number, color: string) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.2, 32), toon(color));
    pad.position.set(x, 0.11, z);
    pad.receiveShadow = true;
    this.group.add(pad);
  }

  private addLantern(x: number, z: number) {
    this.addBox(x, z, 0.8, 0.8, 4, this.gold, false);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), toon('#ff4eaa'));
    flame.position.set(x, 4.8, z);
    this.group.add(flame);
    const light = new THREE.PointLight('#ff4eaa', 1.3, 11, 2);
    light.position.set(x, 5, z);
    this.group.add(light);
  }

  private addStatue(x: number, z: number) {
    this.addBox(x, z, 2.8, 2.8, 0.6, this.gold, false);
    const body = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 5), toon('#4b235f'));
    body.position.set(x, 2, z);
    body.castShadow = true;
    this.group.add(body);
  }

  private addCoffin(x: number, z: number) {
    const coffin = this.addBox(x, z, 5, 2.2, 0.55, toon('#6e3a1c'), false);
    coffin.rotation.y = 0.1;
  }
}

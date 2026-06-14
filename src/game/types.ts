export type Vec2 = { x: number; z: number };

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  z: number;
  aimX: number;
  aimZ: number;
  hp: number;
};

export type FireState = {
  id: string;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
};

export type Collider = {
  x: number;
  z: number;
  w: number;
  h: number;
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.z);
  if (len < 0.0001) return { x: 0, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

export function distance2D(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

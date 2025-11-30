import * as THREE from 'three';

// --- 工具函数 ---
export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

// --- 硬币几何配置 ---
export const COIN_CONFIG = {
  radius: 0.6,
  holeSize: 0.22,
  depth: 0.08,
  extrude: {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 5,
    curveSegments: 64
  }
};

// 预计算硬币形状
export const coinShape = (() => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, COIN_CONFIG.radius, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  const hs = COIN_CONFIG.holeSize;
  holePath.moveTo(-hs, -hs);
  holePath.lineTo(hs, -hs);
  holePath.lineTo(hs, hs);
  holePath.lineTo(-hs, hs);
  shape.holes.push(holePath);
  return shape;
})();

// 复用 Vector 对象以减少垃圾回收
export const VECTORS = {
  localY: new THREE.Vector3(0, 1, 0),
  worldUp: new THREE.Vector3(0, 1, 0),
  tempQuat: new THREE.Quaternion(),
  tempEuler: new THREE.Euler(),
};

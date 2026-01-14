'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

// --- 硬币尺寸常量 ---
const COIN_RADIUS = 0.6;
const COIN_THICKNESS = 0.08;

/**
 * 简约现代风格硬币
 * 扁平圆盘设计，哑光材质，黑白双面
 * 注意：物理 Y+ 朝上 = 阴，Y- 朝上 = 阳
 */
export const CoinMesh = React.memo(() => {
  // 哑光材质，无金属感
  const materials = useMemo(() => ({
    white: new THREE.MeshLambertMaterial({ color: "#ffffff" }),
    black: new THREE.MeshLambertMaterial({ color: "#111111" }),
    edge: new THREE.MeshLambertMaterial({ color: "#e0e0e0" }),
    darkMark: new THREE.MeshLambertMaterial({ color: "#333333" }),
    lightMark: new THREE.MeshLambertMaterial({ color: "#cccccc" }),
  }), []);

  // 组件卸载时清理材质，防止内存泄漏
  useEffect(() => {
    return () => {
      Object.values(materials).forEach(mat => mat.dispose());
    };
  }, [materials]);

  return (
    <group>
      {/* 硬币主体 - 扁平圆柱，Y轴朝上 */}
      <mesh castShadow receiveShadow material={materials.edge}>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 48]} />
      </mesh>

      {/* 阴面 - 黑色 + 圆环 (Y+ 顶面) */}
      <group position={[0, COIN_THICKNESS / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={materials.black}>
          <circleGeometry args={[COIN_RADIUS - 0.02, 48]} />
        </mesh>
        <mesh position={[0, 0, 0.002]} material={materials.lightMark}>
          <ringGeometry args={[0.08, 0.14, 32]} />
        </mesh>
      </group>

      {/* 阳面 - 白色 + 实心圆 (Y- 底面) */}
      <group position={[0, -(COIN_THICKNESS / 2 + 0.001), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={materials.white}>
          <circleGeometry args={[COIN_RADIUS - 0.02, 48]} />
        </mesh>
        <mesh position={[0, 0, 0.002]} material={materials.darkMark}>
          <circleGeometry args={[0.12, 32]} />
        </mesh>
      </group>
    </group>
  );
});

CoinMesh.displayName = 'CoinMesh';

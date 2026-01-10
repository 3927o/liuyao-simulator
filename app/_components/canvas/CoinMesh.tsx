'use client';

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { coinShape, COIN_CONFIG } from '../../_lib/coinConfig';

interface CoinMeshProps {
  status: string;
}

/**
 * 组件：单个硬币的视觉模型
 */
export const CoinMesh = React.memo(({ status }: CoinMeshProps) => {
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(coinShape, COIN_CONFIG.extrude), []);

  // 材质预定义 (使用 useMemo 避免每帧重建)
  const materials = useMemo(() => ({
    bodySide: new THREE.MeshPhysicalMaterial({
      color: "#c9a227", metalness: 0.9, roughness: 0.3, clearcoat: 0.5
    }),
    bodyFace: new THREE.MeshPhysicalMaterial({
      color: "#8b7355", metalness: 0.6, roughness: 0.5, clearcoat: 0.2
    }),
    yang: new THREE.MeshStandardMaterial({
      color: "#b8860b", metalness: 0.8, roughness: 0.3
    }),
    yin: new THREE.MeshStandardMaterial({
      color: "#4a4a4a", metalness: 0.7, roughness: 0.4
    })
  }), []);

  const getStatusStyle = () => {
    const base = "px-3 py-1 rounded-full text-xs font-medium pointer-events-none select-none whitespace-nowrap transition-all duration-300";
    const anim = status === '...' ? 'scale-50 opacity-0' : 'scale-100 opacity-100 translate-y-12';

    if (status === '阳') return `${base} ${anim} text-amber-700 bg-amber-50 border border-amber-200`;
    if (status === '阴') return `${base} ${anim} text-gray-600 bg-gray-100 border border-gray-200`;
    return `${base} opacity-0`;
  };

  const surfaceOffset = COIN_CONFIG.depth / 2 + 0.005;
  const markerSize = 0.06;
  const markerDist = 0.38;

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* 硬币实体 */}
      <mesh castShadow receiveShadow geometry={geometry}>
        <primitive object={materials.bodySide} attach="material-0" />
        <primitive object={materials.bodyFace} attach="material-1" />
      </mesh>

      {/* 阳面标记 (+Z / 物理 -Y) */}
      <group position={[0, 0, surfaceOffset]}>
        {[[markerDist, 0], [-markerDist, 0], [0, markerDist], [0, -markerDist]].map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1], 0]} material={materials.yang}>
            <boxGeometry args={[markerSize, markerSize, 0.01]} />
          </mesh>
        ))}
      </group>

      {/* 阴面标记 (-Z / 物理 +Y) */}
      <group position={[0, 0, -surfaceOffset]}>
        <mesh rotation={[0, Math.PI, 0]} material={materials.yin}>
          <torusGeometry args={[0.38, 0.025, 16, 64]} />
        </mesh>
      </group>

      {/* 状态 UI */}
      <Html position={[0, 0, 0]} center zIndexRange={[100, 0]} transform sprite>
        <div className={getStatusStyle()}>{status}</div>
      </Html>
    </group>
  );
});

CoinMesh.displayName = 'CoinMesh';

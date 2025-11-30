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
      color: "#d4af37", metalness: 1.0, roughness: 0.2, clearcoat: 1, emissive: "#ff6600", emissiveIntensity: 0.2
    }),
    bodyFace: new THREE.MeshPhysicalMaterial({
      color: "#2a1a10", metalness: 0.7, roughness: 0.8, clearcoat: 0
    }),
    yang: new THREE.MeshStandardMaterial({
      color: "#ff2200", emissive: "#ff2200", emissiveIntensity: 3, toneMapped: false
    }),
    yin: new THREE.MeshStandardMaterial({
      color: "#00ffff", emissive: "#00ffff", emissiveIntensity: 3, toneMapped: false
    })
  }), []);

  const getStatusStyle = () => {
    const base = "px-2 py-0.5 rounded backdrop-blur-sm border text-[10px] font-mono font-bold pointer-events-none select-none whitespace-nowrap transition-all duration-300";
    const anim = status === '...' ? 'scale-50 opacity-0' : 'scale-100 opacity-100 translate-y-12';
    
    if (status === '阳') return `${base} ${anim} text-red-400 border-red-500/50 bg-red-900/60 shadow-[0_0_10px_rgba(248,113,113,0.5)]`;
    if (status === '阴') return `${base} ${anim} text-cyan-300 border-cyan-500/50 bg-cyan-900/60 shadow-[0_0_10px_rgba(34,211,238,0.5)]`;
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

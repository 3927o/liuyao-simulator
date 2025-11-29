'use client'

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- 类型定义 (The Order of Types) ---

// 定义五行颜色映射
type ElementColor = string;
const COLORS: Record<string, ElementColor> = {
  METAL: '#E0E0E0',
  WATER: '#00BFFF',
  WOOD:  '#00FF7F',
  FIRE:  '#FF4500',
  EARTH: '#8B4513',
  DARK:  '#1a1a1a',
};

// 地支枚举
const BRANCHES = [
  '子', '丑', '寅', '卯', '辰', '巳', 
  '午', '未', '申', '酉', '戌', '亥'
] as const; // 使用 as const 锁定为只读元组

// FateRing 组件的 Props 接口
interface FateRingProps {
  radius: number;
  speed: number;
  label: string; // 暂时保留 label 字段，虽然目前只作为逻辑标识
  currentBranchIndex: number;
}

// 连线组件的 Props 接口
interface ConstraintBeamProps {
  start: [number, number, number]; // 使用元组强制 xyz 结构
  end: [number, number, number];
  type: 'CLASH' | 'HARMONY'; // 联合类型，限制输入值
}

// --- 组件实现 ---

/**
 * 单个命运环组件 (Ring of Fate)
 */
const FateRing: React.FC<FateRingProps> = ({ radius, speed, currentBranchIndex }) => {
  // 明确 Ref 指向 THREE.Group，初始值为 null
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_state, delta) => {
    if (groupRef.current) {
       // 模拟机械运转的阻尼感
       groupRef.current.rotation.z += delta * speed * 0.1;
    }
  });

  const nodes = useMemo(() => {
    return BRANCHES.map((branch, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      const isActive = i === currentBranchIndex;
      
      return (
        <group key={i} position={[x, y, 0]} rotation={[0, 0, angle + Math.PI/2]}>
          {/* 节点几何体：机械结构 */}
          <mesh>
            <boxGeometry args={[0.6, 0.3, 0.1]} />
            <meshStandardMaterial 
              color={isActive ? COLORS.FIRE : '#333'} 
              emissive={isActive ? new THREE.Color(COLORS.FIRE) : new THREE.Color('#000')}
              emissiveIntensity={isActive ? 2 : 0}
            />
          </mesh>
          
          {/* 文字 */}
          <Text
            position={[0, 0.5, 0]}
            rotation={[0, 0, -Math.PI/2]}
            fontSize={0.3}
            color={isActive ? '#FFF' : '#666'}
            anchorX="center"
            anchorY="middle"
          >
            {branch}
          </Text>
        </group>
      );
    });
  }, [radius, currentBranchIndex]);

  return (
    <group ref={groupRef}>
      {/* 轨道圈 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.05, 16, 100]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
      </mesh>
      {nodes}
    </group>
  );
};

/**
 * 关系连线 (The Logic Bond)
 */
const ConstraintBeam: React.FC<ConstraintBeamProps> = ({ start, end, type }) => {
  const color = type === 'CLASH' ? '#FF0000' : '#00FF00';
  
  return (
    <Line 
      points={[start, end]}       
      color={color}                   
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
};

/**
 * 核心场景内容
 */
const SceneContent: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#00ffff" />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#ff00ff" />
      
      {/* 核心装饰 */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#000" wireframe emissive="#00ffff" emissiveIntensity={0.2} />
      </mesh>

      {/* 四柱同心环 */}
      <FateRing radius={8} speed={0.1} label="YEAR" currentBranchIndex={0} /> 
      <FateRing radius={6} speed={0.2} label="MONTH" currentBranchIndex={6} /> 
      <FateRing radius={4} speed={0.4} label="DAY" currentBranchIndex={3} />
      <FateRing radius={2} speed={0.8} label="HOUR" currentBranchIndex={9} />

      {/* 示例连线 */}
      <ConstraintBeam start={[0, 0, 0]} end={[0, 8, 0]} type="CLASH" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <OrbitControls makeDefault />
    </>
  );
};

/**
 * 主入口组件
 */
const CyberDivinationDemo: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#050505' }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <SceneContent />
      </Canvas>
    </div>
  );
};

export default CyberDivinationDemo;
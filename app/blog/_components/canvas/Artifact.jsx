import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';

export default function Artifact({ data, onSelect }) {
  const meshRef = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    // 随机浮动
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = data.position[1] + Math.sin(t * 0.5 + data.id) * 0.5;
    meshRef.current.rotation.y += 0.005;
    
    // Hover 时的剧烈反应
    const targetScale = hovered ? 1.5 : 1;
    meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.1);
  });

  // 根据类型渲染不同的“高能”材质
  const renderVisuals = () => {
    switch (data.wasteland_type) {
      case 'Sector_C_Lost_Tech': // 技术：黑色方尖碑，带发光边框
        return (
          <>
            <boxGeometry args={[1.5, 6, 1.5]} />
            {/* 黑色镜面 */}
            <meshPhysicalMaterial 
                color="#000" metalness={0.9} roughness={0.1} clearcoat={1} 
            /> 
            {/* 内部发光线框 */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1.5, 6, 1.5)]} />
                <lineBasicMaterial color="#00ffff" />
            </lineSegments>
          </>
        );
      
      case 'Sector_B_Biohazard': // 毒性：红色，不稳定的扭曲球体
        return (
          <>
            <icosahedronGeometry args={[1.2, 0]} />
            <MeshDistortMaterial 
                color="#ff0033" 
                emissive="#aa0000"
                emissiveIntensity={2} // 强发光，配合 Bloom
                distort={0.6} // 扭曲程度
                speed={2} // 扭曲速度
                roughness={0}
            />
          </>
        );

      case 'Sector_A_Legacy_Data': // 旧世：琥珀色的果冻
        return (
          <>
            <sphereGeometry args={[1, 32, 32]} />
            <meshPhysicalMaterial 
                color="#ffaa00" 
                transmission={0.6} // 半透明
                thickness={2} 
                roughness={0.2} 
                ior={1.5}
            />
          </>
        );

      default: // 噪点：幽灵般的白色
        return (
          <>
            <dodecahedronGeometry args={[0.8, 0]} />
            <MeshWobbleMaterial color="#888" factor={1} speed={1} opacity={0.8} transparent />
          </>
        );
    }
  };

  return (
    <group position={data.position}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onSelect(data); }}
          onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
        >
          {renderVisuals()}
        </mesh>
        
        {/* HUD 也改一下，更有科技感 */}
        {hovered && (
            <Html position={[0, 4, 0]} center distanceFactor={15}>
                <div className="bg-black/80 border border-white/20 p-4 rounded text-white backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    <h2 className="text-lg font-bold tracking-wider animate-pulse">{data.title}</h2>
                    <div className="h-px w-full bg-white/30 my-2"></div>
                    <p className="text-xs font-mono text-gray-400">{data.date} // {data.wasteland_type}</p>
                </div>
            </Html>
        )}
    </group>
  );
}

// 别忘了引入 THREE (如果没引的话)
import * as THREE from 'three';
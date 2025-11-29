import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export default function YearRings({ rings }) {
  const { camera } = useThree();
  const groupRef = useRef();

  // 预定义材质，节省性能
  const baseMaterial = new THREE.MeshBasicMaterial({ 
    color: '#333', 
    transparent: true, 
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  
  const activeMaterial = new THREE.MeshBasicMaterial({ 
    color: '#00ffff', // 高亮色：青色
    transparent: true, 
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  useFrame(() => {
    if (!groupRef.current) return;

    // 计算玩家到原点的距离
    const dist = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);

    // 遍历所有圆环，根据距离动态调整
    groupRef.current.children.forEach((child, index) => {
      // child.userData 存了该环的 radius 信息
      const ringRadius = child.userData.radius;
      
      // 判断逻辑：
      // 如果 玩家距离 > 这个环的半径，说明玩家在这个环的"外侧"（也就是更旧的时间）
      // 我们找到 刚好小于玩家距离 的那个最大的环，就是当前的年份边界
      
      // 简单视觉逻辑：当玩家接近这个环时（+/- 5米），环变亮
      const distanceToRing = Math.abs(dist - ringRadius);
      
      if (distanceToRing < 8) {
        // 靠近时高亮
        if (child.material !== activeMaterial) {
            child.material = activeMaterial;
            child.scale.setScalar(1.01); // 微微放大
        }
      } else {
        // 远离时变暗
        if (child.material !== baseMaterial) {
            child.material = baseMaterial;
            child.scale.setScalar(1);
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((ring, i) => (
        <group key={ring.year} userData={{ radius: ring.radius }}>
          {/* 圆环几何体: 这是一个空心的圈 */}
          <mesh>
            <ringGeometry args={[ring.radius, ring.radius + 0.3, 128]} />
            <primitive object={baseMaterial} attach="material" />
          </mesh>

          {/* 年份文字：放在圆环上 */}
          {/* 稍微旋转一下文字，让它散布在不同角度，避免堆叠 */}
          <group rotation={[0, 0, i * 0.5]}> 
            <Text
              position={[ring.radius + 2, 0, 0]} // 放在环旁边
              rotation={[0, 0, Math.PI / 2]} // 文字躺平
              fontSize={2}
              color="#666"
              anchorX="left"
              anchorY="middle"
            >
              {ring.year}
            </Text>
          </group>
        </group>
      ))}
    </group>
  );
}
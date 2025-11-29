import { useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useEffect } from 'react';

const SPEED = 10;
const RUN_SPEED = 30;

export default function PlayerController({ controlsRef }) {
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  
  // 临时向量，避免在每一帧里重复创建对象（GC友好）
  const direction = new Vector3();
  const frontVector = new Vector3();
  const sideVector = new Vector3();
  const tempVec = new Vector3();

  useFrame((state, delta) => {
    // 如果没有获取到 controls 实例，或者处于 UI 交互状态，则不移动
    if (!controlsRef.current) return;

    const { forward, backward, left, right, run } = getKeys();
    
    // 只有按下了键才进行计算
    if (forward || backward || left || right) {
        
      const currentSpeed = (run ? RUN_SPEED : SPEED) * delta;

      // 1. 获取当前相机的朝向，作为“前方”
      // 我们只取 X 和 Z 轴，忽略 Y 轴（这样你不会飞向天空或钻入地下，只在平面漫游）
      frontVector.set(0, 0, -1).applyQuaternion(camera.quaternion);
      frontVector.y = 0; // 锁定高度移动
      frontVector.normalize();

      // 2. 获取“右方”向量
      sideVector.set(1, 0, 0).applyQuaternion(camera.quaternion);
      sideVector.y = 0;
      sideVector.normalize();

      // 3. 计算移动方向
      direction.set(0, 0, 0);
      
      if (forward) direction.add(frontVector);
      if (backward) direction.sub(frontVector);
      if (left) direction.sub(sideVector);
      if (right) direction.add(sideVector);

      // 归一化并应用速度
      if (direction.lengthSq() > 0) {
          direction.normalize().multiplyScalar(currentSpeed);
          
          // 4. 同时移动相机和控制器的目标点
          camera.position.add(direction);
          controlsRef.current.target.add(direction);
      }
    }
  });

  return null; // 这是一个逻辑组件，不渲染任何东西
}
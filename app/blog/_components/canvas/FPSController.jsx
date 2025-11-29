import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import { Vector3, Euler } from 'three';

const WALK_SPEED = 15;
const RUN_SPEED = 40;

export default function FPSController() {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls();
  const controlsRef = useRef();
  
  // 临时变量，避免在 useFrame 里频繁创建对象（性能优化）
  const vec = new Vector3();
  const forward = new Vector3(0, 0, -1);
  const right = new Vector3(1, 0, 0);
  const euler = new Euler(0, 0, 0, 'YXZ');

  useFrame((state, delta) => {
    // 只有锁定状态才移动
    if (!controlsRef.current?.isLocked) return;

    const { forward: isForward, backward, left, right: isRight, run } = getKeys();
    const speed = (run ? RUN_SPEED : WALK_SPEED) * delta;

    // --- 核心修复 2：水平面移动逻辑 ---
    // 不再使用 controls.moveForward，而是手动计算

    // 1. 获取相机当前的水平朝向 (Yaw)
    // 我们只关心 Y 轴旋转，忽略抬头低头 (Pitch)
    euler.setFromQuaternion(camera.quaternion);
    euler.x = 0; // 忽略 X 轴旋转（抬头低头）
    euler.z = 0; // 忽略 Z 轴旋转（侧倾）

    // 2. 初始化移动向量
    vec.set(0, 0, 0);

    // 3. 计算前进/后退 (Z轴)
    if (isForward) vec.add(forward);
    if (backward) vec.sub(forward);

    // 4. 计算左/右 (X轴)
    // --- 核心修复 1：修正左右反向问题 ---
    if (isRight) vec.add(right);
    if (left) vec.sub(right);

    // 5. 应用旋转和速度
    if (vec.lengthSq() > 0) {
      vec.normalize();         // 归一化，防止对角线移动速度变快
      vec.applyEuler(euler);   // 将局部方向转换为世界方向（基于相机朝向）
      vec.multiplyScalar(speed); // 应用速度

      // 6. 移动相机
      // 这里的 moveRight/moveForward 是 PointerLockControls 内部用的，
      // 既然我们自己算好了世界坐标的增量，直接加到 camera.position 上最稳
      camera.position.add(vec);
    }
    
    // 7. 高度锁定 (现在因为不再往地下钻了，这个锁定会非常平滑)
    // 稍微加一点阻尼或者直接锁定均可
    camera.position.y = 2; 
  });

  return (
    <PointerLockControls 
        ref={controlsRef} 
        selector="#canvas-container" // 确保这与 ClientPage 的 id 一致
    />
  );
}
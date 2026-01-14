'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { CoinMesh } from './CoinMesh';
import { VECTORS } from '../../_lib/coinConfig';

// --- 物理判定常量 ---
const VELOCITY_THRESHOLD = 0.005;    // 线速度平方阈值
const ANGULAR_THRESHOLD = 0.03;      // 角速度平方阈值
const FACE_DOT_THRESHOLD = 0.3;      // 面朝向判定阈值
const RESET_IMPULSE = { x: 0.1, y: 0.2, z: 0.1 }; // 重置冲量范围

interface CoinProps {
  position: [number, number, number];
  id: string;
  onSettle?: (id: string, result: '阳' | '阴' | '侧立') => void;
  resetSignal?: number;
}

/**
 * 组件：硬币物理实体
 */
export function Coin({ position, id, onSettle, resetSignal }: CoinProps) {
  const [isSettled, setIsSettled] = useState(false);
  const bodyRef = useRef<RapierRigidBody>(null);
  const lastResetSignal = useRef(resetSignal);

  useFrame(() => {
    if (!bodyRef.current) return;

    // 监听重置信号
    if (resetSignal !== lastResetSignal.current) {
      lastResetSignal.current = resetSignal;
      setIsSettled(false);
      bodyRef.current.wakeUp();
      // 给一个随机的小冲量，防止死锁
      bodyRef.current.applyImpulse({
        x: (Math.random() - 0.5) * RESET_IMPULSE.x,
        y: (Math.random() + 0.5) * RESET_IMPULSE.y,
        z: (Math.random() - 0.5) * RESET_IMPULSE.z
      }, true);
      return;
    }

    const vel = bodyRef.current.linvel();
    const ang = bodyRef.current.angvel();
    // 判定是否静止
    const isSleeping = (vel.x ** 2 + vel.y ** 2 + vel.z ** 2) < VELOCITY_THRESHOLD &&
                       (ang.x ** 2 + ang.y ** 2 + ang.z ** 2) < ANGULAR_THRESHOLD;

    if (!isSleeping) {
      if (isSettled) setIsSettled(false);
      return;
    }

    if (!isSettled) {
      const rawRot = bodyRef.current.rotation();
      const bodyRotation = VECTORS.tempQuat.set(rawRot.x, rawRot.y, rawRot.z, rawRot.w);

      // 计算朝向: 视觉 +Z 对应物理局部 -Y (因为 Mesh 绑 X 旋转了 90 度)
      VECTORS.localY.set(0, 1, 0).applyQuaternion(bodyRotation);
      const dot = VECTORS.localY.dot(VECTORS.worldUp);

      let result: '阳' | '阴' | '侧立' = '侧立';
      // dot > 0.3: 物理 Y 朝上 -> 视觉背面朝上 -> 阴
      // dot < -0.3: 物理 Y 朝下 -> 视觉正面朝上 -> 阳
      // 只有接近垂直时才算侧立
      if (dot > FACE_DOT_THRESHOLD) result = '阴';
      else if (dot < -FACE_DOT_THRESHOLD) result = '阳';

      setIsSettled(true);
      if (onSettle) onSettle(id, result);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      colliders={false}
      restitution={0.2}
      friction={0.6}
      ccd={true}
      linearDamping={0.4}
      angularDamping={0.4}
      mass={50}
    >
      <CylinderCollider args={[0.04, 0.6]} />
      <CoinMesh />
    </RigidBody>
  );
}

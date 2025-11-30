'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { CoinMesh } from './CoinMesh';
import { VECTORS } from '../../_lib/coinConfig';

interface CoinProps {
  position: [number, number, number];
  id: string;
}

/**
 * 组件：硬币物理实体
 */
export function Coin({ position, id }: CoinProps) {
  const [status, setStatus] = useState<string>('...');
  const [isSettled, setIsSettled] = useState(false);
  const bodyRef = useRef<RapierRigidBody>(null);

  useFrame(() => {
    if (!bodyRef.current) return;
    
    const vel = bodyRef.current.linvel();
    const ang = bodyRef.current.angvel();
    // 判定是否静止
    const isSleeping = (vel.x ** 2 + vel.y ** 2 + vel.z ** 2) < 0.005 && 
                       (ang.x ** 2 + ang.y ** 2 + ang.z ** 2) < 0.03;

    if (!isSleeping) {
      if (isSettled) setIsSettled(false);
      if (status !== '...') setStatus('...');
      return;
    }

    if (!isSettled) {
      const rawRot = bodyRef.current.rotation();
      const bodyRotation = VECTORS.tempQuat.set(rawRot.x, rawRot.y, rawRot.z, rawRot.w);

      // 计算朝向: 视觉 +Z 对应物理局部 -Y (因为 Mesh 绕 X 旋转了 90 度)
      VECTORS.localY.set(0, 1, 0).applyQuaternion(bodyRotation);
      const dot = VECTORS.localY.dot(VECTORS.worldUp);

      // dot > 0.7: 物理 Y 朝上 -> 视觉背面朝上 -> 阴
      // dot < -0.7: 物理 Y 朝下 -> 视觉正面朝上 -> 阳
      if (dot > 0.7) setStatus('阴');
      else if (dot < -0.7) setStatus('阳');
      else setStatus('侧立');
      
      setIsSettled(true);
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
      linearDamping={0.6}
      angularDamping={0.6}
      mass={50}
    >
      <CylinderCollider args={[0.04, 0.6]} />
      <CoinMesh status={status} />
    </RigidBody>
  );
}

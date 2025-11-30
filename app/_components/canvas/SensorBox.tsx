'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, useHelper } from '@react-three/drei';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useSensorData } from '../../_hooks/useSensorData';
import { clamp, VECTORS } from '../../_lib/coinConfig';

interface SensorBoxProps {
  isEnabled: boolean;
  isDebugCamera: boolean;
}

/**
 * 组件：全息传感器盒子 (视锥体墙)
 */
export function SensorBox({ isEnabled, isDebugCamera }: SensorBoxProps) {
  const api = useRef<RapierRigidBody>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  
  // 传感器数据处理 Hook
  const sensorData = useSensorData(isEnabled);
  
  // 物理模拟参数
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  // --- 墙壁几何计算 ---
  const CONFIG = {
    camHeight: 10.5,
    fov: 45,
    baseHeight: 5,
    wallThick: 5
  };
  
  const halfFovRad = THREE.MathUtils.degToRad(CONFIG.fov / 2);
  const tiltAngle = halfFovRad;
  const frustumHalfSize = (CONFIG.camHeight - CONFIG.baseHeight) * Math.tan(halfFovRad);
  
  // 修正后的墙壁位置 (考虑厚度导致的位移)
  const thicknessShiftX = (CONFIG.wallThick / 2) * Math.cos(tiltAngle);
  const thicknessShiftY = (CONFIG.wallThick / 2) * Math.sin(tiltAngle);
  
  const wallX = frustumHalfSize + thicknessShiftX;
  const wallY = CONFIG.baseHeight + thicknessShiftY;

  // 调试辅助线
  useHelper(isDebugCamera ? cameraRef : null, THREE.CameraHelper);

  useFrame(() => {
    if (!api.current) return;

    // 1. 应用位移 (shake)
    const SHAKE_SENSITIVITY = 0.15;
    const MAX_OFFSET = 3.5;
    currentPos.current.x += sensorData.current.accX * SHAKE_SENSITIVITY;
    currentPos.current.y += sensorData.current.accY * SHAKE_SENSITIVITY;
    currentPos.current.x = clamp(currentPos.current.x, -MAX_OFFSET, MAX_OFFSET);
    currentPos.current.y = clamp(currentPos.current.y, -MAX_OFFSET, MAX_OFFSET);

    // 2. 应用旋转 (tilt)
    const MAX_TILT = Math.PI / 4;
    const radBeta = THREE.MathUtils.degToRad(sensorData.current.beta);
    const radGamma = THREE.MathUtils.degToRad(sensorData.current.gamma);
    const clampedBeta = clamp(radBeta, -MAX_TILT, MAX_TILT);
    const clampedGamma = clamp(radGamma, -MAX_TILT, MAX_TILT);

    VECTORS.tempEuler.set(clampedBeta, 0, -clampedGamma);
    const targetQuaternion = VECTORS.tempQuat.setFromEuler(VECTORS.tempEuler);
    currentRot.current.slerp(targetQuaternion, 0.1);

    // 3. 更新运动学物体
    api.current.setNextKinematicTranslation({ x: currentPos.current.x, y: currentPos.current.y, z: 0 });
    api.current.setNextKinematicRotation(currentRot.current);
  });

  return (
    <RigidBody ref={api} type="kinematicPosition" friction={0.5} colliders={false}>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault={!isDebugCamera}
        position={[0, CONFIG.camHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fov={CONFIG.fov}
        far={30}
      />

      {/* 物理碰撞墙 */}
      <CuboidCollider args={[10, 2, 10]} position={[0, -3, 0]} /> {/* Bottom Cap */}
      <CuboidCollider args={[10, 2, 10]} position={[0, 6, 0]} />  {/* Top Cap */}
      
      {/* Right Wall */}
      <CuboidCollider args={[CONFIG.wallThick/2, 10, 10]} position={[wallX, wallY, 0]} rotation={[0, 0, tiltAngle]} />
      {/* Left Wall */}
      <CuboidCollider args={[CONFIG.wallThick/2, 10, 10]} position={[-wallX, wallY, 0]} rotation={[0, 0, -tiltAngle]} />
      {/* Down Wall */}
      <CuboidCollider args={[10, 10, CONFIG.wallThick/2]} position={[0, wallY, wallX]} rotation={[-tiltAngle, 0, 0]} />
      {/* Up Wall */}
      <CuboidCollider args={[10, 10, CONFIG.wallThick/2]} position={[0, wallY, -wallX]} rotation={[tiltAngle, 0, 0]} />
      
      <gridHelper args={[10, 6, 0x222222, 0x113355]} position={[0, -0.9, 0]} />
    </RigidBody>
  );
}

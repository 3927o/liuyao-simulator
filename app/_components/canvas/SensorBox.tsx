'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, useHelper } from '@react-three/drei';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
// 假设路径正确，请根据实际情况调整
import { clamp, VECTORS } from '../../_lib/coinConfig'; 
import { useSensorData } from '../../_hooks/useSensorData';

interface SensorBoxProps {
  isEnabled: boolean;
  isDebugCamera: boolean;
}

export function SensorBox({ isEnabled, isDebugCamera }: SensorBoxProps) {
  const api = useRef<RapierRigidBody>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  
  // 获取原始数据
  const sensorData = useSensorData(isEnabled);
  
  // 物理模拟参数
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  // --- 新增：校准状态管理 ---
  // 用于存储校准时的偏移量 (作为“零点”)
  const calibrationOffset = useRef({ beta: 0, gamma: 0 });
  // 用于记录上一帧是否处于活跃状态 (用于检测状态跳变)
  const wasActive = useRef(false);

  // --- 墙壁几何计算 (保持不变) ---
  const CONFIG = {
    camHeight: 10.5,
    fov: 45,
    baseHeight: 5,
    wallThick: 5
  };
  
  const halfFovRad = THREE.MathUtils.degToRad(CONFIG.fov / 2);
  const tiltAngle = halfFovRad;
  const frustumHalfSize = (CONFIG.camHeight - CONFIG.baseHeight) * Math.tan(halfFovRad);
  const thicknessShiftX = (CONFIG.wallThick / 2) * Math.cos(tiltAngle);
  const thicknessShiftY = (CONFIG.wallThick / 2) * Math.sin(tiltAngle);
  const wallX = frustumHalfSize + thicknessShiftX;
  const wallY = CONFIG.baseHeight + thicknessShiftY;

  // 调试辅助线
  useHelper(isDebugCamera ? cameraRef : null, THREE.CameraHelper);

  useFrame((state, delta) => {
    if (!api.current) return;

    // --- 0. 参数配置 ---
    const SHAKE_SENSITIVITY = 0.15;
    const MAX_OFFSET = 3.5;
    const MAX_TILT = Math.PI / 4;
    
    // 阈值设定
    const DEADZONE_ACC = 2.5; 
    const RESTORE_SPEED = 5.0; 

    const raw = sensorData.current;

    // --- 1. 判断运动活跃状态 (仅基于加速度) ---
    // 这里使用了你提供的逻辑：只要加速度够大，就视为活跃
    const isActiveMotion = 
      Math.abs(raw.accX) > DEADZONE_ACC || 
      Math.abs(raw.accY) > DEADZONE_ACC;

    // --- 2. 核心逻辑：动态重校准 ---
    // 如果“上一帧不活跃”且“当前活跃” -> 说明是动作刚开始的一瞬间 (上升沿)
    if (isActiveMotion && !wasActive.current) {
      console.log("检测到剧烈晃动，以当前姿态重置水平面！");
      calibrationOffset.current.beta = raw.beta;
      calibrationOffset.current.gamma = raw.gamma;
    }

    // 更新历史状态，供下一帧使用
    wasActive.current = isActiveMotion;

    // --- 3. 计算“有效角度” (当前原始值 - 校准偏移值) ---
    const effectiveBeta = raw.beta - calibrationOffset.current.beta;
    const effectiveGamma = raw.gamma - calibrationOffset.current.gamma;


    // --- 4. 物理反馈逻辑 ---

    if (isActiveMotion) {
      // === 活跃状态 ===
      
      // A. 位置累加
      currentPos.current.x += raw.accX * SHAKE_SENSITIVITY;
      currentPos.current.y += raw.accY * SHAKE_SENSITIVITY;
      
      // B. 旋转计算 (使用经过校准的 effectiveBeta/Gamma)
      const radBeta = THREE.MathUtils.degToRad(effectiveBeta);
      const radGamma = THREE.MathUtils.degToRad(effectiveGamma);
      const clampedBeta = clamp(radBeta, -MAX_TILT, MAX_TILT);
      const clampedGamma = clamp(radGamma, -MAX_TILT, MAX_TILT);
      
      VECTORS.tempEuler.set(clampedBeta, 0, -clampedGamma);
      const targetQuaternion = VECTORS.tempQuat.setFromEuler(VECTORS.tempEuler);
      
      currentRot.current.slerp(targetQuaternion, 0.1);

    } else {
      // === 静止/死区状态 ===
      
      // A. 位置回归原点
      const t = Math.min(1.0, delta * RESTORE_SPEED); 
      currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, 0, t);
      currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, 0, t);

      // B. 旋转回归水平 (Identity)
      // 注意：这里回归的是 visual identity (绝对水平)，等待下一次晃动重新定标
      const identityQuat = VECTORS.tempQuat.set(0, 0, 0, 1);
      currentRot.current.slerp(identityQuat, 0.05); 
    }

    // --- 5. 边界限制 ---
    currentPos.current.x = clamp(currentPos.current.x, -MAX_OFFSET, MAX_OFFSET);
    currentPos.current.y = clamp(currentPos.current.y, -MAX_OFFSET, MAX_OFFSET);

    // --- 6. 应用物理 ---
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

      <CuboidCollider args={[10, 2, 10]} position={[0, -3, 0]} />
      <CuboidCollider args={[10, 2, 10]} position={[0, 6, 0]} />
      <CuboidCollider args={[CONFIG.wallThick/2, 10, 10]} position={[wallX, wallY, 0]} rotation={[0, 0, tiltAngle]} />
      <CuboidCollider args={[CONFIG.wallThick/2, 10, 10]} position={[-wallX, wallY, 0]} rotation={[0, 0, -tiltAngle]} />
      <CuboidCollider args={[10, 10, CONFIG.wallThick/2]} position={[0, wallY, wallX]} rotation={[-tiltAngle, 0, 0]} />
      <CuboidCollider args={[10, 10, CONFIG.wallThick/2]} position={[0, wallY, -wallX]} rotation={[tiltAngle, 0, 0]} />
      
      <gridHelper args={[10, 6, 0x222222, 0x113355]} position={[0, -0.9, 0]} />
    </RigidBody>
  );
}
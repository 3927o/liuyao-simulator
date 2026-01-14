'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useHelper } from '@react-three/drei';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { clamp, VECTORS } from '../../_lib/coinConfig';
import { useSensorData } from '../../_hooks/useSensorData';
import { useFrustumWalls } from '../../_hooks/useFrustumWalls';

interface SensorBoxProps {
  isEnabled: boolean;
  isDebugCamera: boolean;
  onShake?: () => void;
}

export function SensorBox({ isEnabled, isDebugCamera, onShake }: SensorBoxProps) {
  const api = useRef<RapierRigidBody>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  // 获取实际的视口宽高比
  const { viewport } = useThree();
  const aspect = viewport.width / viewport.height;

  // 获取原始数据
  const sensorData = useSensorData(isEnabled);

  // 物理模拟参数
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  // --- 校准状态管理 ---
  const calibrationOffset = useRef({ beta: 0, gamma: 0 });
  const wasActive = useRef(false);

  // --- 相机配置 ---
  const CAMERA_POSITION: [number, number, number] = [0, 9, 6];
  const CAMERA_FOV = 60;

  // 自动计算朝向原点的旋转（使用 Camera 而非 Object3D，因为相机看向 -Z）
  const CAMERA_CONFIG = React.useMemo(() => {
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(...CAMERA_POSITION);
    cam.lookAt(0, 0, 0);
    return {
      position: CAMERA_POSITION,
      rotation: [cam.rotation.x, cam.rotation.y, cam.rotation.z] as [number, number, number],
      fov: CAMERA_FOV,
    };
  }, []);

  // --- 使用通用视锥体墙壁 Hook ---
  const frustumWalls = useFrustumWalls({
    camera: CAMERA_CONFIG,
    aspect,
    near: 1,
    far: 25,
    thickness: 15,
    margin: 25,
    ceiling: 5,
    floor: -1,
  });

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
      
      if (onShake) onShake();
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
        position={CAMERA_CONFIG.position}
        rotation={CAMERA_CONFIG.rotation}
        fov={CAMERA_CONFIG.fov}
        makeDefault={!isDebugCamera}
        far={30}
      />

      {/* 动态生成的视锥体墙壁 - 自动适应相机配置 */}
      {frustumWalls.map((wall, index) => (
        <CuboidCollider
          key={index}
          args={wall.args}
          position={wall.position}
          rotation={wall.rotation}
        />
      ))}

      <gridHelper args={[20, 12, 0xdddddd, 0xeeeeee]} position={[0, -0.9, 0]} />
    </RigidBody>
  );
}
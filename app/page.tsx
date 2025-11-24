'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Html } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

// --- 工具函数：限制数值范围 ---
const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

/**
 * 组件：智能铜钱 (保持不变)
 */
const localY = new THREE.Vector3(0, 1, 0);
const worldUp = new THREE.Vector3(0, 1, 0);

function Coin({ position, id }: { position: [number, number, number], id: string }) {
  const [status, setStatus] = useState<string>('...');
  const [isSettled, setIsSettled] = useState(false);
  
  const meshRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<any>(null);

  useFrame(() => {
    if (!meshRef.current || !bodyRef.current) return;
    const vel = bodyRef.current.linvel();
    const ang = bodyRef.current.angvel();
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    const rotationSpeed = Math.sqrt(ang.x ** 2 + ang.y ** 2 + ang.z ** 2);
    const isSleeping = speed < 0.1 && rotationSpeed < 0.5;

    if (!isSleeping) {
      if (isSettled) setIsSettled(false);
      if (status !== '...') setStatus('...');
      return;
    }

    if (!isSettled) {
      const rawRot = bodyRef.current.rotation();
      const bodyRotation = new THREE.Quaternion(rawRot.x, rawRot.y, rawRot.z, rawRot.w);
      localY.set(0, 1, 0);
      localY.applyQuaternion(bodyRotation);
      const dot = localY.dot(worldUp);
      if (dot > 0.8) setStatus('阳'); 
      else if (dot < -0.8) setStatus('阴'); 
      else setStatus('侧立');
      setIsSettled(true);
    }
  });

  return (
    <RigidBody 
      ref={bodyRef} 
      position={position} 
      colliders="hull" 
      restitution={0.3} 
      friction={0.4} 
      ccd={true}
      linearDamping={0.7} 
      angularDamping={0.7}
    >
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
        <meshStandardMaterial attach="material-0" color="#D4AF37" metalness={0.8} roughness={0.3} />
        <meshStandardMaterial attach="material-1" color="#d32f2f" metalness={0.4} roughness={0.5} />
        <meshStandardMaterial attach="material-2" color="#111111" metalness={0.4} roughness={0.5} />
        <Html position={[0, 0.8, 0]} center>
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold pointer-events-none select-none whitespace-nowrap transition-colors duration-200
            ${status === '阳' ? 'bg-red-100 text-red-600 border border-red-200' : ''}
            ${status === '阴' ? 'bg-slate-800 text-white border border-slate-600' : ''}
            ${status === '...' ? 'opacity-0' : 'opacity-100'} 
          `}>
             {id}: {status}
          </div>
        </Html>
      </mesh>
    </RigidBody>
  );
}

/**
 * 组件：传感器控制的摇晃盒子 (SensorBox)
 * 接收 deviceOrientation (倾斜) 和 deviceMotion (加速度)
 */
function SensorBox({ isEnabled }: { isEnabled: boolean }) {
  const api = useRef<any>(null);
  
  // 1. 新增：校准状态
  const calibration = useRef({
    beta: 0,   // 初始的前后倾斜值
    gamma: 0,  // 初始的左右倾斜值
    isSet: false // 是否已完成校准
  });

  // 存储传感器实时数据
  const sensorData = useRef({
    beta: 0,  
    gamma: 0, 
    accX: 0,  
    accY: 0   
  });

  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!isEnabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const rawBeta = e.beta || 0;
      const rawGamma = e.gamma || 0;

      // --- 关键修改：第一次收到数据时，进行校准 ---
      if (!calibration.current.isSet) {
        calibration.current.beta = rawBeta;
        calibration.current.gamma = rawGamma;
        calibration.current.isSet = true;
        console.log("校准完成，基准点:", rawBeta, rawGamma);
      }

      // --- 计算相对角度 (当前角度 - 初始角度) ---
      sensorData.current.beta = rawBeta - calibration.current.beta;
      sensorData.current.gamma = rawGamma - calibration.current.gamma;
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      if (e.acceleration) {
        sensorData.current.accX = e.acceleration.x || 0;
        sensorData.current.accY = e.acceleration.y || 0;
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
      // 组件卸载或重置时，重置校准状态
      calibration.current.isSet = false;
    };
  }, [isEnabled]);

  useFrame((state, delta) => {
    if (!api.current) return;

    // --- A. 位置 (摇晃) ---
    const SHAKE_SENSITIVITY = 0.5; 
    const MAX_OFFSET = 3; 
    const targetX = clamp(sensorData.current.accX * SHAKE_SENSITIVITY, -MAX_OFFSET, MAX_OFFSET);
    const targetY = clamp(sensorData.current.accY * SHAKE_SENSITIVITY, -MAX_OFFSET, MAX_OFFSET);

    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetX, 0.1);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, targetY, 0.1);


    // --- B. 旋转 (倾斜) - 使用相对角度 ---
    
    // 限制最大倾角 (例如 45度)，防止用户翻转手机导致盒子翻个底朝天
    // 这里使用的是已经减去初始值后的“相对角度”
    const MAX_TILT = Math.PI / 4; // 45度

    const radBeta = THREE.MathUtils.degToRad(sensorData.current.beta); 
    const radGamma = THREE.MathUtils.degToRad(sensorData.current.gamma);

    const clampedBeta = clamp(radBeta, -MAX_TILT, MAX_TILT);
    const clampedGamma = clamp(radGamma, -MAX_TILT, MAX_TILT);

    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(clampedBeta, 0, -clampedGamma)
    );

    currentRot.current.slerp(targetQuaternion, 0.1);

    // --- C. 提交物理 ---
    api.current.setNextKinematicTranslation({ 
      x: currentPos.current.x, 
      y: currentPos.current.y, 
      z: 0 
    });
    api.current.setNextKinematicRotation(currentRot.current);
  });

  return (
    <RigidBody ref={api} type="kinematicPosition" friction={0.5} colliders={false}>
      <PerspectiveCamera makeDefault position={[0, 7, 0]} rotation={[-Math.PI / 2, 0, 0]} fov={45} />
      
      {/* 碰撞体保持不变 */}
      <CuboidCollider args={[5, 2.5, 5]} position={[0, -3.5, 0]} /> 
      <CuboidCollider args={[5, 2.5, 5]} position={[0, 3.5, 0]} /> 
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, 5.5]} /> 
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, -5.5]} /> 
      <CuboidCollider args={[2.5, 6, 5]} position={[5.5, 0, 0]} /> 
      <CuboidCollider args={[2.5, 6, 5]} position={[-5.5, 0, 0]} /> 

      {/* 视觉 Mesh 保持不变 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6, 2, 6]} />
        <meshPhysicalMaterial
          color="white" transmission={0.95} opacity={1} transparent
          roughness={0.1} metalness={0} reflectivity={0.5} thickness={0.5} ior={1.5}
        />
      </mesh>
    </RigidBody>
  );
}

/**
 * 主页面
 */
export default function Home() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showButton, setShowButton] = useState(true);

  // 请求传感器权限 (主要针对 iOS 13+)
  const requestPermission = async () => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      // iOS 设备
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setShowButton(false);
        } else {
          alert('需要传感器权限才能摇动盒子');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Android 或 非 iOS 13+ 设备通常不需要显式请求
      setPermissionGranted(true);
      setShowButton(false);
    }
  };

  return (
    <main className="h-[100vmin] w-[100vmin] bg-slate-900 relative">
      
      {/* --- 启动按钮/遮罩层 --- */}
      {showButton && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button 
            onClick={requestPermission}
            className="px-8 py-4 bg-yellow-600 text-white font-bold rounded-full text-xl shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:bg-yellow-500 hover:scale-105 transition-all active:scale-95"
          >
            点击开始摇卦
            <div className="text-xs font-normal mt-1 opacity-80">需要手机动作传感器权限</div>
          </button>
        </div>
      )}

      <Canvas shadows>
        <Suspense fallback={null}>
          <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
          <ambientLight intensity={1.5} />

          {/* gravity: 这里的重力是物理世界的重力，不是手机感应到的。
            始终保持向下，这样铜钱才会落回盒子底部。
          */}
          <Physics debug={false} gravity={[0, -20, 0]} timeStep={1/120}>
            
            {/* 传入权限状态，只有获得权限后才开始监听 */}
            <SensorBox isEnabled={permissionGranted} />
            
            <Coin id="coin1" position={[0, 0, 0]} />
            <Coin id="coin2" position={[0.2, 0.5, 0.2]} />
            <Coin id="coin3" position={[-0.2, 1, -0.2]} />
            
          </Physics>
        </Suspense>
      </Canvas>
      
      {/* 提示信息 */}
      {permissionGranted && (
        <div className="absolute bottom-10 w-full text-center text-white/30 pointer-events-none select-none">
          请握紧手机 摇晃或倾斜
        </div>
      )}
    </main>
  );
}
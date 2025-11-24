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
  
  // 存储传感器数据 (使用 ref 以避免重渲染)
  const sensorData = useRef({
    beta: 0,  // X轴倾斜 (前后)
    gamma: 0, // Y轴倾斜 (左右)
    accX: 0,  // X轴加速度
    accY: 0   // Y轴加速度
  });

  // 当前物理状态
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!isEnabled) return;

    // 1. 处理倾斜 (Orientation)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Beta: -180 到 180 (前后倾斜)，我们限制在 +/- 45度
      // Gamma: -90 到 90 (左右倾斜)，我们限制在 +/- 45度
      sensorData.current.beta = e.beta || 0;
      sensorData.current.gamma = e.gamma || 0;
    };

    // 2. 处理摇晃 (Motion/Acceleration)
    const handleMotion = (e: DeviceMotionEvent) => {
      // accelerationIncludingGravity 包含重力，acceleration 是纯用户施加的力
      // 我们用 acceleration 来模拟“甩动”
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
    };
  }, [isEnabled]);

  useFrame((state, delta) => {
    if (!api.current) return;

    // --- A. 计算目标位置 (基于摇晃加速度) ---
    // 加速度大 -> 偏离中心远。加速度消失 -> 回到中心。
    // 注意：手机坐标系 x 是横向，y 是纵向（屏幕朝脸）
    // 为了防止漂移，我们不累加加速度，而是将加速度直接映射为“偏移量”
    
    // 敏感度系数
    const SHAKE_SENSITIVITY = 0.5; 
    const MAX_OFFSET = 3; // 最大位移限制

    // 目标位置 = 加速度 * 系数 (反向是为了符合直觉：手机往左甩，盒子往左走)
    // 注意：DeviceMotion 的坐标系可能因设备而异，通常 x右 y上
    const targetX = clamp(sensorData.current.accX * SHAKE_SENSITIVITY, -MAX_OFFSET, MAX_OFFSET);
    const targetY = clamp(sensorData.current.accY * SHAKE_SENSITIVITY, -MAX_OFFSET, MAX_OFFSET);

    // 平滑移动 (Lerp) - 阻尼感
    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetX, 0.1);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, targetY, 0.1);


    // --- B. 计算目标旋转 (基于倾斜角度) ---
    // 将角度转换为弧度
    const radBeta = THREE.MathUtils.degToRad(sensorData.current.beta);   // 前后翻转 -> 绕 X 轴
    const radGamma = THREE.MathUtils.degToRad(sensorData.current.gamma); // 左右翻转 -> 绕 Z 轴 (注意：Z轴是R3F的深度，但视觉上左右倾斜对应Z轴旋转)

    // 限制最大倾角 (例如 45度)
    const MAX_TILT = Math.PI / 4;
    const clampedBeta = clamp(radBeta, -MAX_TILT, MAX_TILT);
    const clampedGamma = clamp(radGamma, -MAX_TILT, MAX_TILT);

    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      // 欧拉角顺序: X, Y, Z. 
      // X轴旋转对应 Beta (前后倾)
      // Z轴旋转对应 -Gamma (左右倾，负号是为了方向符合直觉)
      new THREE.Euler(clampedBeta, 0, -clampedGamma)
    );

    // 平滑旋转 (Slerp)
    currentRot.current.slerp(targetQuaternion, 0.1);

    // --- C. 提交给物理引擎 ---
    api.current.setNextKinematicTranslation({ 
      x: currentPos.current.x, 
      y: currentPos.current.y, 
      z: 0 
    });
    api.current.setNextKinematicRotation(currentRot.current);
  });

  return (
    <RigidBody ref={api} type="kinematicPosition" friction={0.5} colliders={false}>
      {/* 摄像机跟随 */}
      <PerspectiveCamera makeDefault position={[0, 7, 0]} rotation={[-Math.PI / 2, 0, 0]} fov={45} />
      
      {/* 物理墙壁 */}
      <CuboidCollider args={[5, 2.5, 5]} position={[0, -3.5, 0]} /> {/* 底 */}
      <CuboidCollider args={[5, 2.5, 5]} position={[0, 3.5, 0]} />  {/* 顶 */}
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, 5.5]} />   {/* 前 */}
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, -5.5]} />  {/* 后 */}
      <CuboidCollider args={[2.5, 6, 5]} position={[5.5, 0, 0]} />   {/* 右 */}
      <CuboidCollider args={[2.5, 6, 5]} position={[-5.5, 0, 0]} />  {/* 左 */}

      {/* 视觉盒子 */}
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
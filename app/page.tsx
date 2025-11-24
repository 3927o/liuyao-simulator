'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Html, OrbitControls } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

// --- 工具函数 ---
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
    // 简单判断静止
    const vel = bodyRef.current.linvel();
    const ang = bodyRef.current.angvel();
    const isSleeping = (vel.x**2 + vel.y**2 + vel.z**2) < 0.01 && (ang.x**2 + ang.y**2 + ang.z**2) < 0.1;

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
      ref={bodyRef} position={position} colliders="hull" restitution={0.3} friction={0.4} ccd={true} linearDamping={0.7} angularDamping={0.7}
    >
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
        <meshStandardMaterial attach="material-0" color="#D4AF37" metalness={0.8} roughness={0.3} />
        <meshStandardMaterial attach="material-1" color="#d32f2f" metalness={0.4} roughness={0.5} />
        <meshStandardMaterial attach="material-2" color="#111111" metalness={0.4} roughness={0.5} />
        <Html position={[0, 0.8, 0]} center centerAlgin>
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold pointer-events-none select-none whitespace-nowrap transition-all duration-200
            ${status === '阳' ? 'bg-red-100 text-red-600 border border-red-200 scale-100 opacity-100' : ''}
            ${status === '阴' ? 'bg-slate-800 text-white border border-slate-600 scale-100 opacity-100' : ''}
            ${status === '...' ? 'scale-50 opacity-0' : ''} 
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
 * 接收 isDebugCamera 用于决定是否激活内部相机
 */
interface SensorBoxProps {
  isEnabled: boolean;
  isDebugCamera: boolean; // 新增属性
}

function SensorBox({ isEnabled, isDebugCamera }: SensorBoxProps) {
  const api = useRef<any>(null);
  
  // 校准状态
  const calibration = useRef({ beta: 0, gamma: 0, isSet: false });
  // 传感器实时数据
  const sensorData = useRef({ beta: 0, gamma: 0, accX: 0, accY: 0 });

  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!isEnabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const rawBeta = e.beta || 0;
      const rawGamma = e.gamma || 0;
      // 第一次收到数据时校准
      if (!calibration.current.isSet) {
        calibration.current.beta = rawBeta;
        calibration.current.gamma = rawGamma;
        calibration.current.isSet = true;
      }
      // 计算相对角度
      sensorData.current.beta = rawBeta - calibration.current.beta;
      sensorData.current.gamma = rawGamma - calibration.current.gamma;
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      if (e.acceleration) {
        sensorData.current.accX = e.acceleration.x || 0;
        sensorData.current.accY = e.acceleration.y || 0;
      }
    };
    // 仅在 HTTPS 或 localhost 下生效
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
      calibration.current.isSet = false;
    };
  }, [isEnabled]);

  useFrame(() => {
    if (!api.current) return;
    // --- A. 位置 (摇晃) ---
    const SHAKE_SENSITIVITY = 0.8; 
    const MAX_OFFSET = 4; 
    // 将加速度映射为目标偏移量
    const targetX = clamp(sensorData.current.accX * SHAKE_SENSITIVITY, -MAX_OFFSET, MAX_OFFSET);
    const targetY = clamp(sensorData.current.accY * SHAKE_SENSITIVITY, -MAX_OFFSET, MAX_OFFSET);
    // Lerp 平滑回复
    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetX, 0.15);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, targetY, 0.15);

    // --- B. 旋转 (倾斜) ---
    const MAX_TILT = Math.PI / 3.5; // 限制最大倾角
    const radBeta = THREE.MathUtils.degToRad(sensorData.current.beta); 
    const radGamma = THREE.MathUtils.degToRad(sensorData.current.gamma);
    const clampedBeta = clamp(radBeta, -MAX_TILT, MAX_TILT);
    const clampedGamma = clamp(radGamma, -MAX_TILT, MAX_TILT);
    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(clampedBeta, 0, -clampedGamma)
    );
    // Slerp 平滑旋转
    currentRot.current.slerp(targetQuaternion, 0.1);

    // --- C. 提交物理 ---
    api.current.setNextKinematicTranslation({ x: currentPos.current.x, y: currentPos.current.y, z: 0 });
    api.current.setNextKinematicRotation(currentRot.current);
  });

  return (
    <RigidBody ref={api} type="kinematicPosition" friction={0.5} colliders={false}>
      {/* 核心修改：
        只有当 isDebugCamera 为 false 时，这个相机才是默认相机 (makeDefault={true})。
        否则它只是一个普通的物体，不负责渲染画面。
      */}
      <PerspectiveCamera 
        makeDefault={!isDebugCamera} 
        position={[0, 7, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        fov={45} 
      />
      
      {/* 碰撞体保持不变 */}
      <CuboidCollider args={[5, 2.5, 5]} position={[0, -3.5, 0]} /> 
      <CuboidCollider args={[5, 2.5, 5]} position={[0, 3.5, 0]} /> 
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, 5.5]} /> 
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, -5.5]} /> 
      <CuboidCollider args={[2.5, 6, 5]} position={[5.5, 0, 0]} /> 
      <CuboidCollider args={[2.5, 6, 5]} position={[-5.5, 0, 0]} /> 

      {/* 视觉 Mesh */}
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
  const [showAuthButton, setShowAuthButton] = useState(true);
  
  // 1. 新增状态：是否开启调试相机
  const [isDebugCamera, setIsDebugCamera] = useState(false);

  // iOS 权限请求
  const requestPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setShowAuthButton(false);
        } else {
          alert('需要权限');
        }
      } catch (e) { console.error(e); }
    } else {
      setPermissionGranted(true);
      setShowAuthButton(false);
    }
  };

  return (
    <main className="h-[100vmin] w-[100vmin] bg-slate-900 relative">
      
      {/* --- UI 层 --- */}
      {/* 权限按钮遮罩 */}
      {showAuthButton && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button 
            onClick={requestPermission}
            className="px-8 py-4 bg-yellow-600 text-white font-bold rounded-full text-xl shadow-[0_0_20px_rgba(234,179,8,0.5)] active:scale-95"
          >
            开始摇卦 (需要传感器权限)
          </button>
        </div>
      )}

      {/* 2. 新增 UI：切换相机按钮 (在右上角) */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={() => setIsDebugCamera(prev => !prev)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            isDebugCamera ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {isDebugCamera ? '退出上帝视角' : '上帝视角 Debug'}
        </button>
      </div>

      <Canvas shadows>
        <Suspense fallback={null}>
          <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
          <ambientLight intensity={1.5} />

          {/* 3. 新增：Debug 专用相机和控制器 
            只有在 isDebugCamera 为 true 时才渲染并生效 (makeDefault)
            位置设置在远处高空，看向原点。
          */}
          {isDebugCamera && (
            <>
              <PerspectiveCamera 
                makeDefault 
                position={[0, 20, 30]} // 放在远处高空
                fov={50}
                onUpdate={(c) => c.lookAt(0, 0, 0)} // 让它看向世界中心
              />
              {/* 允许鼠标拖拽观察 */}
              <OrbitControls makeDefault />
            </>
          )}

          <Physics debug={false} gravity={[0, -25, 0]} timeStep={1/120}>
            {/* 4. 将调试状态传给 SensorBox 
            */}
            <SensorBox isEnabled={permissionGranted} isDebugCamera={isDebugCamera} />
            
            <Coin id="coin1" position={[0, 0, 0]} />
            <Coin id="coin2" position={[0.2, 0.5, 0.2]} />
            <Coin id="coin3" position={[-0.2, 1, -0.2]} />
            
          </Physics>
        </Suspense>
      </Canvas>

      {/* 提示信息 */}
      {permissionGranted && !isDebugCamera && (
        <div className="absolute bottom-10 w-full text-center text-white/30 pointer-events-none select-none">
          请握紧手机 摇晃或倾斜
        </div>
      )}
    </main>
  );
}
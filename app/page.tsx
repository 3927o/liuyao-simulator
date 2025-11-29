'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Html, OrbitControls, Environment, Sparkles, Edges, Float, Lightformer } from '@react-three/drei';
import { Physics, RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// --- 工具函数 ---
const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

// --- 静态资源预计算 (硬币几何体) ---
// 1. 定义外圆形状
const coinRadius = 0.6;
const coinShape = new THREE.Shape();
coinShape.absarc(0, 0, coinRadius, 0, Math.PI * 2, false);

// 2. 定义中间的方孔路径
const holeSize = 0.22; // 方孔半边长
const holePath = new THREE.Path();
holePath.moveTo(-holeSize, -holeSize);
holePath.lineTo(holeSize, -holeSize);
holePath.lineTo(holeSize, holeSize);
holePath.lineTo(-holeSize, holeSize);
// 将方孔加入到形状的“洞”数组中
coinShape.holes.push(holePath);

// 3. 挤压设置 (增加倒角让边缘更真实)
const COIN_DEPTH = 0.08;
const extrudeSettings = {
  depth: COIN_DEPTH,     // 厚度
  bevelEnabled: true,    // 启用倒角
  bevelThickness: 0.03,  // 倒角延伸深度
  bevelSize: 0.03,       // 倒角向外延伸距离
  bevelSegments: 5,      // 倒角光滑度
  curveSegments: 64      // 圆周光滑度
};

/**
 * 组件：单个硬币的视觉模型 (包含正反面区分标记)
 */
function CoinMesh({ status }: { status: string }) {
  // 使用 useMemo 确保几何体只创建一次
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(coinShape, extrudeSettings), []);

  const getStatusColor = () => {
    if (status === '阳') return 'text-red-400 border-red-500/50 bg-red-900/60 shadow-[0_0_10px_rgba(248,113,113,0.5)]';
    if (status === '阴') return 'text-cyan-300 border-cyan-500/50 bg-cyan-900/60 shadow-[0_0_10px_rgba(34,211,238,0.5)]';
    return 'opacity-0';
  };

  // 计算表面附加物的偏移量，防止与硬币表面重叠闪烁 (Z-fighting)
  // 偏移量 = 半个厚度 + 极小值
  const surfaceOffset = COIN_DEPTH / 2 + 0.005;

  // 定义发光材质 (toneMapped={false} 能让颜色突破屏幕亮度限制，配合 Bloom 产生强辉光)
  const yangMaterial = new THREE.MeshStandardMaterial({ 
    color: "#ff2200", emissive: "#ff2200", emissiveIntensity: 3, toneMapped: false 
  });
  const yinMaterial = new THREE.MeshStandardMaterial({ 
    color: "#00ffff", emissive: "#00ffff", emissiveIntensity: 3, toneMapped: false 
  });
  const markerSize = 0.06;
  const markerDist = 0.38;

  return (
    // 整体绕 X 旋转 90 度平躺
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* --- 硬币主体 --- */}
      <mesh castShadow receiveShadow geometry={geometry}>
        {/* material-0: 侧面/倒角 (磨损高光) */}
        <meshPhysicalMaterial 
          attach="material-0" color="#d4af37" metalness={1.0} roughness={0.2} 
          clearcoat={1} emissive="#ff6600" emissiveIntensity={0.2} 
        />
        {/* material-1: 正反平面 (深色氧化古铜) */}
        <meshPhysicalMaterial 
          attach="material-1" color="#2a1a10" metalness={0.7} roughness={0.8} clearcoat={0}
        />
      </mesh>

      {/* --- 视觉标记层 --- */}
      
      {/* 阳面标记 (+Z 方向): 四个红色发光数据点 */}
      {/* 根据物理逻辑判定，当局部 Y 轴朝下 (dot < -0.7) 时为阳。
          由于视觉模型绕 X 转了 90 度，视觉的 +Z 对应物理的局部 -Y。
          所以 +Z 面是阳面。 */}
      <group position={[0, 0, surfaceOffset]}>
         <mesh position={[markerDist, 0, 0]} material={yangMaterial}> <boxGeometry args={[markerSize, markerSize, 0.01]} /> </mesh>
         <mesh position={[-markerDist, 0, 0]} material={yangMaterial}> <boxGeometry args={[markerSize, markerSize, 0.01]} /> </mesh>
         <mesh position={[0, markerDist, 0]} material={yangMaterial}> <boxGeometry args={[markerSize, markerSize, 0.01]} /> </mesh>
         <mesh position={[0, -markerDist, 0]} material={yangMaterial}> <boxGeometry args={[markerSize, markerSize, 0.01]} /> </mesh>
      </group>

      {/* 阴面标记 (-Z 方向): 一个青色发光能量环 */}
      <group position={[0, 0, -surfaceOffset]}>
        {/*由于在背面，需要转 180 度让法线朝外*/}
        <mesh rotation={[0, Math.PI, 0]} material={yinMaterial}>
           {/* Torus: 半径, 管粗, 径向分段, 管分段 */}
          <torusGeometry args={[0.38, 0.025, 16, 64]} />
        </mesh>
      </group>
      
      {/* 状态标签 UI */}
      <Html position={[0, 0, 0]} center zIndexRange={[100, 0]} transform sprite>
        <div className={`px-2 py-0.5 rounded backdrop-blur-sm border text-[10px] font-mono font-bold pointer-events-none select-none whitespace-nowrap transition-all duration-300
          ${getStatusColor()}
          ${status === '...' ? 'scale-50 opacity-0' : 'scale-100 opacity-100 translate-y-12'} 
        `}>
            {status}
        </div>
      </Html>
    </group>
  );
}


/**
 * 组件：赛博铜钱 (物理逻辑层)
 */
const localY = new THREE.Vector3(0, 1, 0); // 因为模型旋转了，现在的法线是 Z 轴
const worldUp = new THREE.Vector3(0, 1, 0);

function Coin({ position, id }: { position: [number, number, number], id: string }) {
  const [status, setStatus] = useState<string>('...');
  const [isSettled, setIsSettled] = useState(false);
  const bodyRef = useRef<any>(null);

  useFrame(() => {
    if (!bodyRef.current) return;
    const vel = bodyRef.current.linvel();
    const ang = bodyRef.current.angvel();
    // 判定静止
    const isSleeping = (vel.x**2 + vel.y**2 + vel.z**2) < 0.002 && (ang.x**2 + ang.y**2 + ang.z**2) < 0.02;

    if (!isSleeping) {
      if (isSettled) setIsSettled(false);
      if (status !== '...') setStatus('...');
      return;
    }

    if (!isSettled) {
      const rawRot = bodyRef.current.rotation();
      const bodyRotation = new THREE.Quaternion(rawRot.x, rawRot.y, rawRot.z, rawRot.w);
      
      // 这里的逻辑也需要微调：
      // 视觉模型绕 X 旋转了 90度，意味着视觉的"正面"(Local Z) 变成了 Local -Y。
      // 所以我们现在检测 Local Y 轴在世界坐标的投影。
      localY.set(0, 1, 0); 
      localY.applyQuaternion(bodyRotation);
      const dot = localY.dot(worldUp);
      
      // dot 接近 1 (Y轴朝上) -> 硬币实际上是"反面"(因为视觉被翻转了) -> 阴
      // dot 接近 -1 (Y轴朝下) -> 硬币是"正面" -> 阳
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
      colliders={false} // <--- 关键修正 1：关闭自动生成，只使用下面的手动 Collider
      restitution={0.2} 
      friction={0.6} // 稍微降低摩擦力，让它更容易滑动一点
      ccd={true} 
      linearDamping={0.6} 
      angularDamping={0.6} 
      mass={50}
    >
      {/* 关键修正 2：
         Rapier 的圆柱体默认就是沿 Y 轴的。
         我们的视觉模型旋转后也是沿 Y 轴平躺的。
         所以这里不需要旋转 (rotation={[0,0,0]})。
      */}
      <CylinderCollider args={[0.04, 0.6]} /> 
      
      {/* 视觉模型 (保持不变) */}
      <CoinMesh status={status} />
    </RigidBody>
  );
}


// --- 以下为 SensorBox, Home 等未修改组件，为确保完整性一并提供 ---

/**
 * 组件：全息传感器盒子
 */
interface SensorBoxProps {
  isEnabled: boolean;
  isDebugCamera: boolean;
}

function SensorBox({ isEnabled, isDebugCamera }: SensorBoxProps) {
  const api = useRef<any>(null);
  const calibration = useRef({ beta: 0, gamma: 0, isSet: false });
  const sensorData = useRef({ beta: 0, gamma: 0, accX: 0, accY: 0 });
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!isEnabled) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const rawBeta = e.beta || 0;
      const rawGamma = e.gamma || 0;
      if (!calibration.current.isSet) {
        calibration.current.beta = rawBeta;
        calibration.current.gamma = rawGamma;
        calibration.current.isSet = true;
      }
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
      calibration.current.isSet = false;
    };
  }, [isEnabled]);

  useFrame(() => {
    if (!api.current) return;
    const SHAKE_SENSITIVITY = 0.15; 
    const MAX_OFFSET = 3.5;
    currentPos.current.x += sensorData.current.accX * SHAKE_SENSITIVITY;
    currentPos.current.y += sensorData.current.accY * SHAKE_SENSITIVITY;
    currentPos.current.x = clamp(currentPos.current.x, -MAX_OFFSET, MAX_OFFSET);
    currentPos.current.y = clamp(currentPos.current.y, -MAX_OFFSET, MAX_OFFSET);

    const MAX_TILT = Math.PI / 4;
    const radBeta = THREE.MathUtils.degToRad(sensorData.current.beta); 
    const radGamma = THREE.MathUtils.degToRad(sensorData.current.gamma);
    const clampedBeta = clamp(radBeta, -MAX_TILT, MAX_TILT);
    const clampedGamma = clamp(radGamma, -MAX_TILT, MAX_TILT);
    
    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(clampedBeta, 0, -clampedGamma)
    );
    currentRot.current.slerp(targetQuaternion, 0.1);

    api.current.setNextKinematicTranslation({ x: currentPos.current.x, y: currentPos.current.y, z: 0 });
    api.current.setNextKinematicRotation(currentRot.current);
  });

  return (
    <RigidBody ref={api} type="kinematicPosition" friction={0.5} colliders={false}>
      <PerspectiveCamera 
        makeDefault={!isDebugCamera} 
        position={[0, 10.5, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        fov={45} 
      />
      
      <CuboidCollider args={[8, 2.5, 8]} position={[0, -5.5, 0]} /> 
      <CuboidCollider args={[8, 2.5, 8]} position={[0, 5.5, 0]} /> 
      <CuboidCollider args={[8, 8, 2.5]} position={[0, 0, 5.5]} /> 
      <CuboidCollider args={[8, 8, 2.5]} position={[0, 0, -5.5]} /> 
      <CuboidCollider args={[2.5, 8, 8]} position={[5.5, 0, 0]} /> 
      <CuboidCollider args={[2.5, 8, 8]} position={[-5.5, 0, 0]} /> 

      <mesh>
        <boxGeometry args={[6.2, 6.2, 6.2]} />
        <Edges scale={1} threshold={15} color="#44aaff" />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <gridHelper args={[6, 6, 0x222222, 0x113355]} position={[0, -2.9, 0]} />
    </RigidBody>
  );
}

/**
 * 主页面
 */
export default function Home() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showAuthButton, setShowAuthButton] = useState(true);
  const [isDebugCamera, setIsDebugCamera] = useState(false);

  const requestPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setShowAuthButton(false);
        } else {
          alert('需要权限才能摇卦');
        }
      } catch (e) { console.error(e); }
    } else {
      setPermissionGranted(true);
      setShowAuthButton(false);
    }
  };

  return (
    <main className="flex items-center justify-center h-screen w-screen bg-black overflow-hidden font-mono">
      
      <div className="relative w-[100vmin] h-[100vmin] shadow-2xl shadow-cyan-900/10 border border-slate-900/50">
        
        {showAuthButton && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            {/* <div className="text-cyan-500 mb-6 text-2xl tracking-[0.5em] font-light">CYBER DIVINATION</div> */}
            <button 
              onClick={requestPermission}
              className="group relative px-8 py-3 bg-transparent overflow-hidden border border-cyan-700 text-cyan-500 font-bold tracking-widest transition-all hover:bg-cyan-900/30 hover:border-cyan-400 hover:text-cyan-200"
            >
               <span className="relative z-10">INITIALIZE</span>
               <div className="absolute inset-0 h-full w-full scale-0 transition-all duration-300 group-hover:scale-100 group-hover:bg-cyan-900/10"></div>
            </button>
          </div>
        )}

        <div className="absolute top-4 right-4 z-40">
          <button
            onClick={() => setIsDebugCamera(prev => !prev)}
            className={`px-3 py-1 text-[10px] border transition-all duration-300 ${
              isDebugCamera 
                ? 'border-red-500 text-red-400 bg-red-900/20 shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                : 'border-slate-800 text-slate-600 hover:border-cyan-500 hover:text-cyan-400'
            }`}
          >
            {isDebugCamera ? 'GOD MODE' : 'VIEW'}
          </button>
        </div>

        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMappingExposure: 1.2 }}>
          <Suspense fallback={null}>
            <color attach="background" args={['#050508']} />
            
            <Environment resolution={512}>
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -9]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -6]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -3]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 0]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 3]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 6]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 9]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} color="#00ffff" rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />
                <Lightformer intensity={2} color="#ff00ff" rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />
                <Lightformer intensity={2} color="white" rotation-x={-Math.PI / 2} position={[0, -4, 0]} scale={[20, 20, 1]} />
            </Environment>

            <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
              <Sparkles count={80} scale={10} size={2} speed={0.4} opacity={0.5} color="#44aaff" />
            </Float>

            <ambientLight intensity={0.2} />
            <spotLight position={[10, 15, 10]} angle={0.15} penumbra={1} intensity={3} castShadow color="#ffaa55" />
            <pointLight position={[-5, -5, -5]} intensity={1} color="#0055ff" />

            <EffectComposer>
              <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.5} />
              {/* @ts-ignore */}
              {/* <Vignette eskil={false} offset={0.1} darkness={0.8} /> */}
            </EffectComposer>

            {isDebugCamera && (
              <>
                <PerspectiveCamera makeDefault position={[0, 20, 30]} fov={50} onUpdate={(c) => c.lookAt(0, 0, 0)} />
                <OrbitControls makeDefault />
                <gridHelper args={[50, 50, '#333', '#111']} position={[0, -10, 0]} />
              </>
            )}

            <Physics gravity={[0, -50, 0]} timeStep={1/120} debug={false}>
              <SensorBox isEnabled={permissionGranted} isDebugCamera={isDebugCamera} />
              {/* 稍微调整初始位置和旋转，增加随机感 */}
              <Coin id="COIN-01" position={[-1.2, 0.5, 0.2]} />
              <Coin id="COIN-02" position={[0, 0.8, -0.5]} />
              <Coin id="COIN-03" position={[1.2, 0.6, -0.1]} />
            </Physics>
          </Suspense>
        </Canvas>

        {permissionGranted && !isDebugCamera && (
          <div className="absolute bottom-6 w-full text-center pointer-events-none select-none">
            <p className="text-cyan-500/30 text-[10px] tracking-[0.3em] animate-pulse">
              :: SENSOR ACTIVE ::
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
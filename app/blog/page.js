'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Environment, FogExp2, Sparkles, MeshReflectorMaterial, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';

// 组件导入
import FPSController from './_components/canvas/FPSController';
import Artifact from './_components/canvas/Artifact';
import YearRings from './_components/canvas/YearRings'; // 新组件
import ReadingOverlay from './_components/dom/ReadingOverlay';
import { getWastelandData } from '@/lib/posts';

// 灯塔组件
function Beacon() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 50, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 100, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      <Html position={[0, 8, 0]} center distanceFactor={20} zIndexRange={[100, 0]}>
        <div className="font-bold text-white tracking-[0.5em] text-xs opacity-70 whitespace-nowrap pointer-events-none">
          PRESENT DAY (2025)
        </div>
      </Html>
    </group>
  );
}

// 指针锁定监听 Hook
function usePointerLockListener() {
    const [isLocked, setIsLocked] = useState(false);
    useEffect(() => {
        const handleLockChange = () => {
            setIsLocked(!!document.pointerLockElement);
        };
        document.addEventListener('pointerlockchange', handleLockChange);
        return () => document.removeEventListener('pointerlockchange', handleLockChange);
    }, []);
    return { isLocked, setIsLocked };
}

export default function ClientPage() {
  // 数据初始化
  const { posts, rings } = useMemo(() => getWastelandData(), []);
  const [selectedPost, setSelectedPost] = useState(null);
  
  // 指针状态
  const { isLocked, setIsLocked } = usePointerLockListener();

  // 键盘映射
  const keyboardMap = [
    { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
    { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
    { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
    { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
    { name: 'run', keys: ['Shift'] },
  ];

  return (
    <div id="canvas-container" className="relative w-screen h-screen bg-black overflow-hidden font-mono select-none">
      
      {/* --- UI HUD 层 --- */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 text-white/80">
        
        {/* 左上：状态 */}
        <div>
          <h1 className="text-2xl font-bold tracking-widest">[ SPIRITUAL_WASTELAND ]</h1>
          <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <p className="text-xs text-gray-400">
                SYSTEM: {isLocked ? 'ONLINE' : 'STANDBY'} <br/>
                MEMORY NODES: {posts.length} LOADED
              </p>
          </div>
        </div>

        {/* 屏幕中心提示：未锁定时显示 */}
        {!isLocked && !selectedPost && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
             <div 
                className="bg-black/40 backdrop-blur border border-white/20 p-8 text-center cursor-pointer hover:bg-black/60 transition-all group"
                onClick={() => {
                    const canvas = document.querySelector('canvas');
                    if(canvas) canvas.requestPointerLock();
                }}
             >
                <p className="text-lg tracking-[0.2em] group-hover:text-cyan-400 transition-colors">CLICK TO INITIALIZE</p>
                <div className="h-px w-10 bg-white/30 mx-auto my-4"></div>
                <div className="flex gap-4 text-xs text-gray-500 justify-center">
                    <span>[W/A/S/D] MOVE</span>
                    <span>[SHIFT] BOOST</span>
                    <span>[MOUSE] LOOK</span>
                    <span>[ESC] EXIT</span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* --- 3D 场景层 --- */}
      <KeyboardControls map={keyboardMap}>
        <Canvas 
            camera={{ position: [0, 2, 10], fov: 60 }} 
            dpr={[1, 2]} // 优化高分屏性能
            gl={{ antialias: false }} // 交给后处理
            onPointerMissed={() => { /* 防止意外点击背景触发逻辑 */ }}
        >
          <FPSController />

          {/* 环境氛围 */}
          <color attach="background" args={['#050505']} />
          {/* 雾气调整：略微稀薄一点，为了看清远处的环 */}
          <fogExp2 attach="fog" args={['#050505', 0.012]} /> 
          
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 50, 0]} intensity={1.5} color="#aaddff" distance={200} decay={2} />
          
          <Sparkles count={4000} scale={300} size={2} speed={0.2} opacity={0.4} />

          {/* 地面反射 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <MeshReflectorMaterial
                blur={[300, 100]} resolution={1024} mixBlur={1} mixStrength={60} roughness={1}
                depthScale={1.2} minDepthThreshold={0.4} maxDepthThreshold={1.4}
                color="#080808" metalness={0.8} mirror={0.5}
            />
          </mesh>

          {/* 视觉组件 */}
          <Beacon />
          <YearRings rings={rings} /> {/* 新增：年份光圈 */}

          {/* 文章造物 */}
          {posts.map((post) => (
            <Artifact 
                key={post.id} 
                data={post} 
                onSelect={(data) => {
                    document.exitPointerLock();
                    setIsLocked(false);
                    setSelectedPost(data);
                }} 
            />
          ))}

          {/* 后处理特效 */}
          <EffectComposer disableNormalPass>
             <Bloom luminanceThreshold={0.6} mipmapBlur intensity={1.5} radius={0.5} />
             <Noise opacity={0.05} />
             <Vignette eskil={false} offset={0.1} darkness={1.0} />
          </EffectComposer>

        </Canvas>
      </KeyboardControls>

      {/* --- 阅读覆盖层 --- */}
      {selectedPost && (
          <ReadingOverlay 
              post={selectedPost} 
              onClose={() => {
                  setSelectedPost(null);
                  // 关闭后不自动锁定，避免用户迷失
              }} 
          />
      )}
    </div>
  );
}
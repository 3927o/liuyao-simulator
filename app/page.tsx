'use client';

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment, Sparkles, Float, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

import { useSensorPermission } from './_hooks/useSensorPermission';
import { Coin } from './_components/canvas/Coin';
import { SensorBox } from './_components/canvas/SensorBox';
import { PermissionOverlay } from './_components/ui/PermissionOverlay';

export default function Home() {
  const { granted, showButton, requestPermission } = useSensorPermission();
  const [isDebugCamera, setIsDebugCamera] = useState(false);

  return (
    <main className="flex items-center justify-center h-screen w-screen bg-black overflow-hidden font-mono">
      <div className="relative w-[100vmin] h-[100vmin] shadow-2xl shadow-cyan-900/10 border border-slate-900/50">
        
        {/* --- UI Layer --- */}
        {showButton && <PermissionOverlay onRequestPermission={requestPermission} />}

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

        {granted && !isDebugCamera && (
          <div className="absolute bottom-6 w-full text-center pointer-events-none select-none z-30">
            <p className="text-cyan-500/30 text-[10px] tracking-[0.3em] animate-pulse">
              :: SENSOR ACTIVE ::
            </p>
          </div>
        )}

        {/* --- 3D Scene Layer --- */}
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMappingExposure: 1.2 }}>
          <Suspense fallback={null}>
            <color attach="background" args={['#050508']} />

            {/* 环境光照 */}
            <Environment resolution={512}>
              <group rotation={[-Math.PI / 2, 0, 0]}>
                {[...Array(7)].map((_, i) => (
                  <Lightformer key={i} intensity={2} rotation-x={Math.PI / 2} position={[0, 4, (i-3)*3]} scale={[10, 1, 1]} />
                ))}
                <Lightformer intensity={2} color="#00ffff" rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />
                <Lightformer intensity={2} color="#ff00ff" rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />
                <Lightformer intensity={2} color="white" rotation-x={-Math.PI / 2} position={[0, -4, 0]} scale={[20, 20, 1]} />
              </group>
            </Environment>

            <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
              <Sparkles count={80} scale={10} size={2} speed={0.4} opacity={0.5} color="#44aaff" />
            </Float>

            <ambientLight intensity={0.2} />
            <spotLight position={[10, 15, 10]} angle={0.15} penumbra={1} intensity={3} castShadow color="#ffaa55" />
            <pointLight position={[-5, -5, -5]} intensity={1} color="#0055ff" />

            <EffectComposer>
              <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.5} />
            </EffectComposer>

            {/* 调试相机 (God Mode) */}
            {isDebugCamera && (
              <>
                <PerspectiveCamera makeDefault position={[0, 20, 30]} fov={50} onUpdate={(c) => c.lookAt(0, 0, 0)} />
                <OrbitControls makeDefault />
                <gridHelper args={[50, 50, '#333', '#111']} position={[0, -10, 0]} />
              </>
            )}

            <Physics gravity={[0, -50, 0]} timeStep={1 / 120} debug={true}>
              <SensorBox isEnabled={granted} isDebugCamera={isDebugCamera} />
              <Coin id="COIN-01" position={[-1.2, 0.5, 0.2]} />
              <Coin id="COIN-02" position={[0, 0.8, -0.5]} />
              <Coin id="COIN-03" position={[1.2, 0.6, -0.1]} />
            </Physics>
          </Suspense>
        </Canvas>
      </div>
    </main>
  );
}

'use client';

import React, { Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useRouter } from 'next/navigation';

import { useSensorPermission } from './_hooks/useSensorPermission';
import { Coin } from './_components/canvas/Coin';
import { SensorBox } from './_components/canvas/SensorBox';
import { PermissionOverlay } from './_components/ui/PermissionOverlay';
import { LiuYaoEngine, YaoValue, HexagramResult } from '../lib/LiuYaoEngine';

// --- 辅助组件：显示当前爻的结果 ---
function LineResultDisplay({ index, value }: { index: number, value: YaoValue }) {
  let symbol = '';
  let text = '';

  switch (value) {
    case 6: symbol = 'X'; text = '老阴'; break;
    case 7: symbol = '—'; text = '少阳'; break;
    case 8: symbol = '--'; text = '少阴'; break;
    case 9: symbol = 'O'; text = '老阳'; break;
  }

  return (
    <div className="flex items-center space-x-3 text-gray-600 border-b border-gray-100 py-2">
      <span className="text-xs text-gray-400 w-12">第 {index} 爻</span>
      <span className="font-medium text-lg w-6 text-center text-gray-800">{symbol}</span>
      <span className="text-sm text-gray-500">{text}</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { granted, showButton, requestPermission } = useSensorPermission();
  const [isDebugCamera, setIsDebugCamera] = useState(false);
  
  // --- 六爻逻辑状态 ---
  const [yaoList, setYaoList] = useState<YaoValue[]>([]);
  const [currentResults, setCurrentResults] = useState<Record<string, '阳' | '阴' | '侧立'>>({});
  const [resetSignal, setResetSignal] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  
  const engine = useMemo(() => new LiuYaoEngine(), []);

  // 处理摇动开始
  const handleShake = useCallback(() => {
    if (!isShaking) setIsShaking(true);
  }, [isShaking]);

  // 处理硬币静止回调
  const handleCoinSettle = useCallback((id: string, result: '阳' | '阴' | '侧立') => {
    // 如果没有经过摇动（例如初始掉落），则忽略结果
    if (!isShaking) return;
    
    setCurrentResults(prev => ({
      ...prev,
      [id]: result
    }));
  }, [isShaking]);

  // 检查本次投掷是否完成
  useEffect(() => {
    // if (hexagram) return; // 已完成 (Moved to navigation logic)
    if (yaoList.length >= 6) return;
    
    const coinIds = ['COIN-01', 'COIN-02', 'COIN-03'];
    const results = coinIds.map(id => currentResults[id]);
    
    // 必须3个都有结果
    if (results.some(r => !r)) return;

    // 如果有侧立，提示重摇
    if (results.some(r => r === '侧立')) {
      return;
    }

    // 结算逻辑
    const yangCount = results.filter(r => r === '阳').length;
    let newLineValue: YaoValue | null = null;

    if (yangCount === 1) newLineValue = 7;
    else if (yangCount === 2) newLineValue = 8;
    else if (yangCount === 3) newLineValue = 9;
    else if (yangCount === 0) newLineValue = 6;

    if (newLineValue) {
      // 稍微延迟一点记录，避免瞬间跳动
      const timer = setTimeout(() => {
        setYaoList(prev => {
           if (prev.length >= 6) return prev;
           return [...prev, newLineValue!];
        });
        // 准备下一轮：清空当前结果
        setCurrentResults({});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentResults, yaoList.length]);

  // 监听爻满6个，跳转结果页
  useEffect(() => {
    if (yaoList.length === 6) {
      const linesStr = yaoList.join(',');
      // 延迟跳转，让用户看到最后一爻
      const timer = setTimeout(() => {
        router.push(`/result?lines=${linesStr}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [yaoList, router]);

  // 下一爻（重置硬币位置/状态）
  const handleNextLine = () => {
    setResetSignal(s => s + 1);
    setIsShaking(false);
  };

  // 自动进入下一爻：当检测到列表增加时，重置硬币
  useEffect(() => {
    if (yaoList.length > 0 && yaoList.length < 6) {
      // 给一点时间展示结果，然后重置硬币等待下一次摇动
      const timer = setTimeout(() => {
        handleNextLine();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [yaoList.length]);

  const currentLineIndex = Math.min(yaoList.length + 1, 6);
  const isFinished = yaoList.length === 6;

  return (
    <main className="flex items-center justify-center h-screen w-screen bg-gray-50 overflow-hidden text-gray-800">
      <div className="relative w-[100vmin] h-[100vmin] bg-white rounded-3xl shadow-xl">

        {/* --- UI Layer --- */}
        {showButton && <PermissionOverlay onRequestPermission={requestPermission} />}

        {/* 左上角：状态 */}
        <div className="absolute top-6 left-6 z-40 flex flex-col gap-1">
          <div className="text-lg font-medium text-gray-800">
            六爻起卦
          </div>
          <div className="text-xs text-gray-400">
            {isShaking ? '摇动中...' : '摇动手机投掷'}
          </div>
        </div>

        {/* 右上角：相机切换 */}
        <div className="absolute top-6 right-6 z-40">
          <button
            onClick={() => setIsDebugCamera(prev => !prev)}
            className={`px-4 py-2 text-xs rounded-full transition-all ${
              isDebugCamera
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {isDebugCamera ? '俯视模式' : '切换视角'}
          </button>
        </div>

        {/* 中间/底部：引导与结果展示 */}
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-end pb-16">

          {!granted && !showButton && (
            <div className="text-gray-400 animate-pulse">等待传感器授权...</div>
          )}

          {granted && !isFinished && (
            <div className="mb-8 text-center space-y-3">
              <div className="text-gray-400 text-sm">
                {Object.keys(currentResults).length === 3 ? '结算中...' : '摇动手机起卦'}
              </div>
              <div className="text-5xl font-light text-gray-800">
                第 <span className="font-semibold">{currentLineIndex}</span> 爻
              </div>
              <div className="h-1 w-32 bg-gray-100 mx-auto rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-gray-800 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${(yaoList.length / 6) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 实时显示的爻列表 */}
          <div className="absolute top-24 left-8 w-48 space-y-1 pointer-events-auto bg-white/80 backdrop-blur-sm rounded-xl p-4">
            {yaoList.length === 0 ? (
              <div className="text-gray-300 text-sm text-center py-4">尚未起卦</div>
            ) : (
              yaoList.map((val, i) => (
                <LineResultDisplay key={i} index={i + 1} value={val} />
              ))
            )}
          </div>

          {isFinished && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto rounded-3xl">
              <div className="text-gray-600 text-xl animate-pulse">
                卦象已成，正在跳转...
              </div>
            </div>
          )}
        </div>

        {/* --- 3D Scene Layer --- */}
        <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.2 }} className="rounded-3xl">
          <Suspense fallback={null}>
            <color attach="background" args={['#f8f8f8']} />

            {/* 环境光照 - 简洁柔和 */}
            <Environment resolution={256}>
              <group rotation={[-Math.PI / 2, 0, 0]}>
                {[...Array(5)].map((_, i) => (
                  <Lightformer key={i} intensity={2} rotation-x={Math.PI / 2} position={[0, 4, (i - 2) * 3]} scale={[10, 1, 1]} />
                ))}
              </group>
            </Environment>

            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 15, 10]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-5, 10, 5]} intensity={0.5} color="#ffffff" />

            {/* 调试相机 (俯视模式) */}
            {isDebugCamera && (
              <>
                <PerspectiveCamera makeDefault position={[0, 20, 30]} fov={50} onUpdate={(c) => c.lookAt(0, 0, 0)} />
                <OrbitControls makeDefault />
                <gridHelper args={[50, 50, '#ddd', '#eee']} position={[0, -10, 0]} />
              </>
            )}

            <Physics gravity={[0, -50, 0]} timeStep={1 / 60} debug={false}>
              <SensorBox isEnabled={granted} isDebugCamera={isDebugCamera} onShake={handleShake} />
              <Coin id="COIN-01" position={[-1.2, 0.5, 0.2]} onSettle={handleCoinSettle} resetSignal={resetSignal} />
              <Coin id="COIN-02" position={[0, 0.8, -0.5]} onSettle={handleCoinSettle} resetSignal={resetSignal} />
              <Coin id="COIN-03" position={[1.2, 0.6, -0.1]} onSettle={handleCoinSettle} resetSignal={resetSignal} />
            </Physics>
          </Suspense>
        </Canvas>
      </div>
    </main>
  );
}

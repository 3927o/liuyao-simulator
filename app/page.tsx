'use client';

import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useRouter } from 'next/navigation';

import { useSensorPermission } from './_hooks/useSensorPermission';
import { Coin } from './_components/canvas/Coin';
import { SensorBox } from './_components/canvas/SensorBox';
import { PermissionOverlay } from './_components/ui/PermissionOverlay';
import { IntentionGuideOverlay } from './_components/ui/IntentionGuideOverlay';
import { YaoValue } from '../lib/LiuYaoEngine';
import { LIGHT_CONFIG } from './_lib/sceneConfig';

// --- 常量配置 ---
const SETTLE_DELAY = 500;      // 结算延迟
const NAVIGATE_DELAY = 1000;   // 跳转延迟
const NEXT_LINE_DELAY = 1500;  // 下一爻延迟

// --- 辅助组件：显示当前爻的结果（紧凑版） ---
function LineResultDisplay({ value }: { value: YaoValue }) {
  let symbol = '';
  switch (value) {
    case 6: symbol = 'X'; break;
    case 7: symbol = '—'; break;
    case 8: symbol = '--'; break;
    case 9: symbol = 'O'; break;
  }

  return (
    <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-700 bg-gray-100 rounded-full">
      {symbol}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { granted, showButton, requestPermission } = useSensorPermission();
  const [showIntentionGuide, setShowIntentionGuide] = useState(true);
  
  // --- 六爻逻辑状态 ---
  const [yaoList, setYaoList] = useState<YaoValue[]>([]);
  const [currentResults, setCurrentResults] = useState<Record<string, '阳' | '阴' | '侧立'>>({});
  const [resetSignal, setResetSignal] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const handleGuideComplete = useCallback(async () => {
    if (showButton) await requestPermission();
    setShowIntentionGuide(false);
  }, [requestPermission, showButton]);

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
    if (yaoList.length >= 6) return;

    const coinIds = ['COIN-01', 'COIN-02', 'COIN-03'];
    const results = coinIds.map(id => currentResults[id]);

    // 必须3个都有结果
    if (results.some(r => !r)) return;

    // 如果有侧立，提示重摇
    if (results.some(r => r === '侧立')) {
      return;
    }

    // 结算逻辑：阳数直接映射到爻值
    const yangCount = results.filter(r => r === '阳').length;
    const yaoValueMap: Record<number, YaoValue> = { 0: 6, 1: 7, 2: 8, 3: 9 };
    const newLineValue = yaoValueMap[yangCount];

    // 稍微延迟一点记录，避免瞬间跳动
    const timer = setTimeout(() => {
      setYaoList(prev => {
         if (prev.length >= 6) return prev;
         return [...prev, newLineValue];
      });
      // 准备下一轮：清空当前结果并立即"上膛"，等待下一次摇晃
      setCurrentResults({});
      setIsShaking(false);
    }, SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, [currentResults, yaoList.length]);

  // 监听爻满6个，跳转结果页
  useEffect(() => {
    if (yaoList.length === 6) {
      const linesStr = yaoList.join(',');
      // 延迟跳转，让用户看到最后一爻
      const timer = setTimeout(() => {
        router.push(`/result?lines=${linesStr}`);
      }, NAVIGATE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [yaoList, router]);

  // 下一爻：给硬币一个小冲量，防止侧立卡死
  const handleNextLine = useCallback(() => {
    setResetSignal(s => s + 1);
  }, []);

  // 自动进入下一爻：当检测到列表增加时，重置硬币
  useEffect(() => {
    if (yaoList.length > 0 && yaoList.length < 6) {
      // 给一点时间展示结果，然后重置硬币等待下一次摇动
      const timer = setTimeout(() => {
        handleNextLine();
      }, NEXT_LINE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [yaoList.length, handleNextLine]);

  const currentLineIndex = Math.min(yaoList.length + 1, 6);
  const isFinished = yaoList.length === 6;

  return (
    <main className="flex items-center justify-center h-screen w-screen bg-gray-50 overflow-hidden text-gray-800">
      <div className="relative w-full h-full md:w-[100vmin] md:h-[100vmin] bg-white md:rounded-3xl md:shadow-xl">

        {/* --- UI Layer --- */}
        {showButton && <PermissionOverlay onRequestPermission={requestPermission} />}
        {showIntentionGuide && <IntentionGuideOverlay onComplete={handleGuideComplete} />}

        {/* 顶部：标题和进度 */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm">
          <div className="text-sm font-medium text-gray-800">
            六爻起卦
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {currentLineIndex}/6
            </span>
            <div className="h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(yaoList.length / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 底部：爻列表和状态 */}
        <div className="absolute bottom-0 left-0 right-0 z-40 px-4 py-4 bg-white/80 backdrop-blur-sm">
          {!granted && !showButton && (
            <div className="text-gray-400 text-sm text-center animate-pulse">等待传感器授权...</div>
          )}

          {granted && !isFinished && (
            <div className="flex items-center justify-between">
              {/* 已完成的爻 */}
              <div className="flex items-center gap-2">
                {yaoList.map((val, i) => (
                  <LineResultDisplay key={i} value={val} />
                ))}
                {/* 占位符显示剩余爻位 */}
                {Array.from({ length: 6 - yaoList.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200" />
                ))}
              </div>
              {/* 状态文字 */}
              <div className="text-xs text-gray-400">
                {Object.keys(currentResults).length === 3 ? '结算中...' : isShaking ? '摇动中...' : '摇动手机'}
              </div>
            </div>
          )}

          {isFinished && (
            <div className="text-gray-600 text-center animate-pulse">
              卦象已成，正在跳转...
            </div>
          )}
        </div>

        {/* --- 3D Scene Layer --- */}
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.2 }} className="md:rounded-3xl">
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

            <ambientLight intensity={LIGHT_CONFIG.ambient.intensity} />
            <directionalLight
              position={LIGHT_CONFIG.directional.position}
              intensity={LIGHT_CONFIG.directional.intensity}
              color={LIGHT_CONFIG.directional.color}
              castShadow
              shadow-mapSize-width={LIGHT_CONFIG.shadow.mapSize}
              shadow-mapSize-height={LIGHT_CONFIG.shadow.mapSize}
              shadow-camera-far={LIGHT_CONFIG.shadow.cameraFar}
              shadow-camera-left={-LIGHT_CONFIG.shadow.cameraSize}
              shadow-camera-right={LIGHT_CONFIG.shadow.cameraSize}
              shadow-camera-top={LIGHT_CONFIG.shadow.cameraSize}
              shadow-camera-bottom={-LIGHT_CONFIG.shadow.cameraSize}
              shadow-bias={LIGHT_CONFIG.shadow.bias}
            />
            <pointLight
              position={LIGHT_CONFIG.point.position}
              intensity={LIGHT_CONFIG.point.intensity}
              color={LIGHT_CONFIG.point.color}
            />

            <Physics
              gravity={[0, -50, 0]}
              timeStep={1 / 60}
              debug={false}
              paused={!granted || showIntentionGuide}
            >
              {/* 接收阴影的地面 */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <shadowMaterial opacity={LIGHT_CONFIG.shadow.opacity} />
              </mesh>
              <SensorBox isEnabled={granted && !showIntentionGuide} isDebugCamera={false} onShake={handleShake} />
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

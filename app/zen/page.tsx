'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    Sparkles,
    Float,
    useTexture
} from '@react-three/drei';
import * as THREE from 'three';

import { audioManager } from './AudioManager';
import { YaoValue, resolveHexagram, calculateYao } from './IChingLogic';
import Link from 'next/link';
import { getNowParts } from '@/lib/calendar';
import { saveHistory, historyHref } from '@/lib/divinationHistory';
import { ModuleNav } from '../_components/ui/ModuleNav';

// --- 类型定义 ---
// 新增 SPINNING 状态，让出结果的过程更有悬念
type GameState = 'IDLE' | 'CHARGING' | 'SPINNING' | 'RESULT';
type CoinResult = 0 | 1;

// --- 工具函数：震动反馈 ---
const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// --- 新的 UI 组件：支持六爻堆叠 ---
const UIOverlay = ({
    gameState,
    energy,
    lines, // 已经摇出的爻 (最多6个)
    currentResult, // 当前这一次摇出的硬币结果 (用于动画展示)
    onReset,
    resultHref,
    historyError
}: {
    gameState: GameState,
    energy: number,
    lines: YaoValue[],
    currentResult: number[] | null,
    onReset: () => void,
    resultHref: string,
    historyError: string
}) => {

    const isFinished = lines.length === 6 && gameState !== 'CHARGING' && gameState !== 'SPINNING';
    const finalHexagram = isFinished ? resolveHexagram(lines) : null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '30px', color: '#A0A0A0', fontFamily: '"Helvetica Neue", sans-serif', zIndex: 10,
            userSelect: 'none'
        }}>
            {/* 顶部 HUD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.8 }}>
                <span>SYSTEM: {isFinished ? 'COMPLETE' : `LAYER ${lines.length + 1}/6`}</span>
                <span>ENTROPY: {(energy * 100).toFixed(1)}%</span>
            </div>

            {/* --- 核心区域：卦象堆叠器 --- */}
            {/* 放在屏幕右侧或中央，像一个全息投影的数据柱 */}
            <div style={{
                position: 'absolute', top: '50%', right: '10%', transform: 'translateY(-50%)',
                display: 'flex', flexDirection: 'column-reverse', // 关键！从下往上排列
                gap: '15px', alignItems: 'center'
            }}>
                {/* 占位符：如果还没有6爻，显示虚线框 */}
                {Array.from({ length: 6 }).map((_, idx) => {
                    const yao = lines[idx]; // 获取对应层级的爻
                    const isActive = idx === lines.length; // 当前正在摇的层级

                    return (
                        <div key={idx} style={{
                            width: '120px', height: '16px',
                            display: 'flex', justifyContent: 'space-between',
                            opacity: yao ? 1 : 0.2, // 已有爻其实，未有爻虚化
                            transition: 'all 0.5s',
                            filter: yao && (yao === 6 || yao === 9) ? 'drop-shadow(0 0 5px #ff0055)' : 'none' // 变爻发光
                        }}>
                            {/* 渲染阴阳爻图形 */}
                            {!yao ? (
                                // 空槽位状态
                                <div style={{ width: '100%', border: `1px dashed ${isActive ? '#4af2eb' : '#333'}`, borderRadius: '2px' }} />
                            ) : (
                                // 已有结果
                                <>
                                    {/* 阳爻是实线，阴爻是断线 */}
                                    {(yao === 7 || yao === 9) ? (
                                        <div style={{ width: '100%', background: yao === 9 ? '#fff' : '#4af2eb', borderRadius: '2px' }} />
                                    ) : (
                                        <>
                                            <div style={{ width: '45%', background: yao === 6 ? '#fff' : '#4af2eb', borderRadius: '2px' }} />
                                            <div style={{ width: '45%', background: yao === 6 ? '#fff' : '#4af2eb', borderRadius: '2px' }} />
                                        </>
                                    )}

                                    {/* 变爻标记 (动) */}
                                    {(yao === 6 || yao === 9) && (
                                        <span style={{ position: 'absolute', right: '-30px', color: '#ff0055', fontSize: '10px', fontWeight: 'bold' }}>动</span>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- 结果展示面板 (只在第6次摇完后显示) --- */}
            {isFinished && finalHexagram && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', padding: '40px',
                    border: '1px solid #333', backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 1s ease'
                }}>
                    <h1 style={{ color: '#fff', fontSize: '36px', marginBottom: '10px', letterSpacing: '10px' }}>{finalHexagram.name}</h1>
                    <div style={{ width: '50px', height: '2px', background: '#4af2eb', margin: '20px auto' }}></div>
                    <p style={{ color: '#ccc', maxWidth: '300px', lineHeight: '1.6', fontSize: '14px' }}>
                        {finalHexagram.description}
                    </p>
                    {finalHexagram.hasMovingLine && (
                        <p style={{ color: '#ff0055', marginTop: '20px', fontSize: '12px' }}>检测到变爻，未来可能产生变卦。</p>
                    )}
                    {historyError && <p role="alert" className="mt-4 text-xs text-rose-400">{historyError}</p>}
                    <Link href={resultHref} className="mt-5 block text-sm text-cyan-300">查看排盘与 AI 解读 →</Link>
                    <button
                        onClick={onReset}
                        style={{
                            marginTop: '40px', background: 'transparent', border: '1px solid #4af2eb', color: '#4af2eb',
                            padding: '10px 30px', cursor: 'pointer', letterSpacing: '2px'
                        }}>
                        重启观测
                    </button>
                </div>
            )}

            {/* 底部操作提示 */}
            {!isFinished && (
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: '12px', color: '#4af2eb', letterSpacing: '4px', marginBottom: '10px' }}>
                        {lines.length === 0 ? '初爻' :
                            lines.length === 1 ? '二爻' :
                                lines.length === 2 ? '三爻' :
                                    lines.length === 3 ? '四爻' :
                                        lines.length === 4 ? '五爻' : '上爻'} 观测准备
                    </h2>
                    <p style={{ fontSize: '10px', opacity: 0.5 }}>
                        {gameState === 'CHARGING' ? '正在注入能量...' : '长按链接锚点'}
                    </p>
                </div>
            )}
        </div>
    );
};

// --- 2. 3D 物体：赛博铜钱 ---
const CyberCoin = ({
    position,
    gameState,
    energy,
    resultValue
}: {
    position: [number, number, number],
    gameState: GameState,
    energy: number,
    resultValue: CoinResult | null
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const coinMeshRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    // 随机参数，让每个铜钱的抖动不太一样
    const randomSeed = useMemo(() => ({
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI,
        axis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
    }), []);

    useFrame((state, delta) => {
        if (!groupRef.current || !coinMeshRef.current) return;

        const time = state.clock.elapsedTime;

        // --- IDLE: 呼吸悬浮 ---
        if (gameState === 'IDLE') {
            groupRef.current.position.y = position[1] + Math.sin(time * 2 + randomSeed.phase) * 0.05;
            coinMeshRef.current.rotation.x = THREE.MathUtils.lerp(coinMeshRef.current.rotation.x, Math.PI / 2, 0.1);
            coinMeshRef.current.rotation.z += delta * 0.2;
        }

        // --- CHARGING: 指数级震动 ---
        else if (gameState === 'CHARGING') {
            // 震动幅度是能量的平方 (energy^2)，这样后期会非常剧烈
            const shakeIntensity = Math.pow(energy, 2.5) * 0.3;

            groupRef.current.position.x = position[0] + (Math.random() - 0.5) * shakeIntensity;
            groupRef.current.position.y = position[1] + (Math.random() - 0.5) * shakeIntensity;
            groupRef.current.position.z = position[2] + (Math.random() - 0.5) * shakeIntensity;

            // 疯狂随机旋转
            coinMeshRef.current.rotation.x += delta * (5 + energy * 20);
            coinMeshRef.current.rotation.y += delta * (5 + energy * 20);
        }

        // --- SPINNING: 惯性空转 (悬念阶段) ---
        else if (gameState === 'SPINNING') {
            // 快速沿着X轴转动
            coinMeshRef.current.rotation.x += delta * 15; // 保持高速
            // 慢慢归位位置
            groupRef.current.position.lerp(new THREE.Vector3(...position), 0.05);
        }

        // --- RESULT: 阻尼定格 ---
        else if (gameState === 'RESULT') {
            // 目标角度：1(阳/字)=4PI, 0(阴/背)=5PI
            const targetRot = resultValue === 1 ? Math.PI * 4 : Math.PI * 5;

            // 使用更平滑的插值，模拟重物落下的阻尼感
            // 这里的 0.025 比之前的 0.05 更小，定格过程更慢、更优雅
            coinMeshRef.current.rotation.x = THREE.MathUtils.lerp(coinMeshRef.current.rotation.x, targetRot, 0.04);

            // 修正其他轴的旋转，使其正对屏幕
            coinMeshRef.current.rotation.y = THREE.MathUtils.lerp(coinMeshRef.current.rotation.y, 0, 0.05);
            coinMeshRef.current.rotation.z = THREE.MathUtils.lerp(coinMeshRef.current.rotation.z, 0, 0.05);
        }

        // 外部磁场环
        if (ringRef.current) {
            ringRef.current.rotation.z -= delta * (0.5 + energy * 5);
            // 能量高时，磁场环也会变大
            const scale = 1 + energy * 0.2;
            ringRef.current.scale.set(scale, scale, scale);
        }
    });

    const glowColor = new THREE.Color("#4af2eb").lerp(new THREE.Color("#ff0055"), Math.pow(energy, 3));

    return (
        <group ref={groupRef} position={position}>
            <group ref={coinMeshRef} rotation={[Math.PI / 2, 0, 0]}>
                {/* 铜钱主体 */}
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[1, 1, 0.1, 64]} />
                    <meshPhysicalMaterial
                        color="#5c4d3c" roughness={0.3} metalness={0.9}
                        clearcoat={0.8} clearcoatRoughness={0.2}
                    />
                </mesh>
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.45, 0.45, 0.12]} />
                    <meshBasicMaterial color="#000" />
                </mesh>

                {/* 发光电路 (阳面) */}
                <group position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <mesh>
                        <ringGeometry args={[0.6, 0.65, 64]} />
                        <meshBasicMaterial color={glowColor} toneMapped={false} />
                    </mesh>
                    <mesh rotation={[0, 0, Math.PI / 4]}>
                        <ringGeometry args={[0.75, 0.76, 64]} />
                        <meshBasicMaterial color={glowColor} toneMapped={false} opacity={0.5 + energy} transparent />
                    </mesh>
                </group>
            </group>

            {/* 磁场环 */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.4, 0.02, 16, 100]} />
                <meshBasicMaterial color={energy > 0.8 ? "#ff0055" : "#D4AF37"} transparent opacity={0.3 + energy} toneMapped={false} />
            </mesh>
        </group>
    );
};

// --- 3. 场景组件 ---
const Scene = ({ gameState, energy, coinResults }: { gameState: GameState, energy: number, coinResults: CoinResult[] }) => {
    return (
        <>
            <fog attach="fog" args={['#050505', 8, 30]} />
            <ambientLight intensity={0.2} />
            <spotLight
                position={[5, 5, 5]} angle={0.5} penumbra={1} castShadow
                intensity={2 + energy * 20} // 光照随能量剧烈增强
                color={energy > 0.9 ? "#ffaa00" : "#ffaa00"}
            />
            <pointLight position={[-5, -2, -5]} intensity={3 + energy * 10} color="#00ffff" distance={10} />

            <Sparkles
                count={energy > 0.5 ? 400 : 200}
                scale={15}
                size={2 + energy * 5}
                speed={0.4 + energy * 5}
                opacity={0.4 + energy}
                color={energy > 0.8 ? "#ff0055" : "#4af2eb"}
            />

            <group position={[0, 0, 0]}>
                <CyberCoin position={[0, 1.8, 0]} gameState={gameState} energy={energy} resultValue={coinResults[0] ?? null} />
                <CyberCoin position={[0, 0, 0]} gameState={gameState} energy={energy} resultValue={coinResults[1] ?? null} />
                <CyberCoin position={[0, -1.8, 0]} gameState={gameState} energy={energy} resultValue={coinResults[2] ?? null} />
            </group>

            <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={2 * Math.PI / 3} />
        </>
    );
};

// --- 4. 主入口：整合所有逻辑 ---
export default function ZenDivinationApp() {
  // --- 状态管理 ---
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [energy, setEnergy] = useState(0);
  
  // 核心数据：记录六爻的结果数组 (0-5, 从初爻到上爻)
  const [lines, setLines] = useState<YaoValue[]>([]); 
  const [resultHref, setResultHref] = useState('/result');
  const [historyError, setHistoryError] = useState('');
  
  // 视觉数据：当前这一扔的 3 枚铜钱状态 (0=阴/背, 1=阳/字)
  const [currentCoinResult, setCurrentCoinResult] = useState<[0|1, 0|1, 0|1] | null>(null);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null); // 充电定时器
  const lastHapticRef = useRef<number>(0); // 震动节流阀

  // --- 初始化：用户交互时激活 AudioContext ---
  useEffect(() => {
    const handleInteraction = () => {
      audioManager.init();
      // 移除监听，避免重复调用
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // --- 动作 1: 开始注能 (按下) ---
  const startCharging = () => {
    // 阻断逻辑：如果已经出了结果(6爻满)，或者正在扔的过程中，不响应
    if (lines.length >= 6) return;
    if (gameState === 'RESULT' || gameState === 'SPINNING') return;

    setGameState('CHARGING');
    
    // 启动声音引擎
    audioManager.startCharging();
    
    // 启动能量循环 (约 60FPS)
    timerRef.current = setInterval(() => {
      setEnergy((prev) => {
        // 能量增长速率：越往后越慢，增加张力
        const next = prev + 0.006; 

        // A. 实时更新声音参数 (频率随能量爬升)
        audioManager.updateCharging(next);

        // B. 实时触觉反馈 (带节流阀的震动)
        const now = Date.now();
        // 能量越低间隔越长(200ms)，能量越高间隔越短(50ms)
        const minInterval = 200 - (prev * 150); 
        
        if (now - lastHapticRef.current > minInterval) {
          // 震动时长也随能量增加
          const duration = 10 + Math.floor(prev * 30);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(duration);
          }
          lastHapticRef.current = now;
        }

        return next >= 1 ? 1 : next;
      });
    }, 16);
  };

  // --- 动作 2: 释放能量 (松手) ---
  const releaseCharge = () => {
    if (gameState !== 'CHARGING') return;
    
    // 清理定时器
    if (timerRef.current) clearInterval(timerRef.current);
    
    // 停止注能声音 (Fade out)
    audioManager.stopCharging();

    // 判断能量阈值 (门槛设为 15% 即可，太高了摇6次会很累)
    if (energy > 0.15) {
      // 成功：触发强烈震动并开始投掷
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 30, 80]); // 哒-哒-嗡！
      }
      castCoins();
    } else {
      // 失败：能量不足，回退到 IDLE
      setGameState('IDLE');
      setEnergy(0);
    }
  };

  // --- 动作 3: 投掷与演算 (核心逻辑) ---
  const castCoins = () => {
    setGameState('SPINNING');
    
    // 1. 生成 3 枚铜钱的随机正反 (0 或 1)
    const coins: [0|1, 0|1, 0|1] = [
      Math.random() > 0.5 ? 1 : 0,
      Math.random() > 0.5 ? 1 : 0,
      Math.random() > 0.5 ? 1 : 0,
    ];
    
    // 更新 3D 场景显示
    setCurrentCoinResult(coins);

    // 2. 延时出结果 (给 3D 旋转留出时间)
    setTimeout(() => {
      setGameState('RESULT');
      
      // 播放“定格”音效 (金属撞击声)
      audioManager.playImpact();
      // 定格微震
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      
      // 3. 命理算法：计算本爻的值 (6/7/8/9)
      const yaoValue = calculateYao(coins);
      const completed = [...lines, yaoValue];
      if (completed.length === 6) {
        const { date, time } = getNowParts();
        try {
          const record = saveHistory({ module: 'liuyao', lines: completed, datePart: date, timePart: time });
          setResultHref(historyHref(record));
        } catch (error) {
          setHistoryError(error instanceof Error ? error.message : '保存失败');
          setResultHref(`/result?${new URLSearchParams({ lines: completed.join(','), date, time, unsaved: '1' })}`);
        }
      }
      
      // 4. 将结果推入数组 (堆叠 UI 会自动更新)
      setLines((prev) => [...prev, yaoValue]);
      
      // 5. 流程控制：
      // 如果还没摇满 6 次，1.5秒后自动重置，准备摇下一爻
      // 这里的 lines 是闭包时的旧值，所以判断 lines.length < 5 意味着加上刚摇的这次刚好是 6
      if (lines.length < 5) {
         setTimeout(() => {
           setGameState('IDLE');
           setEnergy(0);
           // 注意：这里不要清空 lines，只重置能量和状态
         }, 1500);
      }
      // 如果 lines.length === 5，说明这是第6次，保持 RESULT 状态，显示最终大弹窗
      
    }, 1200); // 1.2秒的悬念旋转时间
  };

  // --- 动作 4: 重置整个盘面 ---
  const resetGame = () => {
    setLines([]); // 清空所有卦象
    setGameState('IDLE');
    setEnergy(0);
    setCurrentCoinResult(null);
    setHistoryError('');
    setResultHref('/result');
  };

  return (
    <div 
      style={{ 
        width: '100vw', height: '100vh', 
        background: '#050505', overflow: 'hidden', 
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' // 禁止默认触摸行为
      }}
      onPointerDown={startCharging}
      onPointerUp={releaseCharge}
      onPointerLeave={releaseCharge} // 移出屏幕视为松手
      onContextMenu={(e) => e.preventDefault()} // 禁止右键菜单干扰
    >
      {/* UI 层：传递 lines 数组用于渲染堆叠动画 */}
      <div className="absolute left-4 top-14 z-20" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}><ModuleNav active="liuyao" /></div>
      <UIOverlay 
        gameState={gameState} 
        energy={energy} 
        lines={lines} 
        currentResult={currentCoinResult}
        onReset={resetGame}
        resultHref={resultHref}
        historyError={historyError}
      />
      
      {/* 3D 层 */}
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 9], fov: 45 }}
        dpr={[1, 2]} // 适配高分屏
      >
        <Scene 
          gameState={gameState} 
          energy={energy} 
          // 如果还没有结果，传默认值 [0,0,0] 防止报错
          coinResults={currentCoinResult || [0,0,0]} 
        />
      </Canvas>
    </div>
  );
}

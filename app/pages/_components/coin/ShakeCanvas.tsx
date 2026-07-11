'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';

import { Coin } from '../../../_components/canvas/Coin';
import { SensorBox } from '../../../_components/canvas/SensorBox';
import { useSensorPermission } from '../../../_hooks/useSensorPermission';
import { LIGHT_CONFIG } from '../../../_lib/sceneConfig';
import type { YaoValue } from '../../../../lib/LiuYaoEngine';

type Mode = 'mobile-shake' | 'mobile-permission' | 'desktop';

type SceneName = 'obsidian' | 'daylight';

/**
 * 场景配色：obsidian —— /pages 的深色舞台；daylight —— 与原产品（/ 首页）
 * 同一套背景 + 灯光，数值直接取自 LIGHT_CONFIG，那边调整这边跟着变。
 */
const SCENES: Record<SceneName, {
  bg: string;
  exposure: number;
  lightformer: { intensity: number; color: string };
  ambient: { intensity: number; color: string };
  directional: { position: [number, number, number]; intensity: number; color: string };
  point: { position: [number, number, number]; intensity: number; color: string };
  shadowOpacity: number;
}> = {
  obsidian: {
    bg: '#11161f',
    exposure: 1.05,
    lightformer: { intensity: 1.0, color: '#b5c0d2' },
    ambient: { intensity: 0.42, color: '#4a556b' },
    directional: { position: [8, 14, 6], intensity: 1.0, color: '#e8eef5' },
    point: { position: [-3, 5, 3], intensity: 0.8, color: '#d8ff14' },
    shadowOpacity: 0.45,
  },
  daylight: {
    bg: '#f8f8f8',
    exposure: 1.2,
    lightformer: { intensity: 2, color: '#ffffff' },
    ambient: { intensity: LIGHT_CONFIG.ambient.intensity, color: '#ffffff' },
    directional: {
      position: LIGHT_CONFIG.directional.position,
      intensity: LIGHT_CONFIG.directional.intensity,
      color: LIGHT_CONFIG.directional.color,
    },
    point: {
      position: LIGHT_CONFIG.point.position,
      intensity: LIGHT_CONFIG.point.intensity,
      color: LIGHT_CONFIG.point.color,
    },
    shadowOpacity: LIGHT_CONFIG.shadow.opacity,
  },
};

interface ShakeCanvasProps {
  resetSignal: number;
  latestYao: YaoValue | null;
  onShake: () => void;
  onCoinSettle: (id: string, result: '阳' | '阴' | '侧立') => void;
  onReset: () => void;
  scene?: SceneName;
}

// 与 coin-physics.js 设计原文一致的爻名 / 符号映射
const YAO_MAP: Record<YaoValue, { mark: string; yao: string; note: string }> = {
  6: { mark: '⚋ ○', yao: '老阴', note: '动 · 阴变阳' },
  7: { mark: '⚊',   yao: '少阳', note: '静 · 阳' },
  8: { mark: '⚋',   yao: '少阴', note: '静 · 阴' },
  9: { mark: '⚊ ○', yao: '老阳', note: '动 · 阳变阴' },
};

/**
 * 设备能力检测 —— SSR 时给 false（desktop 态占位避免 hydration 闪烁），
 * 挂载后 effect 读真实值再切到 true。
 *
 * 检测策略：只看触屏能力 (`ontouchstart` 或 `maxTouchPoints`)。
 * 不再依赖 `DeviceMotionEvent` 构造器是否存在 —— 桌面浏览器也会定义它，
 * 而且 Chrome Android 在 HTTP 下虽然定义了但事件不触发，检测不准。
 * 触屏判定足够区分"应该展示 canvas"与"应该展示请用移动设备"。
 */
function useShakeCapable(): boolean {
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
    setCapable(hasTouch);
  }, []);
  return capable;
}

/**
 * Project II 主 cell：R3F 三枚硬币 canvas + 顶部 hint + 底部 attempt 计数 + RE-THROW。
 * 在 cell 内部根据设备能力分三种态：
 *   - desktop          : 显示"请用移动设备"提示，canvas 不渲染
 *   - mobile-permission: 显示授权按钮（iOS 13+）
 *   - mobile-shake     : 正常渲染 R3F 摇卦
 *
 * 复用 /app 根目录的 Coin / SensorBox / CoinMesh，不动这些文件。
 * 灯光底色由 scene prop 决定（见 SCENES），默认 obsidian 深色舞台。
 */
export function ShakeCanvas({ resetSignal, latestYao, onShake, onCoinSettle, onReset, scene = 'obsidian' }: ShakeCanvasProps) {
  const { granted, showButton, requestPermission } = useSensorPermission();
  const isShakeCapable = useShakeCapable();
  const rig = SCENES[scene];

  const mode: Mode = !isShakeCapable
    ? 'desktop'
    : showButton
      ? 'mobile-permission'
      : 'mobile-shake';

  return (
    <div className="cell main placeholder" id="coin-cell">
      <span className="corner">FIG · 01 &nbsp;·&nbsp; LIVE</span>

      <div className="coin-demo">
        {mode === 'desktop' && (
          <div className="desktop-prompt">
            <div className="icon" aria-hidden="true" />
            <div className="label">INSTRUMENT · MOBILE REQUIRED</div>
            <div className="msg">请用移动设备进行<em>晃动</em></div>
          </div>
        )}

        {mode === 'mobile-permission' && (
          <div className="perm-overlay">
            <div className="ttl">— SENSOR · PERMISSION —</div>
            <button onClick={requestPermission}>授权摇动</button>
          </div>
        )}

        {mode !== 'desktop' && (
          <>
            {/* 与 B-obsidian 设计的 hint 文案保留同一行内格式，仅按交互
                由"点击 / TAP"改为"摇动 / SHAKE"——本项目改 sensor 触发后必需 */}
            <div className="hint">摇动 / SHAKE 投出三枚铜钱</div>

            <div className="canvas-host">
              <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true, toneMappingExposure: rig.exposure }}
                style={{ background: rig.bg }}
              >
                <Suspense fallback={null}>
                  <color attach="background" args={[rig.bg]} />

                  {/* 环境光 strip —— 给铜钱金属面留软高光 */}
                  <Environment resolution={256}>
                    <group rotation={[-Math.PI / 2, 0, 0]}>
                      {[...Array(5)].map((_, i) => (
                        <Lightformer
                          key={i}
                          intensity={rig.lightformer.intensity}
                          rotation-x={Math.PI / 2}
                          position={[0, 4, (i - 2) * 3]}
                          scale={[10, 1, 1]}
                          color={rig.lightformer.color}
                        />
                      ))}
                    </group>
                  </Environment>

                  <ambientLight intensity={rig.ambient.intensity} color={rig.ambient.color} />
                  <directionalLight
                    position={rig.directional.position}
                    intensity={rig.directional.intensity}
                    color={rig.directional.color}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-camera-far={50}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                    shadow-bias={-0.0001}
                  />
                  {/* 点光 —— obsidian 时是 acid brand 色落在铜钱边沿，daylight 时为白 */}
                  <pointLight position={rig.point.position} intensity={rig.point.intensity} color={rig.point.color} />

                  <Physics gravity={[0, -50, 0]} timeStep={1 / 60}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                      <planeGeometry args={[30, 30]} />
                      <shadowMaterial opacity={rig.shadowOpacity} />
                    </mesh>
                    <SensorBox isEnabled={granted && mode === 'mobile-shake'} isDebugCamera={false} onShake={onShake} />
                    <Coin id="COIN-01" position={[-1.2, 0.5, 0.2]} onSettle={onCoinSettle} resetSignal={resetSignal} />
                    <Coin id="COIN-02" position={[0,    0.8, -0.5]} onSettle={onCoinSettle} resetSignal={resetSignal} />
                    <Coin id="COIN-03" position={[1.2,  0.6, -0.1]} onSettle={onCoinSettle} resetSignal={resetSignal} />
                  </Physics>
                </Suspense>
              </Canvas>
            </div>

            {/* canvas 底左：最近一次结算的爻 —— 粗体部分是 acid mono（与设计 .result b 一致） */}
            <div className="result">
              {latestYao != null ? (
                <>
                  <span>{YAO_MAP[latestYao].mark}</span>
                  <b>{YAO_MAP[latestYao].yao} · {YAO_MAP[latestYao].note}</b>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
            <button className="replay" onClick={onReset}>RE-THROW</button>
          </>
        )}
      </div>
    </div>
  );
}

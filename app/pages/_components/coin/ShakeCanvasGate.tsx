'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { YaoValue } from '../../../../lib/LiuYaoEngine';

/**
 * §04 主 cell —— ShakeCanvas 的"门"。
 *
 * R3F + GLB + Rapier 加起来体积可观，对于一个不一定会去摇卦的访客来说不值得在
 * 首屏就拉进去。这里把 ShakeCanvas 做成 lazy chunk，**用户明确点击**才挂载；
 * 离开 §04（DestinyGuidance）后延迟 unmount 释放 WebGL context。
 *
 * - 状态保留：`yaoList` 在父级 ProjectII，gate 卸的只是 Canvas，回来 hex 面板
 *   仍然显示之前掷出的爻。`yaoCount > 0` 时按钮文案切换为 "TAP TO CONTINUE"。
 * - 卸载防抖：监听 `obs:section-enter`，离开 §04 后 800ms 才真正 unmount，
 *   期间若用户回拉到 §04 取消计时。
 * - 缓存：`next/dynamic` 第二次进入命中浏览器 chunk cache；`useGLTF` 是
 *   module-scope 缓存，模型不会重新下载/解析，只重建 WebGL context + GPU buffer。
 */

const DESTINY_IDX = 3;
const UNMOUNT_DELAY_MS = 800;

const ShakeCanvasLazy = dynamic(
  () => import('./ShakeCanvas').then(m => ({ default: m.ShakeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="cell main placeholder shake-gate is-loading" id="coin-cell">
        <span className="corner">FIG · 01 &nbsp;·&nbsp; LIVE</span>
        <div className="shake-gate-inner">
          <GateGlyph />
          <div className="shake-gate-label">LOADING…</div>
          <div className="shake-gate-cn">载入物理引擎</div>
        </div>
      </div>
    ),
  },
);

interface Props {
  resetSignal: number;
  latestYao: YaoValue | null;
  onShake: () => void;
  onCoinSettle: (id: string, result: '阳' | '阴' | '侧立') => void;
  onReset: () => void;
  yaoCount: number;
  /** 透传 ShakeCanvas 的场景配色，v2 白底页用 daylight */
  scene?: 'obsidian' | 'daylight';
}

export function ShakeCanvasGate({ yaoCount, ...canvasProps }: Props) {
  const [mounted, setMounted] = useState(false);

  // 仅当 Canvas 已挂载时才需要监听 section 变化以决定何时卸载
  useEffect(() => {
    if (!mounted) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onEnter(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.idx !== 'number') return;
      if (detail.idx === DESTINY_IDX) {
        if (timer) { clearTimeout(timer); timer = null; }
      } else {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setMounted(false), UNMOUNT_DELAY_MS);
      }
    }

    window.addEventListener('obs:section-enter', onEnter);
    return () => {
      window.removeEventListener('obs:section-enter', onEnter);
      if (timer) clearTimeout(timer);
    };
  }, [mounted]);

  if (mounted) {
    return <ShakeCanvasLazy {...canvasProps} />;
  }

  const hasProgress = yaoCount > 0;
  return (
    <button
      type="button"
      className="cell main placeholder shake-gate"
      id="coin-cell"
      onClick={() => setMounted(true)}
      aria-label={hasProgress ? '继续摇卦' : '开始摇卦'}
    >
      <span className="corner">FIG · 01 &nbsp;·&nbsp; LIVE</span>
      <div className="shake-gate-inner">
        <GateGlyph />
        <div className="shake-gate-label">{hasProgress ? 'TAP TO CONTINUE' : 'TAP TO CAST'}</div>
        <div className="shake-gate-cn">
          {hasProgress ? `已掷 ${yaoCount} 爻 · 点击继续` : '点击 · 摇三枚铜钱起卦'}
        </div>
      </div>
    </button>
  );
}

/** 三枚方孔铜钱抽象 —— 与"摇硬币起卦"主题对齐 */
function GateGlyph() {
  return (
    <div className="shake-gate-glyph" aria-hidden="true">
      <svg viewBox="0 0 64 24" width="120" height="44">
        {[10, 32, 54].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy={12} r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x={cx - 3} y={9} width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </g>
        ))}
      </svg>
    </div>
  );
}

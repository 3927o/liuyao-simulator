'use client';

import { useEffect, useState } from 'react';

/**
 * 简化的 Tweaks 面板：只控制 --acid 单色。
 * 与 B-obsidian 一致的 17 色精选 swatch（DESIGN-NOTES §9）。
 * 切换时同步更新 --acid / --acid-glow 两个 CSS 变量。
 */

const PALETTES: { id: string; name: string }[] = [
  { id: '#ff4439', name: '朱砂 Vermillion' },
  { id: '#ff5a00', name: '炽橙 Hot Orange' },
  { id: '#fff200', name: '硫黄 Sulfur' },
  { id: '#ffcf3a', name: '钠黄 Sodium' },
  { id: '#eaff00', name: '黄绿 Pure Chartreuse' },
  { id: '#d8ff14', name: '电黄绿 Electric Chartreuse' },
  { id: '#c8ff3a', name: '青黄 Lime-Yellow' },
  { id: '#b8ff3a', name: '酸柠 Acid Lime' },
  { id: '#00ff88', name: '春绿 Spring Green' },
  { id: '#00fff0', name: '霓青 Hyper Cyan' },
  { id: '#3dcfff', name: '电青 Electric Cyan' },
  { id: '#8eb6ff', name: '冰青 Ice Blue' },
  { id: '#1f6bff', name: '霓蓝 Neon Blue' },
  { id: '#9d3aff', name: '电紫 Electric Violet' },
  { id: '#ff2bd0', name: '霓粉 Hyper Pink' },
  { id: '#ff3a8c', name: '桃 Magenta' },
  { id: '#ede4d3', name: '骨白 Bone White' },
];

const STORAGE_KEY = 'obs-acid-v1';

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function TweaksPanel() {
  // useState lazy initializer: localStorage hydration runs once at mount without
  // a separate useEffect → no "setState in effect" cascade.
  const [acid, setAcid] = useState<string>(() => {
    if (typeof window === 'undefined') return PALETTES[5].id;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && PALETTES.some(p => p.id === stored) ? stored : PALETTES[5].id;
  });
  const [open, setOpen] = useState(false);

  // apply on every change —— 必须挂在 documentElement 而不是 .obsidian-root，
  // 否则文章 Reader（portal 到 body）拿不到变更（详见 styles.css :root 注释）
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--acid', acid);
    root.style.setProperty('--acid-glow', hexToRgba(acid, 0.18));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, acid);
      window.dispatchEvent(new CustomEvent('accentchange', { detail: acid }));
    }
  }, [acid]);

  const current = PALETTES.find(p => p.id === acid) ?? PALETTES[0];

  return (
    <div className="obs-tweaks" data-open={open ? '1' : ''}>
      <div className="hd" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}>
        <b>TWEAKS · 色彩</b>
        <span className="caret">▾</span>
      </div>
      <div className="body">
        <div className="row">
          <div className="lbl">ACCENT — 主色</div>
          <div className="name">{current.name}</div>
        </div>
        <div className="swatches">
          {PALETTES.map(p => (
            <button
              key={p.id}
              data-on={p.id === acid ? '1' : ''}
              onClick={() => setAcid(p.id)}
              title={p.name}
              aria-label={p.name}
              style={{ color: p.id }}
            >
              <span className="dot" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

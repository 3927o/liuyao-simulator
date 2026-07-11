'use client';

import { useEffect, useState } from 'react';

/**
 * Tweaks 面板：THEME（整套 bg/ink/rule tokens）+ ACCENT（单色 --acid）。
 *
 * THEME 挂在 documentElement 的 data-theme：obsidian（默认）/ graphite / paper。
 * styles.css 里通过 html[data-theme=…] 覆盖 .obsidian-root 和 .obs-reader
 * 上的 tokens（reader 是 portal 到 body 外的，必须单独 hit）。
 *
 * ACCENT 通过 documentElement.style 直接 setProperty --acid / --acid-glow —— reader
 * 拿到的 --acid 也从 :root 继承，同一份。
 *
 * 切主题时同步替换 accent 为该主题的推荐默认色（避免白底配酸绿的撞色）。
 */

type ThemeId = 'obsidian' | 'graphite' | 'paper';

const THEMES: {
  id: ThemeId;
  name: string;
  accent: string;
  swatch: { bg: string; ink: string; rule: string };
}[] = [
  {
    id: 'obsidian',
    name: '黑曜石',
    accent: '#d8ff14',
    swatch: { bg: '#0a0d12', ink: '#e8eef5', rule: '#232c3c' },
  },
  {
    id: 'graphite',
    name: '石墨',
    accent: '#ede4d3',
    swatch: { bg: '#111111', ink: '#ededed', rule: '#2f2f2f' },
  },
  {
    id: 'paper',
    name: '纸白',
    accent: '#1f3a8a',
    swatch: { bg: '#ffffff', ink: '#171717', rule: '#d4d4d4' },
  },
];

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
  { id: '#1f3a8a', name: '墨蓝 Ink Blue' },
  { id: '#9d3aff', name: '电紫 Electric Violet' },
  { id: '#ff2bd0', name: '霓粉 Hyper Pink' },
  { id: '#ff3a8c', name: '桃 Magenta' },
  { id: '#171717', name: '墨黑 Ink Black' },
  { id: '#ede4d3', name: '骨白 Bone White' },
];

const ACID_KEY = 'obs-acid-v1';
const THEME_KEY = 'obs-theme-v1';

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function TweaksPanel() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return 'obsidian';
    const stored = window.localStorage.getItem(THEME_KEY) as ThemeId | null;
    return stored && THEMES.some(t => t.id === stored) ? stored : 'obsidian';
  });
  const [acid, setAcid] = useState<string>(() => {
    if (typeof window === 'undefined') return THEMES[0].accent;
    const stored = window.localStorage.getItem(ACID_KEY);
    if (stored) return stored;
    // 首次访问：跟随 theme 的默认 accent
    const t = window.localStorage.getItem(THEME_KEY) as ThemeId | null;
    return THEMES.find(x => x.id === t)?.accent ?? THEMES[0].accent;
  });
  const [open, setOpen] = useState(false);

  // 应用 theme：documentElement.data-theme + 持久化
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'obsidian') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // 应用 accent：挂 documentElement 而不是 .obsidian-root，
  // 否则文章 Reader（portal 到 body）拿不到（详见 styles.css :root 注释）
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--acid', acid);
    root.style.setProperty('--acid-glow', hexToRgba(acid, 0.18));
    window.localStorage.setItem(ACID_KEY, acid);
    window.dispatchEvent(new CustomEvent('accentchange', { detail: acid }));
  }, [acid]);

  // 切 theme 时同步把 accent 换成该 theme 的推荐色
  const pickTheme = (id: ThemeId) => {
    setTheme(id);
    const next = THEMES.find(t => t.id === id);
    if (next) setAcid(next.accent);
  };

  const currentAcid = PALETTES.find(p => p.id === acid);

  return (
    <div className="obs-tweaks" data-open={open ? '1' : ''}>
      <div className="hd" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}>
        <b>TWEAKS</b>
        <span className="caret">▾</span>
      </div>
      <div className="body">
        <div className="row">
          <div className="lbl">THEME — 主题</div>
          <div className="themes">
            {THEMES.map(t => (
              <button
                key={t.id}
                data-on={t.id === theme ? '1' : ''}
                onClick={() => pickTheme(t.id)}
                title={t.name}
                aria-label={t.name}
              >
                <span
                  className="chip-preview"
                  style={{ borderColor: t.swatch.rule }}
                >
                  <span style={{ background: t.swatch.bg }} />
                  <span style={{ background: t.swatch.ink }} />
                  <span style={{ background: t.accent }} />
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="lbl">ACCENT — 主色</div>
          <div className="name">{currentAcid?.name ?? '— 自定义 —'}</div>
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

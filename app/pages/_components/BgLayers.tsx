'use client';

import React, { useEffect, useRef } from 'react';

/**
 * 三层背景：12 列细网格 + 1px 印版边框 + 两层 noise 颗粒（白/酸）。
 * 鼠标移动时给 hero 区域内的 spotlight 和 noise 一个轻微的位移，
 * 在 mobile 上随滚动反向漂浮（B-obsidian §index.html 行 2730 行后的脚本对齐）。
 */
export function BgLayers() {
  const noiseARef = useRef<HTMLDivElement>(null);
  const noiseBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = noiseARef.current;
    const b = noiseBRef.current;
    if (!a || !b) return;

    const hero = document.querySelector<HTMLElement>('.obsidian-root .hero');
    const spot = document.querySelector<HTMLElement>('.obsidian-root .spotlight');

    function onMove(e: MouseEvent) {
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      if (spot) {
        spot.style.left = `${x * 100}%`;
        spot.style.top = `${y * 100}%`;
      }
      const dx = (x - 0.5) * 16;
      const dy = (y - 0.5) * 16;
      if (a) a.style.transform = `translate(${dx}px, ${dy}px)`;
      if (b) b.style.transform = `translate(${-dx * 0.7}px, ${-dy * 0.7}px)`;
    }

    hero?.addEventListener('mousemove', onMove);

    let scrollHandler: ((this: Window, ev: Event) => void) | null = null;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
      scrollHandler = () => {
        const o = window.scrollY * 0.04;
        if (a) a.style.transform = `translateY(${-o}px)`;
        if (b) b.style.transform = `translateY(${o}px)`;
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
    }

    return () => {
      hero?.removeEventListener('mousemove', onMove);
      if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return (
    <>
      <div className="grid-overlay" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} />)}
      </div>
      <div className="page-frame" aria-hidden="true" />
      <div className="noise" ref={noiseARef} />
      <div className="noise tint" ref={noiseBRef} />
    </>
  );
}

'use client';

import { useEffect, useRef } from 'react';

/**
 * §转场 · Cinematic Frame Advance —— 杂志章节卡（3 行）
 *
 * 监听 `obs:section-enter` 事件，全屏黑底上 punch 入场以下结构：
 *   §XX · NN MIN      （mono small kicker）
 *   ──────             （acid 短线）
 *   ENGLISH NAME       （serif italic 大号 acid）
 *   中文名              （serif 中号 ink）
 *
 * 仅在真章节变更时点燃（SnapDriver isChange 把关）；
 * 安全：`prefers-reduced-motion: reduce` 时整个 effect noop。
 */

type Label = { num: string; en: string; cn: string; read: string };

// 用 idx 检索 —— 与 [data-section] 的 DOM 顺序对齐
const SECTION_LABELS: Label[] = [
  { num: '§01', en: 'POSITION STATEMENT', cn: '构建产品的人', read: '01 MIN' },
  { num: '§02', en: 'CREDO & SELF',       cn: '信条',         read: '04 MIN' },
  { num: 'INTERLUDE', en: 'THE WORKS',    cn: '作品序',       read: '01 MIN' },
  { num: '§03', en: 'ReadTailor',         cn: '读裁',         read: '04 MIN' },
  { num: '§04', en: 'DestinyGuidance',    cn: '起卦',         read: '04 MIN' },
  { num: '§05', en: 'THINKING ALOUD',     cn: '我在想的问题', read: '03 MIN' },
  { num: '§06', en: 'ARTICLES',           cn: '文章',         read: '02 MIN' },
  { num: '§07', en: 'A MUTUAL FILTER',    cn: '我们是否合适', read: '02 MIN' },
  { num: '§08', en: 'FIN',                cn: '终',           read: '01 MIN' },
];

export function FxCinematicFlash() {
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flash = flashRef.current;
    if (!flash) return;
    if (typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    function onEnter(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.idx !== 'number') return;
      const label = SECTION_LABELS[detail.idx];
      if (!label) return;

      const numEl  = flash!.querySelector<HTMLDivElement>('.fx-flash-num');
      const readEl = flash!.querySelector<HTMLDivElement>('.fx-flash-read');
      const enEl   = flash!.querySelector<HTMLDivElement>('.fx-flash-en');
      const cnEl   = flash!.querySelector<HTMLDivElement>('.fx-flash-cn');
      if (numEl)  numEl.textContent  = label.num;
      if (readEl) readEl.textContent = label.read;
      if (enEl)   enEl.textContent   = label.en;
      if (cnEl)   cnEl.textContent   = label.cn;

      flash!.classList.remove('show');
      void flash!.offsetWidth; // 强制 reflow 重置动画
      flash!.classList.add('show');
    }

    window.addEventListener('obs:section-enter', onEnter);
    return () => window.removeEventListener('obs:section-enter', onEnter);
  }, []);

  return (
    <div className="fx-cinematic-flash" ref={flashRef} aria-hidden="true">
      <div className="fx-flash-bg" />
      <div className="fx-flash-card">
        <div className="fx-flash-kicker">
          <span className="fx-flash-num">§01</span>
          <span className="fx-flash-sep">·</span>
          <span className="fx-flash-read">01 MIN</span>
        </div>
        <div className="fx-flash-rule" />
        <div className="fx-flash-en">POSITION STATEMENT</div>
        <div className="fx-flash-cn">构建产品的人</div>
      </div>
    </div>
  );
}

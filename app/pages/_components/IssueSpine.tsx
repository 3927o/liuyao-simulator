'use client';

import { useEffect, useRef } from 'react';

/**
 * §C1 · 右侧 issue spine —— 移动端独占（CSS @media 控显隐）。
 *
 * IntersectionObserver 跟踪 hero/credo/p1/p2/thinking/articles/filter 七个章节，
 * 当前章对应小圆点放大并染 --acid；点击跳转 + 触觉震动。
 *
 * 桌面端 CSS 直接 display: none，所以观察器只在移动端有视觉效果，但 IO 自身
 * 在桌面也运行（无害）——避免再写一份 matchMedia gate。
 */

const TARGETS: { id: string; num: string }[] = [
  { id: 'hero',     num: '01' },
  { id: 'credo',    num: '02' },
  { id: 'p1',       num: '03' },
  { id: 'p2',       num: '04' },
  { id: 'thinking', num: '05' },
  { id: 'articles', num: '06' },
  { id: 'filter',   num: '07' },
];

export function IssueSpine() {
  const spineRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
    const links = Array.from(spine.querySelectorAll<HTMLAnchorElement>('a[data-target]'));
    const targets = links
      .map(a => ({ a, el: document.getElementById(a.dataset.target!) }))
      .filter((t): t is { a: HTMLAnchorElement; el: HTMLElement } => t.el != null);
    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(a => a.classList.toggle('active', a.dataset.target === e.target.id));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach(t => io.observe(t.el));

    return () => io.disconnect();
  }, []);

  return (
    <aside className="issue-spine" id="issueSpine" aria-hidden="true" ref={spineRef}>
      {TARGETS.map(t => (
        <a
          key={t.id}
          data-target={t.id}
          onClick={(e) => {
            e.preventDefault();
            // 走 SnapDriver 的事件通道，跨任意章节直达；
            // 自己 scrollTo 会被 SnapDriver 的 pull 逻辑拉回 ±1，无法多跳。
            window.dispatchEvent(new CustomEvent('obs:snap-to', { detail: { id: t.id } }));
            if (navigator.vibrate) navigator.vibrate(6);
          }}
        >
          <span className="num">{t.num}</span>
          <span className="dot" />
        </a>
      ))}
    </aside>
  );
}

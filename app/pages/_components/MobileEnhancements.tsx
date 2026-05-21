'use client';

import { useEffect } from 'react';

/**
 * §A2 + §D1 · 移动端杂志增强 —— 一次性挂载组件，挂载后注入两类元素到 DOM：
 *
 * 1. `.sec-ribbon` —— 每个 [data-section] 末尾 / #articles 之后挂"当前章 → 下一章 ↓"色带
 * 2. `.carousel-dots` —— 每个 `.visual-grid` / `.rt-grid` 后挂 dots indicator，
 *    监听 scrollLeft 同步 active 态
 *
 * CSS 在 @media (max-width: 640px) 中点亮显示，桌面端 display: none。两类元素都做
 * 幂等检查（不重复注入），便于 dev mode hot reload。
 */
export function MobileEnhancements() {
  useEffect(() => {
    // ── A2 · Section bottom ribbons ──────────────
    const sectioned = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
    const injected: Element[] = [];

    sectioned.forEach((sec, i) => {
      if (sec.querySelector(':scope > .sec-ribbon')) return; // 幂等
      const ribbon = document.createElement('div');
      ribbon.className = 'sec-ribbon';
      const cur = (sec.dataset.section || '').split('—')[0].trim();
      let nextLabel = '§ FIN';
      for (let j = i + 1; j < sectioned.length; j++) {
        if (sectioned[j].dataset.section) {
          nextLabel = (sectioned[j].dataset.section || '').split('—')[0].trim();
          break;
        }
      }
      ribbon.innerHTML =
        `<span class="cur">${cur}</span>` +
        `<span class="stretch"></span>` +
        `<span class="nxt">${nextLabel} ↓</span>`;
      sec.appendChild(ribbon);
      injected.push(ribbon);
    });

    // ── D1 · Visual-grid / rt-grid carousel dots ────
    // rt-grid 的直接子元素不是 .cell（是 .rt-cell / .rt-placeholder），所以这里按
    // grid 类别分流取子节点；逻辑余下完全复用。
    const grids = Array.from(
      document.querySelectorAll<HTMLElement>('.visual-grid, .rt-grid'),
    );
    const cleanups: Array<() => void> = [];

    grids.forEach((grid) => {
      const cells = grid.classList.contains('rt-grid')
        ? Array.from(grid.children)
        : Array.from(grid.querySelectorAll('.cell'));
      if (cells.length < 2) return;
      if (grid.nextElementSibling?.classList.contains('carousel-dots')) return; // 幂等
      const dots = document.createElement('div');
      dots.className = 'carousel-dots';
      cells.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'dot' + (i === 0 ? ' active' : '');
        dots.appendChild(d);
      });
      grid.insertAdjacentElement('afterend', dots);
      injected.push(dots);

      let raf: number | null = null;
      const onScroll = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const w = grid.clientWidth;
          // 84vw + 14px gap —— 与 CSS 中 .visual-grid .cell flex 一致
          const idx = Math.round(grid.scrollLeft / (w * 0.86 + 14));
          dots.querySelectorAll('.dot').forEach((d, i) => {
            d.classList.toggle('active', i === Math.min(cells.length - 1, Math.max(0, idx)));
          });
        });
      };
      grid.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => {
        if (raf) cancelAnimationFrame(raf);
        grid.removeEventListener('scroll', onScroll);
      });
    });

    return () => {
      cleanups.forEach(fn => fn());
      injected.forEach(el => el.remove());
    };
  }, []);

  return null;
}

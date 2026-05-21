'use client';

import { useEffect, useRef } from 'react';

/**
 * §Interlude — 项目区双语扉页。
 * 顺序上夹在 §02 Credo 与 §03 ProjectI 之间，作为"接下来是作品"的章节卡。
 * 结构：顶 mono kicker、中段大字双语 statement、底两条 hover-able 项目索引。
 * 入场：IntersectionObserver 给 .interlude 加 .in 后触发 stagger reveal。
 *
 * 注意：是 [data-section] section，SnapDriver 把它当一个独立 snap 停靠点；
 * FxCinematicFlash 的 SECTION_LABELS 必须在 idx 2 插入对应条目（与 DOM 顺序对齐）。
 */
export function Interlude() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) el.classList.add('in');
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 点击索引行：走 SnapDriver 的跨章跳转入口，避免和 pull/threshold 逻辑冲突
  function jumpTo(id: string) {
    window.dispatchEvent(new CustomEvent('obs:snap-to', { detail: { id } }));
  }

  return (
    <section
      id="interlude"
      ref={ref}
      className="interlude"
      data-section="§ INTERLUDE — THE WORKS"
      data-read="01 MIN"
    >
      <div className="il-kicker">
        <span className="label">§ INTERLUDE</span>
        <span className="stretch" />
        <span className="meta">THE WORKS &nbsp;/&nbsp; N=2</span>
      </div>

      <div className="il-body">
        <p className="il-statement">
          <span className="en line1">Made things,</span>
          <span className="en line2">not exercises.</span>
          <span className="cn">
            以下项目均为<em>个人发起、独立完成</em>。它们不是练习，<br />
            而是我认为还没有被足够好地实现、<br />
            所以值得亲手做一遍的东西。
          </span>
        </p>
      </div>

      <ol className="il-index">
        <li>
          <a
            href="#p1"
            onClick={(e) => { e.preventDefault(); jumpTo('p1'); }}
          >
            <span className="n">01</span>
            <span className="dash" aria-hidden="true">───</span>
            <span className="name">
              <em>ReadTailor</em>
              <span className="cn">读裁</span>
            </span>
            <span className="tag">[Android &nbsp;·&nbsp; 阅读]</span>
          </a>
        </li>
        <li>
          <a
            href="#p2"
            onClick={(e) => { e.preventDefault(); jumpTo('p2'); }}
          >
            <span className="n">02</span>
            <span className="dash" aria-hidden="true">───</span>
            <span className="name">
              <em>DestinyGuidance</em>
              <span className="cn">起卦</span>
            </span>
            <span className="tag">[Web &nbsp;·&nbsp; 起卦]</span>
          </a>
        </li>
      </ol>
    </section>
  );
}

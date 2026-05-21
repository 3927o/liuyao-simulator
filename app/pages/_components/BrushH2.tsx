'use client';

import { useEffect, useRef } from 'react';

interface BrushH2Props {
  /** 中文主标题，会被拆成 .char span，每字 stagger */
  cn: string;
  /** 英文副标题（italic + acid），渲染在 .en span 内 */
  en?: string;
}

/**
 * sec-head 复用组件。h2 内的中文逐字拆 .char span，IntersectionObserver
 * 给 .sec-head 加 .in 触发 stagger 入场。
 */
export function BrushH2({ cn, en }: BrushH2Props) {
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headRef.current;
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

  // 把 cn 字符拆成 .char span，每个带 --i 索引；空白原样保留
  let counter = 0;
  const chars = [...cn].map((ch, i) => {
    if (/\s/.test(ch)) return <span key={i}>{ch}</span>;
    const idx = counter++;
    return (
      <span key={i} className="char" style={{ ['--i' as string]: idx } as React.CSSProperties}>
        {ch}
      </span>
    );
  });

  return (
    <div className="sec-head" ref={headRef}>
      <h2>
        {chars}
        {en && (
          <span className="en">
            / <em>{en}</em>
          </span>
        )}
      </h2>
    </div>
  );
}

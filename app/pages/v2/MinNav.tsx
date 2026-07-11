'use client';

import { useEffect, useState } from 'react';

const ITEMS = [
  { id: 'credo', label: '信条' },
  { id: 'works', label: '作品' },
  { id: 'articles', label: '文章' },
  { id: 'thinking', label: '思考' },
  { id: 'filter', label: '合作' },
  { id: 'fin', label: '联系' },
];

/**
 * 极简 sticky 导航：mono 锚点 + scrollspy（当前节黑、其余灰）。
 * p1/p2 不单列——从「作品」节的索引进入，导航保持 6 项以内。
 */
export function MinNav() {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const sections = document.querySelectorAll('.minv2 section[id], .minv2 header[id]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      // 视口中间横带触发：滚到哪节亮哪节
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  // p1/p2 归属「作品」；credo 并入开篇 header#top，落在开篇时亮「信条」
  const current =
    active === 'p1' || active === 'p2' ? 'works'
    : active === 'top' ? 'credo'
    : active;

  return (
    <nav className="min-nav" aria-label="页面导航">
      <div className="inner">
        <a className="brand" href="#top">RICHARD</a>
        <div className="links">
          {ITEMS.map(it => (
            <a key={it.id} href={`#${it.id}`} data-on={current === it.id ? '1' : ''}>
              {it.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

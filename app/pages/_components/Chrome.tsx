'use client';

import { useEffect, useRef, useState } from 'react';

const MENU = [
  { id: 'hero',     label: '§01 — POSITION STATEMENT',           read: '01 MIN' },
  { id: 'credo',    label: '§02 — CREDO & SELF',                 read: '04 MIN' },
  { id: 'interlude',label: '§ — THE WORKS',                      read: '01 MIN' },
  { id: 'p1',       label: '§03 PROJECT NO. 01 — ReadTailor',    read: '04 MIN' },
  { id: 'p2',       label: '§04 PROJECT NO. 02 — DestinyGuidance', read: '04 MIN' },
  { id: 'thinking', label: '§05 — THINKING ALOUD',               read: '03 MIN' },
  { id: 'articles', label: '§06 — ARTICLES',                     read: '02 MIN' },
  { id: 'filter',   label: '§07 — A MUTUAL FILTER',              read: '02 MIN' },
];

/**
 * 顶栏 Chrome：左侧 acid 方块 + READING + 当前 section 标签 + caret → 点开下拉。
 * 右侧阅读时长。IntersectionObserver 监听各 section 切换当前标签 + 当前菜单项 active。
 */
export function Chrome() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState('hero');
  const topRef = useRef<HTMLElement>(null);

  // 当前 section 由 IntersectionObserver 推断
  useEffect(() => {
    const targets = MENU.map(m => document.getElementById(m.id)).filter((t): t is HTMLElement => !!t);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    targets.forEach(t => io.observe(t));
    return () => io.disconnect();
  }, []);

  // 点空白 / ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (topRef.current && !topRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = MENU.find(m => m.id === activeId) ?? MENU[0];

  function scrollTo(id: string) {
    const t = document.getElementById(id);
    if (t) window.scrollTo({ top: t.offsetTop - 40, behavior: 'smooth' });
    setOpen(false);
  }

  return (
    <header className="chrome-top" data-open={open ? '1' : ''} ref={topRef}>
      <button
        className="left chrome-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
      >
        <span className="sq" />
        <span className="label">READING</span>
        <span className="sec-now">{active.label}</span>
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      <div className="right">
        <span>{active.read}</span>
      </div>
      <nav className="chrome-menu" role="menu">
        {MENU.map(m => (
          <a
            key={m.id}
            href={`#${m.id}`}
            role="menuitem"
            className={m.id === activeId ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); scrollTo(m.id); }}
          >
            <span className="mark" />
            <span className="label-text">{m.label}</span>
            <span className="r">{m.read}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}

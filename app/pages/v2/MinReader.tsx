'use client';

import { useEffect } from 'react';
import { ARTICLES_META, ARTICLE_BODIES } from '../_articles/articles';

interface MinReaderProps {
  openIdx: number | null;
  onClose: () => void;
}

/**
 * 极简文章 Reader：全屏白底 overlay，sticky 顶栏 + 单栏正文。
 * 无幕帘/转场——打开即显示。正文复用 ARTICLE_BODIES 原始 JSX。
 */
export function MinReader({ openIdx, onClose }: MinReaderProps) {
  const open = openIdx !== null;

  // 打开时锁 html 滚动 + Esc 关闭
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (openIdx === null) return null;
  const meta = ARTICLES_META[openIdx];

  return (
    <div className="mr-overlay" role="dialog" aria-modal="true" aria-label={meta.title}>
      <div className="mr-bar">
        <div className="mr-bar-inner">
          <span>NO. {meta.num} · {meta.tag} · {meta.date} · {meta.read}</span>
          <button type="button" className="mr-close" onClick={onClose}>CLOSE</button>
        </div>
      </div>
      {/* key=openIdx：切换文章时重建滚动容器，回到顶部 */}
      <div className="mr-body" key={openIdx}>
        {ARTICLE_BODIES[openIdx]}
      </div>
    </div>
  );
}

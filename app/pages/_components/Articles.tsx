'use client';

import { BrushH2 } from './BrushH2';
import { ARTICLES_META } from '../_articles/articles';

interface ArticlesProps {
  onOpenArticle: (idx: number) => void;
}

/**
 * §06 文章 — 三栏等权卡片。点击任一张触发 onOpenArticle(idx)，由父组件吊起 Reader。
 */
export function Articles({ onOpenArticle }: ArticlesProps) {
  return (
    <section id="articles" data-section="§06 — ARTICLES" data-read="02 MIN">
      <BrushH2 cn="文章" en="Articles" />

      <div className="articles-grid">
        {ARTICLES_META.map((a, idx) => (
          <article
            key={a.num}
            className="article-card"
            onClick={() => onOpenArticle(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenArticle(idx); } }}
          >
            <div className="a-num">
              <span>NO. {a.num} · {a.tag}</span>
              <span className="time">{a.read}</span>
            </div>
            <h5>{a.title}</h5>
            <p>{a.excerpt}</p>
            <div className="a-meta">
              <span>FILED {a.date}</span>
              <span className="arrow">READ →</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

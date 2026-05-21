'use client';

import { useEffect, useState } from 'react';

import { BgLayers } from './_components/BgLayers';
import { Chrome } from './_components/Chrome';
import { ReadingProgress } from './_components/ReadingProgress';
import { Hero } from './_components/Hero';
import { Credo } from './_components/Credo';
import { Interlude } from './_components/Interlude';
import { ProjectI } from './_components/ProjectI';
import { ProjectII } from './_components/ProjectII';
import { Thinking } from './_components/Thinking';
import { Articles } from './_components/Articles';
import { Filter } from './_components/Filter';
import { End } from './_components/End';
import { ArticleReader } from './_components/ArticleReader';
import { IssueSpine } from './_components/IssueSpine';
import { MobileEnhancements } from './_components/MobileEnhancements';
import { SnapDriver } from './_components/SnapDriver';
import { FxCinematicFlash } from './_components/FxCinematicFlash';

/**
 * 个人网站入口 /pages — 黑曜石 B-obsidian 设计的 React 实现。
 *
 * 整页是 client component：背景 noise 跟随鼠标、IntersectionObserver
 * 推 chrome 当前 section、ArticleReader 全屏 takeover 都依赖 client 侧逻辑。
 *
 * 进入此路由时给 html/body 临时加 .obsidian-active 类——override 根 globals.css
 * 的 overflow:hidden（那是 `/` 摇卦页需要的，不能动）。离开时还原。
 */
export default function PersonalDispatchPage() {
  const [openArticleIdx, setOpenArticleIdx] = useState<number | null>(null);

  // 切换页面环境：放开滚动 / 启用 scroll-snap / 切换主题背景
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add('obsidian-active');
    body.classList.add('obsidian-active');
    return () => {
      html.classList.remove('obsidian-active');
      body.classList.remove('obsidian-active');
      // 安全清理：万一卸载时 reader 还开着，把幕帘类去掉
      body.classList.remove('curtain-in', 'curtain-out');
      html.style.overflow = '';
      body.style.overflow = '';
    };
  }, []);

  return (
    <div className="obsidian-root" lang="zh-CN">
      <BgLayers />
      <ReadingProgress />
      <Chrome />

      <Hero />
      <Credo />
      <Interlude />
      <ProjectI />
      <ProjectII />
      <Thinking />
      <Articles onOpenArticle={(idx) => setOpenArticleIdx(idx)} />
      <Filter />
      <End />

      <ArticleReader
        openIdx={openArticleIdx}
        onClose={() => setOpenArticleIdx(null)}
      />

      <SnapDriver />
      <FxCinematicFlash />

      {/* 移动端独占 —— CSS @media 控显隐 */}
      <IssueSpine />
      <MobileEnhancements />
    </div>
  );
}

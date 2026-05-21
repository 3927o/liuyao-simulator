'use client';

import { ReadTailorDemo } from './readtailor/ReadTailorDemo';
import { HEIDEGGER_DASEIN_PRESET } from './readtailor/presets/heideggerDasein';
import { DOSTOEVSKY_MARMELADOV_PRESET } from './readtailor/presets/dostoevskyMarmeladov';

/**
 * §03 Project I — ReadTailor。
 * 两本书横向并排 (rt-grid)：Heidegger §9（哲学独白）+ 罪与罚 第 1 部 第 2 章
 * （醉鬼忏悔）—— 演示同一套 ReadTailor 机制在两种迥异文体上的适应性。
 * 窄屏 rt-grid 切横向 scroll-snap 轮播。
 */
export function ProjectI() {
  return (
    <article id="p1" className="project" data-section="§03 PROJECT NO. 01 — ReadTailor" data-read="04 MIN">
      <div className="roman-rail"><div className="roman">I</div></div>

      <div className="p-head">
        <div className="p-kicker"><span className="line" />PROJECT &nbsp;·&nbsp; NO. 01</div>
        <h3><span className="it">ReadTailor</span><span className="cn">读裁</span></h3>
        <div className="one-liner">
          <span>Sometimes, halfway through a difficult book, you stop — and can&rsquo;t even say where it broke.</span>
          <span className="cn">读难书时总有这种时刻：卡在某一段，自己也说不清是哪里卡住，只是知道读不下去。</span>
        </div>
      </div>

      <div className="p-body">
        <div className="copy">
          <p>划线、做笔记、查资料，流程很重，且每次都得从零开始解释「我在读什么」。所以我做了 ReadTailor App。</p>
          <p>
            它通过对话识别你在阅读中真正的阻碍，并针对性地<em>改造书本身</em>——生成章节导读、在晦涩处插入批注、可视化论述脉络，这些只是常见形态，具体怎么改，取决于阻碍本身。
          </p>
          <p>
            唤起 AI 只需要长按屏幕，它自动知道你在读哪一页、哪一章、哪本书，不用划线、不用复制、不用解释&quot;我在读什么&quot;，
            <em>直接问就行</em>。
          </p>
          <p>这个项目的重点不是让 AI 总结一本书，而是降低阅读中向 AI 求助的启动成本，把一次打断式提问变成嵌入阅读流程的辅助。</p>
        </div>

        <div className="specs">
          <div className="row"><b>形</b><span>Android · 阅读器 App</span></div>
          <div className="row"><b>役</b><span className="accent">构想 / 设计 / 实现</span></div>
          <div className="row"><b>旨</b><span>降低 AI 求助的启动成本</span></div>
          <div className="row"><b>反</b><span className="accent">把 AI 当作书的摘要器</span></div>
          <div className="tag-row">
            <span className="tag hi">AI-POWERED</span>
            <span className="tag hi">VOICE INTERFACE</span>
          </div>
        </div>
      </div>

      <div className="demo-notice">
        <span className="text">产品核心机制体验</span>
        <span className="arrow" aria-hidden="true">↓</span>
      </div>

      <div className="rt-grid">
        <ReadTailorDemo preset={HEIDEGGER_DASEIN_PRESET} variant="card" />
        <ReadTailorDemo preset={DOSTOEVSKY_MARMELADOV_PRESET} variant="card" />
      </div>
    </article>
  );
}

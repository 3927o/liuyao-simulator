'use client';

import { useMemo } from 'react';
import { LiuYaoEngine } from '../../../lib/LiuYaoEngine';
import { TimeBot } from '../../../lib/TimeBot';
import { ShakeCanvasGate } from './coin/ShakeCanvasGate';
import { HexagramDisplay } from './coin/HexagramDisplay';
import { AIReading } from './coin/AIReading';
import { useDivination } from './coin/useDivination';

const engine = new LiuYaoEngine();
const timeBot = new TimeBot();

/**
 * §04 Project II — DestinyGuidance。
 * 三 cell：左大 = R3F 摇卦 (FIG·01 LIVE)，右上 = 卦象 (FIG·02)，右下 = AI 解读 (FIG·03)。
 * 顶层在这里调 LiuYaoEngine + TimeBot 得到 HexagramResult，往下分发给两个面板。
 */
export function ProjectII() {
  const { yaoList, resetSignal, onShake, onCoinSettle, reset } = useDivination();
  const latestYao = yaoList.length > 0 ? yaoList[yaoList.length - 1] : null;

  // 6 爻完成时计算完整排盘。未满 6 爻不算 —— engine 需要正好 6 爻。
  const hexagram = useMemo(() => {
    if (yaoList.length !== 6) return null;
    try {
      const timeInfo = timeBot.getTime(new Date());
      return engine.process(yaoList, timeInfo.dayStem);
    } catch (err) {
      console.error('engine.process failed', err);
      return null;
    }
  }, [yaoList]);

  return (
    <article id="p2" className="project alt" data-section="§04 PROJECT NO. 02 — DestinyGuidance" data-read="04 MIN">
      <div className="roman-rail"><div className="roman">II</div></div>

      <div className="p-head">
        <div className="p-kicker"><span className="line" />PROJECT &nbsp;·&nbsp; NO. 02</div>
        <h3><span className="it">DestinyGuidance</span><span className="cn">起卦</span></h3>
        <div className="one-liner">
          <span>Casting a hexagram needs three coins tossed six times — I refuse Math.random() for that.</span>
          <span className="cn">六爻起卦需要摇三枚铜钱六次，我不想随身带硬币，但也不接受用 Math.random() 糊弄过去。</span>
        </div>
      </div>

      <div className="p-body">
        <div className="copy">
          <p>一个本应严肃的传统决策框架，<em>不该输在最关键的一步</em>。所以我做了一个网页版。</p>
          <p>核心是一套模拟硬币翻滚的物理引擎：真实的初速度、旋转、空气阻力、落地反弹，让随机性来自<em>物理过程本身</em>，而不是一行伪随机代码。下面这个就是引擎本身，点一下试试。</p>
          <p>装卦的部分按传统规则严格实现。起卦完成后，接入 AI 对卦象进行解读——本卦、变卦、动爻、用神，都由 AI 结合传统断卦逻辑给出分析，而不是套一段模板话术。</p>
          <p>便利、严肃、可解释，可以同时成立，前提是你愿意为每一项都<em>多写几百行代码</em>。</p>
        </div>

        <div className="specs">
          <div className="row"><b>形</b><span>Web App</span></div>
          <div className="row"><b>役</b><span className="accent">构想 / 设计 / 实现</span></div>
          <div className="row"><b>核</b><span>真实物理 · 非伪随机</span></div>
          <div className="row"><b>装卦</b><span>按传统规则严格实现</span></div>
          <div className="row"><b>立</b><span className="accent">便利 严肃 可解释</span></div>
          <div className="tag-row">
            <span className="tag">INTERACTIVE</span>
            <span className="tag">ALGORITHM</span>
            <span className="tag hi">PHYSICS ENGINE</span>
            <span className="tag hi">AI-POWERED</span>
          </div>
        </div>
      </div>

      <div className="demo-notice">
        <span className="text">产品核心机制体验</span>
        <span className="arrow" aria-hidden="true">↓</span>
      </div>

      <div className="visual-grid">
        <ShakeCanvasGate
          resetSignal={resetSignal}
          latestYao={latestYao}
          onShake={onShake}
          onCoinSettle={onCoinSettle}
          onReset={reset}
          yaoCount={yaoList.length}
        />

        <HexagramDisplay yaoList={yaoList} hexagram={hexagram} />

        <AIReading hexagram={hexagram} yaoCount={yaoList.length} />
      </div>
    </article>
  );
}

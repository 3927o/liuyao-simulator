'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import './min.css';

import { LiuYaoEngine } from '../../../lib/LiuYaoEngine';
import { TimeBot } from '../../../lib/TimeBot';
import { ARTICLES_META } from '../_articles/articles';
import { ReadTailorDemo } from '../_components/readtailor/ReadTailorDemo';
import { HEIDEGGER_DASEIN_PRESET } from '../_components/readtailor/presets/heideggerDasein';
import { DOSTOEVSKY_MARMELADOV_PRESET } from '../_components/readtailor/presets/dostoevskyMarmeladov';
import { MARX_KAPITAL_PRESET } from '../_components/readtailor/presets/marxKapital';
import { HUANG_WANLI_PRESET } from '../_components/readtailor/presets/huangWanli';
import { ShakeCanvasGate } from '../_components/coin/ShakeCanvasGate';
import { HexagramDisplay } from '../_components/coin/HexagramDisplay';
import { AIReading } from '../_components/coin/AIReading';
import { useDivination } from '../_components/coin/useDivination';
import { MinReader } from './MinReader';
import { MinNav } from './MinNav';

const engine = new LiuYaoEngine();
const timeBot = new TimeBot();

/** ReadTailor demo 书目：单书舞台，tab 点选切换 */
const RT_BOOKS = [
  { key: 'heidegger', label: '《存在与时间》', preset: HEIDEGGER_DASEIN_PRESET },
  { key: 'dostoevsky', label: '《罪与罚》', preset: DOSTOEVSKY_MARMELADOV_PRESET },
  { key: 'marx', label: '《资本论》', preset: MARX_KAPITAL_PRESET },
  { key: 'huang', label: '《万历十五年》', preset: HUANG_WANLI_PRESET },
];

/** 「我在想的问题」条目：点标题原地展开正文（accordion，非弹窗） */
function Thought({ idx, title, date, children }: {
  idx: string;
  title: string;
  date: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="thought" data-open={open ? '1' : ''}>
      <div className="idx">{idx}</div>
      <div>
        <h3 className="t-h">
          <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}>
            <span>{title}</span>
            <span className="t-date">{date}</span>
            <span className="t-toggle" aria-hidden="true">{open ? '−' : '+'}</span>
          </button>
        </h3>
        <div className="t-body"><div>{children}</div></div>
      </div>
    </div>
  );
}

/**
 * /pages/v2 — 理性克制极简版。内容与 /pages 完全一致，表达全部重做：
 * 纯白底、系统 sans + IBM Plex Mono、单栏文档流、1px 细线分节、无动效。
 * 两个交互 demo 原样嵌入，外层包 .obsidian-root 复用 /pages 的 demo 样式
 * （tokens 在 min.css 里被压成黑白）。
 */
export default function MinimalDispatchPage() {
  const [openArticleIdx, setOpenArticleIdx] = useState<number | null>(null);
  const [bookIdx, setBookIdx] = useState(0);

  // 放开根 globals.css 的 overflow:hidden
  useEffect(() => {
    document.documentElement.classList.add('minv2-active');
    document.body.classList.add('minv2-active');
    return () => {
      document.documentElement.classList.remove('minv2-active');
      document.body.classList.remove('minv2-active');
    };
  }, []);

  // DestinyGuidance demo 状态（与 /pages 的 ProjectII 相同）
  const { yaoList, resetSignal, onShake, onCoinSettle, reset } = useDivination();
  const latestYao = yaoList.length > 0 ? yaoList[yaoList.length - 1] : null;
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
    <div className="minv2" lang="zh-CN">
      <MinNav />

      {/* ── Opening · 刊头(左) × 信条(右) 对页 ────────────────── */}
      <header id="top" className="opening">
        <div className="wrap-wide op-grid">
          <div className="op-left">
            <div className="kicker">
              <span className="strong">POSITION STATEMENT</span>
              <span>NO. 01 / 2026.05</span>
            </div>
            <h1>把想法做成产品的工程师</h1>
            <p className="sub">
              在想的事情都围绕同一个问题：AI 时代，一个人怎么更好地学习、获取信息、拥有属于自己的 Agent。
            </p>
            <ul className="principles">
              <li><span className="n">A</span><span>工程师 / 产品判断 / 独立交付</span></li>
              <li><span className="n">B</span><span>个人项目都来自真实问题</span></li>
              <li><span className="n">C</span><span>问题先于功能</span></li>
            </ul>
          </div>

          <aside className="op-right" id="credo">
            <div className="sec-label">
              <span>CREDO &amp; SELF</span>
              <span className="cn">信条与自我介绍</span>
            </div>
            <p className="pull-quote">&ldquo;To understand is to invent.&rdquo;</p>
            <div className="pull-attr">SELF · ANON.</div>
            <div className="credo-body">
              <p className="lead">
                我是个工程师，做过被很多人用的功能。但对我来说，「写代码」和「造东西」一直是两件事：写代码是任务，造东西是我自己有一个具体的不满或者好奇，然后把脑子里的想法一点点变成能跑起来的东西。
              </p>
              <p>
                简历能说明我在公司里交付过什么，但 GitHub 更能说明我真正关心什么。<b>两边都重要，只是后者更接近我长期的驱动力。</b>
              </p>
              <p>
                我做过几个个人项目，不一定都对应现成的市场需求，但每一个都来自我真实碰到的问题，而且都被我推进到了能交互、能运行的程度。
              </p>
              <p>
                比起承接已经定义好的需求，我更想参与那种<b>问题本身还没被想清楚、还需要重新理解和塑形</b>的产品。
              </p>
            </div>
          </aside>
        </div>
      </header>

      {/* ── §1 Works 作品 —— 章：黑条 + 左对齐节标签，1.1/1.2 是它的子节 ── */}
      <section id="works">
        <div className="wrap">
          <div className="sec-label">
            <span className="num">1</span>
            <span>WORKS</span>
            <span className="cn">作品</span>
          </div>
          <p className="works-note">
            以下项目均为<em>个人发起、独立完成</em>。
          </p>
        </div>
      </section>

      {/* ── §1.1 ReadTailor —— 子节：分组分隔线，无节边界黑条 ── */}
      <section id="p1">
        <div className="wrap">
          <div className="part-head">
            <span className="num">1.1</span>
            <span>ReadTailor</span>
            <span className="cn">读裁</span>
          </div>
          <p>读难书时总有这种时刻：卡在某一段，自己也说不清是哪里卡住，只是知道读不下去。</p>
          <p>划线、做笔记、查资料，流程很重，且每次都得从零开始解释「我在读什么」。所以我做了 ReadTailor App。</p>
          <p>
            它通过对话识别你在阅读中真正的阻碍，并针对性地<em>改造书本身</em>——生成章节导读、在晦涩处插入批注、可视化论述脉络，这些只是常见形态，具体怎么改，取决于阻碍本身。
          </p>
          <p>
            唤起 AI 只需要长按屏幕，它自动知道你在读哪一页、哪一章、哪本书，不用划线、不用复制、不用解释&quot;我在读什么&quot;，
            <b>直接问就行</b>。
          </p>
          <p>这个项目的重点是降低阅读中向 AI 求助的启动成本——把一次打断式的提问，变成嵌入阅读流程的辅助。</p>

          <div className="specs">
            <div className="row"><b>形态</b><span>Android · 阅读器 App</span></div>
            <div className="row"><b>角色</b><span>构想 / 设计 / 实现</span></div>
            <div className="row"><b>目标</b><span>降低 AI 求助的启动成本</span></div>
            <div className="row"><b>非目标</b><span>把 AI 当作书的摘要器</span></div>
          </div>
          <div className="tag-row">
            <span className="tag hi">AI-POWERED</span>
            <span className="tag hi">VOICE INTERFACE</span>
          </div>

          <div className="demo-notice">产品核心机制体验</div>
        </div>

        <div className="wrap">
          <div className="rt-switch" role="tablist" aria-label="切换示例书目">
            {RT_BOOKS.map((b, i) => (
              <button
                key={b.key}
                type="button"
                role="tab"
                aria-selected={i === bookIdx}
                data-on={i === bookIdx ? '1' : ''}
                onClick={() => setBookIdx(i)}
              >
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                {b.label}
              </button>
            ))}
          </div>
          <div className="obsidian-root">
            {/* 单书舞台：各书常驻挂载（保留各自交互状态），轨道横移切换 */}
            <div className="rt-stage">
              <div
                className="rt-track"
                style={{ transform: `translateX(-${bookIdx * 100}%)` }}
              >
                {RT_BOOKS.map((b, i) => (
                  <div className="rt-slide" key={b.key} inert={i !== bookIdx}>
                    <ReadTailorDemo preset={b.preset} variant="card" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── §1.2 DestinyGuidance —— 子节：分组分隔线，无节边界黑条 ── */}
      <section id="p2">
        <div className="wrap">
          <div className="part-head">
            <span className="num">1.2</span>
            <span>DestinyGuidance</span>
            <span className="cn">起卦</span>
          </div>
          <p>六爻起卦需要摇三枚铜钱六次，我不想随身带硬币，但也不接受用 Math.random() 糊弄过去。所以我做了一个网页版。</p>
          <p>核心是一套模拟硬币翻滚的物理引擎：真实的初速度、旋转、空气阻力、落地反弹，让随机性来自<em>物理过程本身</em>。下面这个就是引擎本身，点一下试试。</p>
          <p>装卦的部分按传统规则严格实现。起卦完成后，接入 AI 对卦象进行解读——本卦、变卦、动爻、用神，都由 AI 结合传统断卦逻辑给出分析。</p>

          <div className="specs">
            <div className="row"><b>形态</b><span>Web App</span></div>
            <div className="row"><b>角色</b><span>构想 / 设计 / 实现</span></div>
            <div className="row"><b>核心</b><span>真实物理 · 非伪随机</span></div>
            <div className="row"><b>规则</b><span>装卦按传统规则严格实现</span></div>
            <div className="row"><b>主张</b><span>便利 · 严肃 · 可解释</span></div>
          </div>
          <div className="tag-row">
            <span className="tag">INTERACTIVE</span>
            <span className="tag">ALGORITHM</span>
            <span className="tag hi">PHYSICS ENGINE</span>
            <span className="tag hi">AI-POWERED</span>
          </div>

          <div className="demo-notice">
            <span>产品核心机制体验</span>
            <a
              href="https://liuyao-simulator.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="直接线上体验 DestinyGuidance（新窗口）"
            >
              直接线上体验 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="wrap">
          <div className="obsidian-root">
            <div className="visual-grid">
              <ShakeCanvasGate
                resetSignal={resetSignal}
                latestYao={latestYao}
                onShake={onShake}
                onCoinSettle={onCoinSettle}
                onReset={reset}
                yaoCount={yaoList.length}
                scene="daylight"
              />
              <HexagramDisplay yaoList={yaoList} hexagram={hexagram} />
              <AIReading hexagram={hexagram} yaoCount={yaoList.length} />
            </div>
          </div>
        </div>
      </section>

      {/* ── §2 Articles ──────────────────────────────────────── */}
      <section id="articles">
        <div className="wrap">
          <div className="sec-label">
            <span className="num">2</span>
            <span>ARTICLES</span>
          </div>
          <h2 className="sec-title">文章</h2>
          <ul className="article-list">
            {ARTICLES_META.map((a, idx) => (
              <li key={a.num}>
                <button type="button" onClick={() => setOpenArticleIdx(idx)}>
                  <span className="n">{a.num}</span>
                  <span>
                    <h3>{a.title}</h3>
                    <p className="excerpt">{a.excerpt}</p>
                    <span className="meta">
                      <span>{a.tag}</span>
                      <span>FILED {a.date}</span>
                      <span>{a.read}</span>
                      <span>READ →</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── §3 Thinking Aloud ────────────────────────────────── */}
      <section id="thinking">
        <div className="wrap">
          <div className="sec-label">
            <span className="num">3</span>
            <span>FRAGMENTS</span>
          </div>
          <h2 className="sec-title">近期思考碎片</h2>
          <p className="sec-sub">一些散乱的思考碎片，未成型，希望能在未来有新的看法。</p>

          <Thought idx="01" title="重新获得获取知识的乐趣" date="2026.07.08">
            <p>
              最近一直在思考，如何借用 AI 让大家都能更好地学习知识——或者说，<b>重新获得获取知识的乐趣</b>。
            </p>
            <p>
              以前我们获取和学习知识，主要通过老师、自媒体或者书籍。但这些传统方式有一个共同的问题：<b>它们无法根据个人的情况做适配</b>。毕竟每个人的情况都五花八门，学习方式和知识背景各不相同。
            </p>
            <p>
              所以我希望能做出一个东西，让学习知识不再是一种负担和困难，而是一种乐趣。
            </p>
          </Thought>

          <Thought idx="02" title="一个人，一个 Agent" date="2026.06.30">
            <p>
              我一直觉得，未来每个人应该只有一个 Agent，而不是像现在这样，每个产品里都塞一个互不相通的 AI 助手。它可以接到不同的平台和硬件上，但<b>它的记忆、它的人格，应该始终属于我自己</b>。
            </p>
            <p>
              现在的碎片化其实不是技术做不到，而是每个平台都想把用户数据留在自己手里。所以我做个人 AI 产品时最关心的就是这个：AI 不应该只是某个产品里的一个功能入口，它应该慢慢变成<b>属于用户自己的东西</b>。
            </p>
          </Thought>

          <Thought idx="03" title="你不拥有你的 Agent，你只是在租用它" date="2026.06.21">
            <p>
              接着上一条想：Agent 要真的成为一个人的延伸，前提是它能用上我自己的数据。但这些数据现在散落在几十个平台里，<b>说是我的数据，其实是平台的资产</b>。这件事不解决，Agent 做得再聪明，天花板也很低。
            </p>
            <p>
              所以我关注的不只是模型能力，还有数据授权、上下文所有权这些更底层的事——不然我们不是拥有自己的 Agent，<b>只是在租用它</b>。
            </p>
          </Thought>

          <Thought idx="04" title="手机不是 AI 时代的硬件" date="2026.06.02">
            <p>
              手机是为「人主动去操作信息」设计的，但和 AI 交互，其实用不着这么重的设备。我猜下一代硬件会更轻、更贴身，甚至不再是「一个设备」，而是<b>分布在身边的好几个节点</b>。屏幕不会消失，但会从中心退到边缘。
            </p>
            <p>
              我对这件事感兴趣，倒不是想做一个新设备，而是想重新想清楚：和 AI 交互时，<b>输入是什么、输出是什么，它什么时候该出现、什么时候不该打断你</b>。
            </p>
          </Thought>

          <Thought idx="05" title="信息订阅软件，对我来说都不太成立" date="2026.05.17">
            <p>
              市面上有很多信息聚合订阅软件，但对我来说都不太成立。首先，<b>我其实并不清楚自己具体需要哪些信息</b>，能给的只有一些泛泛的词：AI 硬件、个人 Agent、脑机接口……
            </p>
            <p>
              其次是数据源。如果只是微博、小红书、X 这类大众平台，它能做的只有帮我省时间——该刷到的我自己也能刷到，真正重要的信息就算不刷也会从别的路径知道。而且这类平台本身不是一手信息源，经过不知多少手的消化，再让 AI 消化一遍，失真会很大。所以这类软件真正有价值的地方只有一个：<b>足够高质量的数据源</b>。
            </p>
            <p>
              筛选这一步，它们往往靠 AI。但 AI 很难判断用户真正需要什么，除非用户付出很高的成本去驯养它——那还不如推送算法。我实际上需要的，是<b>内心想关注、日常却不怎么关注的信息</b>。问题是这类信息我读不太懂，也难判断质量，最后的感觉就是产品只给我推了一堆看似高大上的科技、商业文章；而出于惰性，我很难对一篇基本看不明白的文章提起兴趣。最好能加上 AI 解答，帮用户先建立起对那个领域的初步直觉。
            </p>
            <p>
              话题放大一点：我们平常怎么获取信息？基本都在信息流里，至少对我来说，除了解决问题，很少主动搜索。再想想知识类博主是怎么做的：拿到高质量的信息，再用一种让观众感兴趣的方式讲出来——或者说，信息本身不用足够好，只要让观众觉得足够好就行。很多软件连第一点都做不好，更别说第二点，而第二点或许恰恰重要：<b>「什么样的信息能帮到用户」和「什么样的信息能让用户想点开」，不是同一个问题</b>。
            </p>
            <p>
              设想一个形态：平台上全是一手信息，没有 UGC，推送靠推荐算法，还带 AI 解答。怎么感觉这么熟悉——今日头条？只是它的内容质量太差了。但推荐算法和这类产品或许天生冲突：<b>算法的引力和用户的成长需求是拧着的</b>，信息流最后都会变成质量没那么高、但能满足多巴胺的样子。想来想去，这是一件很反人性的事。
            </p>
          </Thought>

          <Thought idx="06" title="怎么才能给一个产品好的设计" date="2026.05.06">
            <p>
              最近在纠结的一件事：怎么才能给一个网站、一个产品好的设计。我之前的网页粗看花哨，实际上只是华丽元素的堆叠，看多了就视觉疲劳。
            </p>
            <p>
              后来我理出了一个顺序：首先，你得知道<b>你想表达的内容本身是什么</b>——在这个场景下，就是你的产品本身；其次，你得知道<b>表达的目的是什么</b>——向谁表达？要给对方什么感觉、让对方做出什么动作？然后，才轮到根据内容和目的，对侧重点、风格、形式、交互、文案这些细节一个个打磨。
            </p>
            <p>
              但我在这方面是个半吊子，只能凭所谓的感觉来。而恰巧，<b>你很难知道什么是对的，但你能轻易察觉出不对劲的地方</b>。所以只能一次又一次地去尝试。太折磨了。
            </p>
          </Thought>

          <Thought idx="07" title="真正有价值的不是执行，是判断" date="2026.04.24">
            <p>
              我一直认为很多岗位无法被完全取代，因为真正有价值的部分<b>不是执行或者生成，而是判断</b>。
            </p>
            <p>
              比如设计。设计不是单纯的视觉生产，而是把商业目标、品牌性格、用户感受和传播场景<b>翻译成视觉语言</b>。AI 当然可以快速生成一张精美的海报、一个网页，甚至一段视频，但你总得知道想给用户传达什么感觉、品牌的调性是什么、这个设计在商业中承担什么任务；知道了这些，你还得知道用什么样的设计语言才能把它们传达出去——然后才能告诉 AI，让它生成在每一个细节上都符合需求的产物。否则就只是有其华而无其实：表面好看，但缺少准确的表达。
            </p>
            <p>
              AI 可以达到众数，让平庸的产物成批、快速地出现，但它<b>无法天然做到极致</b>。知道自己想表达什么，以及要用什么形式表达出来——这很重要。
            </p>
          </Thought>

        </div>
      </section>

      {/* ── §4 工作方式 ──────────────────────────────────────── */}
      <section id="filter">
        <div className="wrap">
          <div className="sec-label">
            <span className="num">4</span>
            <span>FIT</span>
          </div>
          <h2 className="sec-title">工作方式</h2>

          <div className="filter-block">
            <h3>我能做的</h3>
            <p>
              我不用工具清单介绍自己。具体用什么，看简历。我擅长的是
              <em>从一个模糊的产品想法走到可以被使用的东西</em>——这中间通常需要：
            </p>
            <ol>
              <li><span><b>判断要做什么。</b>把&quot;用户说想要 X&quot;翻译成&quot;实际要解决的是 Y&quot;，并判断 Y 值不值得做。</span></li>
              <li><span><b>决定怎么做。</b>技术选型不是选最新的，是选最适合这个问题量级和团队规模的。</span></li>
              <li><span><b>独立实现。</b>Agent 开发、前后端、测试、运维，能在早期不确定阶段独立完成原型、验证和上线，把想法推进到可以被讨论、使用和迭代的状态。</span></li>
              <li><span><b>和团队一起迭代。</b>包括把自己的判断说清楚、听懂别人的判断、在分歧里推进而不是搁置。</span></li>
            </ol>
            <p>
              在有共识的小团队里，我可以同时承担产品判断和工程交付——
              <b>这两件事本来就不该被切开</b>。
            </p>
            <p>问题不必都来自我自己的兴趣，但我需要知道它为什么重要，以及当前方案为什么值得做。</p>
          </div>

          <div className="filter-block">
            <h3>我在这类环境里产出最好</h3>
            <ul>
              <li>工程师有产品决策空间。</li>
              <li>团队有自己的产品判断。</li>
              <li>协作基于信任、结果和判断质量。</li>
              <li>分歧可以被直接表达。</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── §5 联系 ──────────────────────────────────────────── */}
      <section id="fin">
        <div className="wrap">
          <div className="sec-label">
            <span className="num">5</span>
            <span>CONTACT</span>
            <span className="cn">联系</span>
          </div>
          <p className="end-signoff">
            谢谢你愿意读到这里。如愿继续，请来信。
          </p>
          <div className="letterhead">
            <div className="row">
              <div className="k">邮箱</div>
              <div><a href="mailto:mikumikumi233@gmail.com">mikumikumi233@gmail.com</a></div>
            </div>
            <div className="row">
              <div className="k">GitHub</div>
              <div><a href="https://github.com/3927o">github.com/3927o</a></div>
            </div>
          </div>
        </div>
        <div className="fin">RICHARD · 更新于 2026.07</div>
      </section>

      <MinReader openIdx={openArticleIdx} onClose={() => setOpenArticleIdx(null)} />
    </div>
  );
}

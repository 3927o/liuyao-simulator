'use client';

import { BrushH2 } from './BrushH2';

/**
 * §02 信条与自我介绍 — 左 sticky pull-quote，右带 acid drop-cap 的 lead 段。
 */
export function Credo() {
  return (
    <section id="credo" data-section="§02 — CREDO & SELF" data-read="04 MIN">
      <BrushH2 cn="信条 与 自我介绍" en="Credo & Self" />

      <div className="credo-block">
        <div className="pull pull-en">
          <span className="quote">&ldquo;</span>To understand<br />
          is to <em>invent</em><span className="quote">.</span>
          <span className="sq sm" style={{ marginLeft: 8 }} />
          <div className="signature">
            <span className="sq" />
            <span>SELF · ANON.</span>
          </div>
        </div>

        <div className="body">
          <p className="lead">
            我是工程师，做过被很多人用的功能。但「写代码」和「造东西」对我来说是两件不同的事——前者是任务，后者是从一个具体的不满或好奇出发，把脑子里的东西变成可运行的现实。
          </p>
          <p>
            简历说明我在职业环境里交付过什么，GitHub 则更能说明我真正关心什么。
            <em>两者都重要，但后者更接近我的长期驱动力。</em>
          </p>
          <p>
            最近一两年我花了很多时间在 AI 相关的实践上，不是赶风口，而是我恰好碰上了一个我一直想要的东西真正可以被造出来的时间点。
          </p>
          <p>
            我做过几个个人项目，它们未必都对应现成的市场需求，但每一个都来自我真实遇到的问题，并被我推进到可交互、可运行的形态。
          </p>
          <p>
            相比单纯承接已经定义好的功能需求，我更希望参与那些
            <em>问题本身还需要被重新理解和塑形</em>的产品。
          </p>
        </div>
      </div>
    </section>
  );
}

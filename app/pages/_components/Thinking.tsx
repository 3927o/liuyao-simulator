'use client';

import { useEffect, useRef } from 'react';
import { BrushH2 } from './BrushH2';

/**
 * §05 我在想的问题 — 三段错位 thought（t1/t2/t3 左 margin 不同）+ 手绘 SVG 圈注
 * IntersectionObserver 给每个 .thought 加 .in，触发 SVG stroke-dashoffset 0 → 画出。
 */
export function Thinking() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('in');
        });
      },
      { threshold: 0.1 }
    );
    root.querySelectorAll('.thought').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="thinking" data-section="§05 — THINKING ALOUD" data-read="03 MIN">
      <BrushH2 cn="我在想的问题" en="Thinking Aloud" />

      <div className="thoughts" ref={containerRef}>
        <div className="thought t1">
          <div className="idx">i.</div>
          <div className="text">
            <h4>
              一个人，
              <span className="word" style={{ position: 'relative', display: 'inline-block' }}>
                一个 Agent
                <span className="accent" style={{ left: -8, right: -8, top: -6, bottom: -6, position: 'absolute' }}>
                  <svg viewBox="0 0 220 60" preserveAspectRatio="none">
                    <path d="M 18 18 C 8 14, 6 38, 22 46 C 60 56, 130 54, 192 46 C 210 42, 214 22, 198 14 C 150 4, 70 6, 22 14 C 18 16, 14 18, 18 22" />
                  </svg>
                </span>
              </span>
              <span className="sq sm" style={{ marginLeft: 4 }} />
            </h4>
            <p>
              未来每个人应该只有一个 Agent，而不是每个产品里塞一个互不相通的 AI 助手。它能接入不同平台和硬件，但
              <em>归属、记忆、人格始终属于用户自己</em>。今天的碎片化不是技术问题，是结构问题——每个平台都想留住自己那份用户数据。这也是我做个人 AI 产品时最关心的问题：AI 不应该只是某个产品里的功能入口，而应该逐渐成为用户自己的
              <span className="ann">
                计算层
                <svg viewBox="0 0 100 14" preserveAspectRatio="none">
                  <path d="M 2 9 C 20 4, 50 12, 98 6" />
                </svg>
              </span>。
            </p>
          </div>
        </div>

        <div className="thought t2">
          <div className="idx">ii.</div>
          <div className="text">
            <h4>
              你不拥有你的 Agent，<br />你只是在
              <span className="word" style={{ position: 'relative', display: 'inline-block' }}>
                租用
                <span className="accent" style={{ left: -10, right: -10, top: -8, bottom: -8, position: 'absolute' }}>
                  <svg viewBox="0 0 120 60" preserveAspectRatio="none">
                    <path d="M 10 22 C 4 14, 14 6, 38 8 C 80 10, 116 12, 112 30 C 108 50, 60 56, 22 50 C 8 46, 4 30, 14 22" />
                  </svg>
                </span>
              </span>
              它
              <span className="sq sm" style={{ marginLeft: 4 }} />
            </h4>
            <p>
              Agent 要成为个体的延伸，前提是它能调动用户自己的数据。今天这些数据散落在几十个平台里，
              <em>被当作平台资产而不是用户资产</em>。不解决这件事，Agent 的能力天花板很低。所以我关注的不只是模型能力，也包括
              <span className="ann">
                数据授权
                <svg viewBox="0 0 100 14" preserveAspectRatio="none">
                  <path d="M 2 8 C 22 3, 52 13, 98 7" />
                </svg>
              </span>、上下文所有权和跨平台调用边界。
            </p>
          </div>
        </div>

        <div className="thought t3">
          <div className="idx">iii.</div>
          <div className="text">
            <h4>
              <span className="word" style={{ position: 'relative', display: 'inline-block' }}>
                手机
                <span className="accent" style={{ left: -10, right: -10, top: -8, bottom: -8, position: 'absolute' }}>
                  <svg viewBox="0 0 120 60" preserveAspectRatio="none">
                    <path d="M 14 18 C 6 14, 8 38, 24 46 C 70 56, 110 50, 114 32 C 116 14, 80 6, 38 8 C 22 10, 12 14, 16 22" />
                  </svg>
                </span>
              </span>
              不是 AI 时代的硬件
              <span className="sq sm" style={{ marginLeft: 4 }} />
            </h4>
            <p>
              手机是为「人主动操作信息」设计的，但与 AI 的交互不需要这么重的设备。下一代硬件会更轻、更贴身，甚至从「一个设备」变成
              <em>「分布在身边的多个节点」</em>。屏幕不会消失，会从中心退到边缘。我对这个问题的兴趣，不是&quot;做一个新设备&quot;的消费电子幻想，而是重新理解 AI 交互的
              <span className="ann">
                输入、输出、在场性和打断成本
                <svg viewBox="0 0 100 14" preserveAspectRatio="none">
                  <path d="M 2 9 C 24 4, 52 13, 98 5" />
                </svg>
              </span>。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

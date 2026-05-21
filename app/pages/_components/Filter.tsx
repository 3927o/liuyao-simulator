'use client';

import { useEffect, useRef } from 'react';

/**
 * §07 我们是否合适？  filter h2 字符 stagger 入场 + 双栏（我能做的 / 在找）
 */
export function Filter() {
  const headRef = useRef<HTMLDivElement>(null);

  // §07 的 h2 同样需要拆字符 stagger
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const h2 = el.querySelector('h2');
    if (h2 && !h2.dataset.split) {
      h2.dataset.split = '1';
      let counter = 0;
      const walk = (node: Node, frag: DocumentFragment) => {
        [...node.childNodes].forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            [...(child.textContent ?? '')].forEach(ch => {
              if (/\s/.test(ch)) {
                frag.appendChild(document.createTextNode(ch));
              } else {
                const s = document.createElement('span');
                s.className = 'char';
                s.style.setProperty('--i', String(counter++));
                s.textContent = ch;
                frag.appendChild(s);
              }
            });
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const c = child as Element;
            if (c.tagName === 'BR') {
              frag.appendChild(c.cloneNode());
            } else {
              const clone = c.cloneNode(false);
              walk(c, clone as unknown as DocumentFragment);
              frag.appendChild(clone);
            }
          }
        });
      };
      const frag = document.createDocumentFragment();
      walk(h2, frag);
      h2.innerHTML = '';
      h2.appendChild(frag);
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) el.classList.add('in'); });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="filter" className="filter" data-section="§07 — A MUTUAL FILTER" data-read="02 MIN">
      <div className="f-head" ref={headRef}>
        <h2>
          我们是否<br /><em>合适</em><span className="q">?</span>
        </h2>
      </div>

      <div className="filter-cols">
        <div className="left can">
          <h3>我能做的</h3>
          <p>
            我不用工具清单介绍自己。具体用什么，看简历。我擅长的是
            <em>从一个模糊的产品想法走到可以被使用的东西</em>——这中间通常需要：
          </p>
          <ol>
            <li><b>判断要做什么。</b>把&quot;用户说想要 X&quot;翻译成&quot;实际要解决的是 Y&quot;，并判断 Y 值不值得做。</li>
            <li><b>决定怎么做。</b>技术选型不是选最新的，是选最适合这个问题量级和团队规模的。</li>
            <li><b>独立实现。</b>Agent 开发、前后端、测试、运维，能在早期不确定阶段独立完成原型、验证和上线，把想法推进到可以被讨论、使用和迭代的状态。</li>
            <li><b>和团队一起迭代。</b>包括把自己的判断说清楚、听懂别人的判断、在分歧里推进而不是搁置。</li>
          </ol>
          <p style={{ marginTop: 36 }}>
            在有共识的小团队里，我可以同时承担产品判断和工程交付——
            <em>不是因为我两样都最强，而是因为我相信这两件事本来就不该被切开。</em>
          </p>
          <p>我不要求所有问题都来自我自己的兴趣，但我需要知道它为什么重要，以及当前方案为什么值得做。</p>
        </div>

        <div className="right seeking">
          <h3>在找</h3>
          <ul>
            <li><span>有产品决策空间，工程师不只是实现已定方案。</span></li>
            <li><span>团队有自己的产品判断，不只是追逐风口或承接外部叙事。</span></li>
            <li><span>协作基于信任、结果和判断质量，而不是表演性的忙碌。</span></li>
            <li><span>允许直接表达分歧的文化氛围。</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RTAnnotation, RTPreset, RTQuestion, RTQuestionOption, RTVersion } from './types';

type Mode = 'original' | 'questioning' | 'tailored';

type ChatTurn =
  | { role: 'ai'; text: string }
  | { role: 'user'; text: string };

interface ReadTailorDemoProps {
  preset: RTPreset;
  /**
   * card  —— 默认。固定高的卡片容器，用于 rt-grid 并排展示。
   * inline —— 文章里直出，content-driven 高度（chat / body 自适应）。
   */
  variant?: 'card' | 'inline';
}

/**
 * ReadTailor 演示组件 · 三态机 + AI 对话问询：
 *   original    → 干净原文 + "为我改造" CTA
 *   questioning → AI 逐题问询，用户点 chip 作答（不打字），AI 给 ack + 下一题；
 *                 答完最后一题，AI 给"开始改造 / 换个问题"
 *   tailored    → 同一份原文 + 改造层（lead 卡片 / 内联夹注 / 边注 / 推理补全）
 *
 * 关键设计点：
 *   - 原文段落本身在三态间不变，annotations 是叠加层。"还原" 时只摘掉 layer。
 *   - 对话感全部来自 UI：气泡、avatar tag、"思考中..."、ack 复述用户答案。
 *   - 没有 NLU —— 用户只能点 chip 回答，避免 POC 阶段假装识别意图。
 */
export function ReadTailorDemo({
  preset,
  variant = 'card',
}: ReadTailorDemoProps) {
  const [mode, setMode] = useState<Mode>('original');
  const [answers, setAnswers] = useState<Record<string, { value: string; label: string }>>({});
  /** 对话流 —— 每条 turn 是一条气泡（ai 或 user）。 */
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  /** 当前等待用户回答的问题索引；'ready' 表示全部答完、等待 confirm。 */
  const [step, setStep] = useState<number | 'ready'>(0);
  /** AI 在出下一条之前的短暂思考态，加点拟真停顿。 */
  const [thinking, setThinking] = useState(false);
  /** mountKey 每次进入 tailored 都 +1，用来强制重启入场动画。 */
  const [mountKey, setMountKey] = useState(0);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 新 turn / 思考态变化时把对话滚到底
  useEffect(() => {
    if (mode !== 'questioning') return;
    const el = chatScrollRef.current;
    if (!el) return;
    // 等下一帧让新 DOM 进入再滚，避免还没排版就 scroll 到老高度
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [turns, thinking, mode]);

  /** 当前 tailored 选中的 version；只在 tailored 态计算。 */
  const activeVersion = useMemo<RTVersion | null>(() => {
    if (mode !== 'tailored') return null;
    const flatAnswers = Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [k, v.value]),
    );
    return pickVersion(preset, flatAnswers);
  }, [mode, answers, preset]);

  const annoByParagraph = useMemo(() => {
    const map = new Map<number, RTAnnotation[]>();
    if (!activeVersion) return map;
    for (const a of activeVersion.annotations) {
      if (a.kind === 'lead') continue;
      const arr = map.get(a.pIdx) ?? [];
      arr.push(a);
      map.set(a.pIdx, arr);
    }
    return map;
  }, [activeVersion]);

  const leadAnno = useMemo(
    () => activeVersion?.annotations.find(a => a.kind === 'lead') ?? null,
    [activeVersion],
  );

  // ── 对话控制 ───────────────────────────────────────────────────
  const startQuestioning = useCallback(() => {
    setMode('questioning');
    setAnswers({});
    setStep(0);
    setThinking(false);
    const firstQ = preset.questions[0];
    const opener = preset.chat.intro
      ? `${preset.chat.intro}${firstQ.prompt}`
      : firstQ.prompt;
    setTurns([{ role: 'ai', text: opener }]);
  }, [preset]);

  const pickOption = useCallback(
    (opt: RTQuestionOption) => {
      if (typeof step !== 'number') return;
      if (thinking) return;
      const q = preset.questions[step];
      if (!q) return;

      // 1. 用户气泡
      setTurns(t => [...t, { role: 'user', text: opt.label }]);
      // 2. 记答案
      const nextAnswers = { ...answers, [q.id]: { value: opt.value, label: opt.label } };
      setAnswers(nextAnswers);
      // 3. AI 思考中
      setThinking(true);

      // 4. ~700ms 后给 AI 回应
      window.setTimeout(() => {
        const ack = formatAck(q.ack, opt.label);
        const isLast = step === preset.questions.length - 1;

        let aiText: string;
        if (isLast) {
          const flat = Object.fromEntries(
            Object.entries(nextAnswers).map(([k, v]) => [k, v.value]),
          );
          const v = pickVersion(preset, flat);
          const labels = preset.questions.map(qq => nextAnswers[qq.id]?.label ?? '');
          aiText = `${ack}${formatSummary(preset.chat.summary, labels, v.name)}`;
          setStep('ready');
        } else {
          aiText = `${ack}${preset.questions[step + 1].prompt}`;
          setStep(step + 1);
        }
        setTurns(t => [...t, { role: 'ai', text: aiText }]);
        setThinking(false);
      }, 700);
    },
    [answers, preset, step, thinking],
  );

  const handleConfirm = useCallback(() => {
    if (step !== 'ready') return;
    setMountKey(k => k + 1);
    setMode('tailored');
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [step]);

  const handleCancel = useCallback(() => {
    setMode('original');
    setAnswers({});
    setTurns([]);
    setStep(0);
    setThinking(false);
  }, []);

  const handleRevert = useCallback(() => {
    setMode('original');
    setAnswers({});
    setTurns([]);
    setStep(0);
  }, []);

  const handleRetailor = useCallback(() => {
    // 再改造 = 重开对话，丢掉旧答案
    startQuestioning();
  }, [startQuestioning]);

  // 当前等待用户回答的题，用来显示对应 chip
  const currentQuestion: RTQuestion | null =
    typeof step === 'number' && !thinking ? preset.questions[step] ?? null : null;

  // ── 渲染 ──────────────────────────────────────────────────────────
  const wrapperClass = variant === 'card' ? 'rt-cell rt-root' : 'rt-root rt-inline';

  // 状态条文案：title 始终是书名，state pill 描述当前态 + tailored 时附 version
  const stateLabel =
    mode === 'tailored' && activeVersion
      ? `已改造 · ${activeVersion.name}`
      : mode === 'questioning'
      ? '改造问询中'
      : '原版';

  return (
    <div className={wrapperClass} data-mode={mode}>
      <div className="rt-bar">
        <div className="rt-bar-info">
          <div className="rt-bar-title">{preset.source.attribution}</div>
          <div className="rt-bar-status" data-state={mode}>
            <span className="rt-bar-dot" />
            <span className="rt-bar-state-text">{stateLabel}</span>
          </div>
        </div>
        <div className="rt-bar-actions">
          {mode === 'original' && (
            <button type="button" className="rt-btn rt-btn-primary" onClick={startQuestioning}>
              为我改造 <span className="rt-arrow">→</span>
            </button>
          )}
          {mode === 'questioning' && (
            <button type="button" className="rt-btn rt-btn-ghost" onClick={handleCancel}>
              取消
            </button>
          )}
          {mode === 'tailored' && (
            <>
              <button type="button" className="rt-btn rt-btn-ghost" onClick={handleRetailor}>
                再改造
              </button>
              <button type="button" className="rt-btn rt-btn-primary" onClick={handleRevert}>
                <span className="rt-arrow rt-arrow-back">←</span> 还原
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`rt-chat ${mode === 'questioning' ? 'rt-chat-open' : ''}`}>
        <div className="rt-chat-inner">
          <div className="rt-chat-scroll" ref={chatScrollRef}>
            {turns.map((t, i) => (
              <div key={i} className={`rt-msg rt-msg-${t.role}`}>
                {t.role === 'ai' && <div className="rt-msg-tag">RT</div>}
                <div className="rt-msg-bubble">{t.text}</div>
              </div>
            ))}
            {thinking && (
              <div className="rt-msg rt-msg-ai rt-msg-thinking">
                <div className="rt-msg-tag">RT</div>
                <div className="rt-msg-bubble">
                  <span className="rt-dot" />
                  <span className="rt-dot" />
                  <span className="rt-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="rt-chat-foot">
            {currentQuestion && (
              <div className="rt-chat-chips" aria-label="quick replies">
                {currentQuestion.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className="rt-pill rt-chip"
                    onClick={() => pickOption(opt)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'ready' && (
              <div className="rt-chat-confirm">
                <button type="button" className="rt-btn rt-btn-ghost" onClick={handleRetailor}>
                  换个问题
                </button>
                <button type="button" className="rt-btn rt-btn-primary" onClick={handleConfirm}>
                  开始改造 <span className="rt-arrow">→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rt-body" ref={bodyRef} key={mountKey}>
        {leadAnno && leadAnno.kind === 'lead' && (
          <aside className="rt-anno rt-lead" style={{ animationDelay: '60ms' }}>
            <div className="rt-lead-head">
              <span className="rt-anno-kicker">章节导读</span>
              {leadAnno.triggeredBy && (
                <span className="rt-anno-trigger">触发 · {leadAnno.triggeredBy}</span>
              )}
            </div>
            <h4 className="rt-lead-title">{leadAnno.title}</h4>
            <ul className="rt-lead-list">
              {leadAnno.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </aside>
        )}

        {preset.source.paragraphs.map((text, pIdx) => {
          const annos = annoByParagraph.get(pIdx) ?? [];
          const glosses = annos.filter(
            (a): a is Extract<RTAnnotation, { kind: 'gloss' }> => a.kind === 'gloss',
          );
          const highlights = annos.filter(
            (a): a is Extract<RTAnnotation, { kind: 'highlight' }> => a.kind === 'highlight',
          );
          const blocks = annos.filter(a => a.kind !== 'gloss' && a.kind !== 'highlight');

          const paraDelay = 60 + (leadAnno ? 100 : 0) + pIdx * 80;

          return (
            <div key={pIdx} className="rt-p-wrap">
              <p className="rt-p">{renderParagraph(text, glosses, highlights)}</p>
              {blocks.map((a, i) => {
                const delay = paraDelay + 40 + i * 60;
                if (a.kind === 'margin') {
                  return (
                    <aside
                      key={`m-${pIdx}-${i}`}
                      className="rt-anno rt-margin"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      <div className="rt-anno-head">
                        <span className="rt-anno-kicker">脉络</span>
                        {a.triggeredBy && (
                          <span className="rt-anno-trigger">触发 · {a.triggeredBy}</span>
                        )}
                      </div>
                      <div className="rt-margin-body">
                        {a.anchor && <span className="rt-margin-anchor">{a.anchor}</span>}
                        <span className="rt-margin-text">{a.text}</span>
                      </div>
                    </aside>
                  );
                }
                if (a.kind === 'fillin') {
                  return (
                    <aside
                      key={`f-${pIdx}-${i}`}
                      className="rt-anno rt-fillin"
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      <div className="rt-anno-head">
                        <span className="rt-anno-kicker">推理补全 ↳</span>
                        {a.triggeredBy && (
                          <span className="rt-anno-trigger">触发 · {a.triggeredBy}</span>
                        )}
                      </div>
                      <p className="rt-fillin-text">{a.expansion}</p>
                    </aside>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────

type GlossAnno = Extract<RTAnnotation, { kind: 'gloss' }>;
type HighlightAnno = Extract<RTAnnotation, { kind: 'highlight' }>;

type Seg =
  | string
  | { kind: 'gloss'; gloss: string }
  | { kind: 'highlight'; text: string };

/**
 * 把段落文本切成段：原文 string、{gloss} 插入、{highlight} 包裹。
 *
 * 处理顺序：先 highlight 再 gloss。highlight 只在 string segment 上切片并包出
 * `{kind:'highlight'}`；gloss 也只在 string segment 上插入，所以两类锚点重叠时
 * 后者会失效（preset 作者请避免重叠）。
 *
 * 每条 annotation 都做"首次出现"匹配 + 命中后短路（injected flag），避免同段
 * 多次插入。
 */
function renderParagraph(text: string, glosses: GlossAnno[], highlights: HighlightAnno[]) {
  if (glosses.length === 0 && highlights.length === 0) return text;

  let segs: Seg[] = [text];

  // 先 highlight：把 anchor 子串从 string segment 中切出来，标记成 highlight。
  for (const h of highlights) {
    segs = splitFirstStringMatch(segs, h.anchor, (matched) => ({
      kind: 'highlight',
      text: matched,
    }));
  }

  // 后 gloss：找到 anchor，在 anchor 之后插入 gloss 段（anchor 本身保留在前 string 里）。
  for (const g of glosses) {
    const next: Seg[] = [];
    let injected = false;
    for (const seg of segs) {
      if (injected || typeof seg !== 'string') {
        next.push(seg);
        continue;
      }
      const idx = seg.indexOf(g.anchor);
      if (idx === -1) {
        next.push(seg);
        continue;
      }
      next.push(seg.slice(0, idx + g.anchor.length));
      next.push({ kind: 'gloss', gloss: g.gloss });
      next.push(seg.slice(idx + g.anchor.length));
      injected = true;
    }
    segs = next;
  }

  return segs.map((s, i) => {
    if (typeof s === 'string') return <span key={i}>{s}</span>;
    if (s.kind === 'highlight') {
      return (
        <mark key={i} className="rt-highlight">
          {s.text}
        </mark>
      );
    }
    return (
      <span key={i} className="rt-gloss">
        <span className="rt-gloss-bracket">⌜</span>
        <span className="rt-gloss-text">{s.gloss}</span>
        <span className="rt-gloss-bracket">⌟</span>
      </span>
    );
  });
}

/** 在 segs 里找第一个匹配 anchor 的 string segment，把它切成"前 / wrap / 后"三段。 */
function splitFirstStringMatch(
  segs: Seg[],
  anchor: string,
  wrap: (matched: string) => Seg,
): Seg[] {
  const next: Seg[] = [];
  let injected = false;
  for (const seg of segs) {
    if (injected || typeof seg !== 'string') {
      next.push(seg);
      continue;
    }
    const idx = seg.indexOf(anchor);
    if (idx === -1) {
      next.push(seg);
      continue;
    }
    if (idx > 0) next.push(seg.slice(0, idx));
    next.push(wrap(anchor));
    const tail = seg.slice(idx + anchor.length);
    if (tail) next.push(tail);
    injected = true;
  }
  return next;
}

function pickVersion(preset: RTPreset, answers: Record<string, string>): RTVersion {
  const weights = new Map<string, number>();
  for (const q of preset.questions) {
    weights.set(q.id, q.weight ?? 1);
  }
  const scored = preset.versions.map(v => ({ v, s: scoreVersion(v, answers, weights) }));
  scored.sort((a, b) => b.s - a.s);
  const top = scored[0];
  if (!top || top.s === 0) {
    return preset.versions.find(v => v.id === preset.fallbackVersionId) ?? preset.versions[0];
  }
  return top.v;
}

function scoreVersion(
  v: RTVersion,
  answers: Record<string, string>,
  weights: Map<string, number>,
): number {
  let score = 0;
  for (const [key, want] of Object.entries(v.match)) {
    if (want == null) continue;
    const got = answers[key];
    if (got == null) continue;
    const w = weights.get(key) ?? 1;
    if (Array.isArray(want)) {
      if (want.includes(got)) score += w;
    } else if (want === got) {
      score += w;
    }
  }
  return score;
}

function formatAck(template: string | undefined, label: string): string {
  const t = template ?? '听起来是【{label}】。';
  return t.replace(/\{label\}/g, label);
}

function formatSummary(template: string, labels: string[], versionName: string): string {
  let out = template.replace(/\{version\}/g, versionName);
  labels.forEach((l, i) => {
    out = out.replace(new RegExp(`\\{l${i}\\}`, 'g'), l);
  });
  return out;
}

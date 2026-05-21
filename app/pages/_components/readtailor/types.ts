/**
 * ReadTailor demo —— 类型定义。
 * 演示组件本身是一个 *阅读改造器*：拿原文 + 问卷 + 多个改造版本作为输入，
 * 按用户的答案命中评分挑出最契合的 version，把它的 annotations 叠加到原文上。
 *
 * 设计上有意把"原文"和"改造层"分开存：toggle 还原时不重建段落，只摘掉
 * annotations，让用户感到改造的是阅读体验本身，不是文本。
 */

export type RTSource = {
  /** 书名 / 章节出处，显示在顶 bar，如 "海德格尔《存在与时间》§9"。 */
  attribution: string;
  /** 原文段落数组，按顺序渲染。富文本通过 JSX 段落而非 markdown。 */
  paragraphs: string[];
};

export type RTQuestionOption = {
  value: string;
  label: string;
};

export type RTQuestion = {
  /** 内部 id，version.match 通过它对齐答案。 */
  id: string;
  /**
   * AI 在对话中提出此问题的话术。
   * 第一道题的 prompt 会拼在 `chat.intro` 之后；后续会拼在 ack 之后。
   */
  prompt: string;
  /**
   * 用户答完此题后的确认话术。可选 —— 缺省 "听起来是【{label}】。"。
   * 模板可用 `{label}` 引用用户选项的 label。
   */
  ack?: string;
  /**
   * 该题在 version 评分时贡献的权重；缺省 1。
   * 通常把"阻碍"权重设 2（项目主张里 obstacle 才是真正的方向信号），
   * "目的"留 1 作 tie-breaker —— 这样 obstacle 单独命中就能压过 purpose 单独命中。
   */
  weight?: number;
  options: RTQuestionOption[];
};

export type RTChatScript = {
  /** AI 自我介绍 / 破冰；会与第一道题的 prompt 拼成一个气泡。 */
  intro?: string;
  /**
   * 全部题答完后的最终总结模板。占位符：
   *   `{version}` —— 命中 version 的 name
   *   `{l0}` `{l1}` `{l2}` ... —— 第 i 题用户答案的 label
   */
  summary: string;
};

/**
 * Annotation —— 改造层的最小单位。五种 kind 对应项目主张里的几类改造手段：
 *   lead      章节导读卡 · 顶部插入
 *   gloss     术语内联夹注 · 段落内 anchor 词后展开
 *   margin    边注 · 段落侧的脉络/对话标注
 *   fillin    推理补全 · 段落之间插入灰底块
 *   highlight 关键句标记 · 在原文 anchor 子串上画 acid 下划线（不加内容，只改呈现）
 *
 * pIdx        paragraph index（0-based）。gloss/margin/fillin/highlight 都锚到具体段落。
 * anchor      段落里要锚定的子串（首次出现）。
 * triggeredBy 该 annotation 因哪个答案产生，显示在卡片上让用户感到 AI 在
 *             "针对性"工作，而不是泛泛改造。
 */
export type RTAnnotation =
  | {
      kind: 'lead';
      title: string;
      bullets: string[];
      triggeredBy?: string;
    }
  | {
      kind: 'gloss';
      pIdx: number;
      anchor: string;
      gloss: string;
      triggeredBy?: string;
    }
  | {
      kind: 'margin';
      pIdx: number;
      anchor: string;
      text: string;
      triggeredBy?: string;
    }
  | {
      kind: 'fillin';
      pIdx: number;
      /** 锚句末尾子串（末尾的标点也算）。fillin 会插在这句之后、下一句之前。 */
      after: string;
      expansion: string;
      triggeredBy?: string;
    }
  | {
      kind: 'highlight';
      pIdx: number;
      /** 要画下划线的子串（首次出现）。和 gloss/margin 的 anchor 不要重叠，否则切片会脏。 */
      anchor: string;
      triggeredBy?: string;
    };

export type RTVersion = {
  id: string;
  /** 一句话标签，displayed in tailored 态顶 bar，如 "为你 · 论证脉络版"。 */
  name: string;
  /**
   * 该版本擅长的"阻碍 × 目的"区间。部分匹配即可。
   * 值用 string 表示恰好一个答案，用 string[] 表示这几个答案都算命中
   * （V2 论证脉络版要同时覆盖"脉络"和"推理"两种阻碍就需要数组形式）。
   */
  match: Partial<Record<string, string | string[]>>;
  annotations: RTAnnotation[];
};

export type RTPreset = {
  source: RTSource;
  /** AI 对话脚本 —— intro + 每题 prompt/ack + 最终 summary 共同串成一次对话。 */
  chat: RTChatScript;
  questions: RTQuestion[];
  versions: RTVersion[];
  /** 不命中任何 version 时的兜底。建议指向覆盖面最广的版本。 */
  fallbackVersionId: string;
};

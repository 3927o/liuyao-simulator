import type { RTPreset } from '../types';

/**
 * Preset · 海德格尔《存在与时间》§9 节选。
 *
 * 选这一节有三个用意：
 *   1. 引入 Dasein 这个核心术语 —— 能演示「内联夹注」。
 *   2. 出现"本质在于存在"等典型海式跳跃 —— 能演示「推理补全」。
 *   3. 显式回收 §2 的循环 —— 能演示「脉络回溯」。
 * 三种 annotation 形态在一段文本里都能落得到。
 *
 * 原文为意译化的中文呈现，保留海德格尔的术语颗粒度（Dasein / Existenz /
 * Jemeinigkeit / Eigentlichkeit），方便 gloss / margin 锚点。
 */

export const HEIDEGGER_DASEIN_PRESET: RTPreset = {
  source: {
    attribution: '海德格尔《存在与时间》§9 此在分析的课题',
    paragraphs: [
      '在所有的存在者当中，我们自己始终是那一个特殊的存在者：我们的存在方式是这样的——我们在自己的存在中已经对这个存在本身有所领会。我们用 Dasein 这个名称来标识这种存在者。',
      '此在的"本质"在于它的去存在。这意味着，要描述这种存在者，不能像描述桌子或石头那样列举它的属性。它的种种属性，总是已经被它的去存在所贯穿。',
      '此在向来是我的存在。这种存在者的"是"必须始终通过人称代词来言谈：我是、你是。它从不作为一个无主的"类"出现。',
      '由此，关于此在的发问从一开始就有一个特殊困难：发问者本身就是被问及的存在者。这正是我们在 §2 提出存在追问时所遇到的循环——但这个循环并不是恶性的。',
      '既然此在的存在是它自己的存在，它就有两种可能：本真地是它自己，或者沉沦在非本真的种种"人"的方式中。这两种可能不是属性，而是此在的存在方式本身。',
    ],
  },

  chat: {
    intro: '嗨，我帮你改造这一节。先问你两个问题——',
    summary: '所以你卡在【{l0}】，想【{l1}】。我用「{version}」给你改这一节。',
  },

  questions: [
    {
      id: 'obstacle',
      prompt: '刚才读到哪里你想停下？',
      ack: '嗯，是【{label}】。',
      // 阻碍是真正决定改造方向的信号，权重 2 用来盖过 purpose 单独命中。
      weight: 2,
      options: [
        { value: 'term', label: '看到陌生术语' },
        { value: 'thread', label: '论证跟不上' },
        { value: 'leap', label: '推理跳得太快' },
        { value: 'context', label: '不知道在反驳谁' },
      ],
    },
    {
      id: 'purpose',
      prompt: '那你想从这本书里得到什么？',
      ack: '【{label}】，明白。',
      // 目的只做 tie-breaker，权重 1（默认值，写出来强调意图）。
      weight: 1,
      options: [
        { value: 'deep', label: '想真正读懂' },
        { value: 'intro', label: '入门，建立画面' },
        { value: 'locate', label: '找某个论点' },
      ],
    },
  ],

  versions: [
    // ── V1 · 白话铺垫版 ─────────────────────────────────────────────
    {
      id: 'v1-plain',
      name: '为你 · 白话铺垫版',
      match: { obstacle: 'term', purpose: ['intro', 'locate'] },
      annotations: [
        {
          kind: 'lead',
          title: '这一节在做什么',
          bullets: [
            '海德格尔给"人"换了个新名字：此在（Dasein）',
            '强调一件事：人不能像物那样被描述',
            '因为人始终在"成为自己"的过程里',
          ],
          triggeredBy: '术语陌生 · 入门视角',
        },
        {
          kind: 'highlight',
          pIdx: 1,
          anchor: '此在的"本质"在于它的去存在',
          triggeredBy: '入门视角 · 标出本节核心命题',
        },
        {
          kind: 'gloss',
          pIdx: 0,
          anchor: 'Dasein',
          gloss: '此在 · 一种始终在追问"我是什么"的存在者。海德格尔不用"人"，是为了甩开传统形而上学的包袱。',
          triggeredBy: '术语陌生',
        },
        {
          kind: 'gloss',
          pIdx: 1,
          anchor: '去存在',
          gloss: '不是名词，是动词性的"在去成为"。强调不是已完成的状态，而是不断进行的活动。',
          triggeredBy: '术语陌生',
        },
        {
          kind: 'gloss',
          pIdx: 4,
          anchor: '沉沦',
          gloss: '不是道德意义的堕落，而是日常生活中"按大家说的那样活着"的状态。中性词。',
          triggeredBy: '术语陌生',
        },
      ],
    },

    // ── V2 · 论证脉络版 ─────────────────────────────────────────────
    {
      id: 'v2-thread',
      name: '为你 · 论证脉络版',
      match: { obstacle: ['thread', 'leap'], purpose: 'deep' },
      annotations: [
        {
          kind: 'lead',
          title: '本节论证步骤',
          bullets: [
            '① 定位一种特殊的存在者：在自身存在中已对存在有所领会',
            '② 声明这种存在者的本质不是属性集合，而是"去存在"',
            '③ 导出"向来我属性"作为方法论原则',
            '④ 把发问的循环纳入方法，不规避（回收 §2）',
            '⑤ 从存在的"自己性"导出本真 / 非本真二分',
          ],
          triggeredBy: '论证脉络 · 研读视角',
        },
        {
          kind: 'highlight',
          pIdx: 0,
          anchor: '我们在自己的存在中已经对这个存在本身有所领会',
          triggeredBy: '研读视角 · 标出步骤 ①',
        },
        {
          kind: 'fillin',
          pIdx: 1,
          after: '它的种种属性，总是已经被它的去存在所贯穿。',
          expansion:
            '换句话说：当你说"他是诚实的"，你不是在描述一个静态属性——这个"诚实"本身是他在每一次具体选择中"去诚实地存在"才得以维持的。属性不再是事物的边界，而是一种待履行的存在方式。',
          triggeredBy: '推理跳跃 · 补全省略步骤',
        },
        {
          kind: 'margin',
          pIdx: 2,
          anchor: '我是、你是',
          text: '方法论意义：研究此在不能用第三人称客观化的语气，必须以"我"为入口。',
          triggeredBy: '论证脉络',
        },
        {
          kind: 'margin',
          pIdx: 3,
          anchor: '§2',
          text: '呼应：§2 已指出被问与发问的存在者是同一个，此处是该问题的正式回收。',
          triggeredBy: '论证脉络',
        },
        {
          kind: 'highlight',
          pIdx: 4,
          anchor: '本真地是它自己，或者沉沦在非本真的种种"人"的方式中',
          triggeredBy: '研读视角 · 标出步骤 ⑤ 结论',
        },
        {
          kind: 'fillin',
          pIdx: 4,
          after: '这两种可能不是属性，而是此在的存在方式本身。',
          expansion:
            '为什么不是属性？因为属性可以拆下来分析，而存在方式是"我此刻正在如何存在"。把本真/非本真说成属性，等于又把此在物化了——这正是前面要避免的。',
          triggeredBy: '推理跳跃',
        },
      ],
    },

    // ── V3 · 历史对话版 ─────────────────────────────────────────────
    {
      id: 'v3-dialog',
      name: '为你 · 历史对话版',
      match: { obstacle: 'context' },
      annotations: [
        {
          kind: 'lead',
          title: '这一节在与谁对话',
          bullets: [
            '反对笛卡尔：拒绝把"我"理解为思维实体（res cogitans）',
            '继承胡塞尔：保留"向来我属性"但改造其指向',
            '对抗形而上学：拒绝把"本质"作为属性的总和（亚里士多德传统）',
          ],
          triggeredBy: '背景缺失',
        },
        {
          kind: 'gloss',
          pIdx: 0,
          anchor: 'Dasein',
          gloss: '海德格尔特意不用"人"(Mensch)、"主体"(Subjekt)、"意识"(Bewusstsein)——这三个词分别承载着基督教、近代哲学、胡塞尔的负担。',
          triggeredBy: '术语背景',
        },
        {
          kind: 'margin',
          pIdx: 1,
          anchor: '本质',
          text: '亚里士多德传统中，本质（ousia/essentia）是"是什么"的稳定答案。海德格尔在这里偷换了概念：本质不再是"是什么"，而是"如何去是"。',
          triggeredBy: '历史背景',
        },
        {
          kind: 'margin',
          pIdx: 2,
          anchor: '人称代词',
          text: '笛卡尔用"我思"确立思维实体的存在。海德格尔保留了"我"但去掉了实体化——"我"不指一个东西，而指一种存在方式。',
          triggeredBy: '历史背景',
        },
        {
          kind: 'margin',
          pIdx: 4,
          anchor: '本真',
          text: 'Eigentlichkeit / Uneigentlichkeit 的对子来自克尔凯郭尔的"个体性 vs 群众"，但海德格尔把它从宗教语境抽出来做存在论分析。',
          triggeredBy: '历史背景',
        },
      ],
    },

    // ── V4 · 术语考据版 ─────────────────────────────────────────────
    // 命中 term × deep —— 研读者想要术语的源流和论辩史，不要白话翻译。
    // 与 V1 同样针对 term 阻碍，但风味完全相反：V1 把术语翻成白话，V4 把术语追到源头。
    {
      id: 'v4-philology',
      name: '为你 · 术语考据版',
      match: { obstacle: 'term', purpose: 'deep' },
      annotations: [
        {
          kind: 'lead',
          title: '术语背后的"未说出"',
          bullets: [
            'Dasein 是改写自胡塞尔《现象学的观念》中的 Vorhandensein（"现存"）',
            '"本质在于存在" 在逆转亚里士多德 to ti en einai（"曾是其所是"）',
            '"本真 / 非本真"（Eigentlichkeit）字面是"属于自己的"，词根同 Eigentum（财产）',
          ],
          triggeredBy: '术语陌生 · 研读视角',
        },
        {
          kind: 'highlight',
          pIdx: 1,
          anchor: '此在的"本质"在于它的去存在',
          triggeredBy: '研读视角 · 标出术语战发生的位置',
        },
        {
          kind: 'gloss',
          pIdx: 0,
          anchor: 'Dasein',
          gloss: 'Da(在) + Sein(存在) 复合词。海德格尔不用"人"(Mensch)，因为这个词已经携带笛卡尔"我思"的本体论包袱；不用"主体"(Subjekt) 同理。',
          triggeredBy: '术语源流',
        },
        {
          kind: 'margin',
          pIdx: 1,
          anchor: '本质',
          text: 'ousia / essentia 在亚里士多德处是"存在的总和"——回答"是什么"的稳定核心。海德格尔保留"本质"这个词，但把意思偷换为"如何去是"，是一次刻意的概念劫持。',
          triggeredBy: '历史脉络',
        },
        {
          kind: 'fillin',
          pIdx: 1,
          after: '它的种种属性，总是已经被它的去存在所贯穿。',
          expansion:
            '这是对亚里士多德 to ti en einai（"曾是其所是"）的逆转。在亚氏那里，本质回答"是什么"——已被规定的、过去式的；在海德格尔这里，本质指向"正在去成为"——动名词式的、未完成的。同一个词（essentia），两种时态。',
          triggeredBy: '推理源流',
        },
        {
          kind: 'margin',
          pIdx: 2,
          anchor: '我是、你是',
          text: '笛卡尔《沉思录》的 Ego sum, ego existo——海德格尔保留了"我"的语法位置，但拒绝把它实体化为 res cogitans（思维物）。"我是"在此不指一个东西，而指一种存在的语法。',
          triggeredBy: '历史脉络',
        },
      ],
    },
  ],

  fallbackVersionId: 'v2-thread',
};

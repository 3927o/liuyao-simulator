/**
 * AI 解卦接口
 * POST /api/interpret
 * 接收排盘结果 + 所问之事，调用 DeepSeek，以 NDJSON 流式返回摘要与正文。
 */

import { castMeihua, type MeihuaResult } from '@/lib/MeihuaEngine';
import { getAllTrigramRelations, getSeasonalQi, getTrigramNodes } from '@/lib/MeihuaRelations';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-flash';

// ==========================================
// 请求体类型（与前端 LiuYaoEngine / TimeBot 输出对齐）
// ==========================================

interface LinePayload {
  index: number;
  isYang: boolean;
  isMoving: boolean;
  gan: string;
  zhi: string;
  wuXing: string;
  relation: string;
  beast: string;
  isShi: boolean;
  isYing: boolean;
  hidden?: { gan: string; zhi: string; wuXing: string; relation: string };
}

interface LiuYaoInterpretRequest {
  module?: 'liuyao';
  question?: string;
  time: {
    year: string;
    month: string;
    day: string;
    hour: string;
    kongWang: string;
    monthBranch: string;
    dayBranch: string;
    shenSha: { yiMa: string; taoHua: string; luShen: string; guiRen: string[] };
  };
  hex: {
    name: string;
    palace: string;
    palaceElement: string;
    changedName?: string;
    lines: LinePayload[];
    changedLines: LinePayload[];
  };
}

interface MeihuaInterpretRequest {
  module: 'meihua';
  question?: string;
  meihua: { datePart: string; timePart: string };
}

type InterpretRequest = LiuYaoInterpretRequest | MeihuaInterpretRequest;

interface InterpretStreamEvent {
  summary?: string;
  content?: string;
}

// ==========================================
// 排盘文本化
// ==========================================

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function formatPaiPan(data: LiuYaoInterpretRequest): string {
  const { time, hex } = data;
  const hasMoving = hex.lines.some((l) => l.isMoving);

  const rows: string[] = [];
  // 自上而下（上爻 → 初爻）
  for (let i = 5; i >= 0; i--) {
    const line = hex.lines[i];
    const changed = hex.changedLines[i];
    const parts: string[] = [
      YAO_NAMES[i],
      line.beast,
      `${line.relation}${line.gan}${line.zhi}${line.wuXing}`,
      line.isYang ? '▅▅▅▅▅' : '▅▅　▅▅',
    ];
    if (line.isShi) parts.push('世');
    if (line.isYing) parts.push('应');
    if (line.hidden) {
      parts.push(`（伏神：${line.hidden.relation}${line.hidden.gan}${line.hidden.zhi}${line.hidden.wuXing}）`);
    }
    if (line.isMoving) {
      parts.push(`${line.isYang ? '○' : '×'}动 → ${changed.relation}${changed.gan}${changed.zhi}${changed.wuXing}`);
    }
    rows.push(parts.join(' '));
  }

  return [
    `起卦时间：${time.year}年 ${time.month}月 ${time.day}日 ${time.hour}时`,
    `月建：${time.monthBranch}　日辰：${time.dayBranch}（${time.day}日）　旬空：${time.kongWang}`,
    `神煞：驿马-${time.shenSha.yiMa}　桃花-${time.shenSha.taoHua}　禄神-${time.shenSha.luShen}　贵人-${time.shenSha.guiRen.join('、')}`,
    '',
    hasMoving
      ? `本卦：${hex.palace}宫 ${hex.name}（宫五行属${hex.palaceElement}）　变卦：${hex.changedName}`
      : `本卦：${hex.palace}宫 ${hex.name}（宫五行属${hex.palaceElement}）　六爻安静，无动爻`,
    '',
    ...rows,
  ].join('\n');
}

function formatMeihua(result: MeihuaResult): string {
  const { lunar, original, mutual, changed, body, use } = result;
  const season = getSeasonalQi(result.datePart, result.timePart);
  const nodes = getTrigramNodes(result);
  return [
    `梅花易数 · 农历时间起卦，实际北京时间：${result.datePart} ${result.timePart}`,
    `取数采用 23 点换日：${lunar.yearGanZhi}年 ${lunar.monthText}月${lunar.dayText} ${lunar.hourBranch}时`,
    `年支数 ${lunar.yearNumber}，农历月数 ${lunar.month}，日数 ${lunar.day}，时支数 ${lunar.hourNumber}；闰月沿用月数`,
    `上卦年月日和 ${result.sums.upper}，除 8 取 ${original.upper.number}（${original.upper.name}）`,
    `下卦年月日时和 ${result.sums.lower}，除 8 取 ${original.lower.number}（${original.lower.name}）`,
    `动爻 ${YAO_NAMES[result.movingLine - 1]}（自下而上，除 6 余 0 取上爻）`,
    `本卦：${original.name}；上卦 ${original.upper.name}${original.upper.element}，下卦 ${original.lower.name}${original.lower.element}`,
    `互卦：${mutual.name}；上卦 ${mutual.upper.name}${mutual.upper.element}，下卦 ${mutual.lower.name}${mutual.lower.element}`,
    `变卦：${changed.name}；上卦 ${changed.upper.name}${changed.upper.element}，下卦 ${changed.lower.name}${changed.lower.element}`,
    `体卦：${body.name}${body.element}（${result.bodyPosition === 'upper' ? '上' : '下'}卦）；用卦：${use.name}${use.element}；${result.relationship}`,
    `节令月参考：${season.monthBranch}月，${season.label}，${season.prosperous}旺${season.declining}衰；节令按实际起卦时刻切换，不随23点换农历日提前进位。`,
    `各经卦卦气：${nodes.map((node) => `${node.label}${node.trigram.name}${node.trigram.element}${node.qi ? `（${node.qi}）` : '（未标旺衰）'}`).join('；')}`,
    '六个经卦的全部两两五行关系（同一经卦在不同位置分别列出）：',
    ...getAllTrigramRelations(nodes).map((relation) => relation.text),
    '未提供具体外应。',
  ].join('\n');
}

const MEIHUA_PROMPT = `你是一位熟悉梅花易数的分析者。排盘采用农历时间起卦，年时取地支序数，月日取农历数，北京时间 23 点换日。
只使用梅花易数方法：体卦代表主体，用卦代表事情或外部条件；动爻所在卦为用，静卦为体。体用生克比和是主要依据，结合季节旺衰，本卦描述初始结构，互卦辅助分析过程，变卦辅助分析趋势。互、变卦均相对原体卦参考，不能把变后体卦另立为主体。
分别审视本卦用卦、互卦上下经卦、变卦上下经卦对原体的生克，再结合其他经卦之间的关系解释助力与制约。优先说明真正影响趋势的关系及其所在阶段，不只分析本卦体用，也不能把十五组关系等权计数或按生多克少直接判吉凶。卦气旺衰仅为节令参考，未标旺衰不代表已知旺相休囚死等级。
不要套用六爻纳甲的世应、六亲、六神、旬空或用神体系。不得编造外应、现实经历或古籍原文。体用不能单独当作确定吉凶；冲突信号说明主次，季节仅作为辅助。时间证据不足时直接说明，不给精确日期。
用户提供问题时，围绕该问题给出倾向、条件和可执行建议；没有问题时，只描述当前状态、互动与变化，不猜感情、工作、财运或健康问题。
先用日常语言给结论，再提供 1–3 条关键卦象依据。术语首次出现附一句白话解释。结论克制，不把推测说成必然，不复述取数过程。
第一行严格输出 SUMMARY: 加不超过 60 字的核心判断与首要行动，不加 Markdown。
空一行后按 Markdown 输出“## 结论先说”“## 为什么这样判断”“## 变化与节奏”“## 行动建议”四节，每节简短，全文不超过 700 字。`;

// 有明确问题时：传统断卦师
const QUESTION_PROMPT = `你是一位熟悉《增删卜易》《卜筮正宗》的六爻分析者。用户会提供完整排盘和所问之事。你的任务不是展示术语，而是依据传统六爻规则，给普通用户一份清楚、克制、可行动的判断。

分析规则：
1. 先在内部判断问题类别并选择一个主用神。问题有多种解释时，在正文明确说明本次采用的理解；不要同时选择多个主用神来回摇摆。
2. 严格按以下优先级判断：用神的旺衰与日月作用 ＞ 动爻、变爻对用神和世爻的作用 ＞ 世应关系 ＞ 卦名象意 ＞ 六神与神煞。后两项只能辅助，不能推翻前面的判断。
3. 每个关键结论必须能对应到具体爻位或生克冲合依据。排盘没有提供的信息不要编造，也不要引用不存在的古籍原文。
4. 出现有利与不利信号并存时，说明哪一方更占主导以及原因。给出明确倾向，但承认卦象表达的是条件和趋势，不把推测包装成必然事实。
5. 应期只给大致时间窗口，并说明触发条件；证据不足时直接说“时间信号不够集中”，不要强行精确到某一天。

易读性规则：
- 先讲用户能直接理解的结论，再补排盘依据。
- 全文只保留 1–3 个真正影响结论的专业术语；术语首次出现时，紧跟一句括号内白话解释。
- 不连续罗列干支、六亲、六神或生克关系，不写成术语清单。
- 每段只表达一个重点，句子尽量短。避免“综合来看、值得注意的是”等空泛套话。
- 建议必须具体，说明现在更适合做什么、避免什么，而不是泛泛地说“谨慎行事”。

输出时，第一行必须严格采用以下格式（不要添加 Markdown 标记）：
SUMMARY: 用不超过 60 字概括“核心判断 + 首要行动”。直接给结论，不复述问题，不堆术语。

此后空一行，再用 Markdown 严格采用以下四节结构：

## 结论先说
用 2–3 句话说明整体倾向、成立条件和最大变量。

## 为什么这样判断
- **主要依据**：先用白话解释，再以“排盘依据：”补充最关键的爻位证据。
- **助力与阻力**：各指出最重要的一项，并说明哪一项更占主导。

## 时间窗口
给出大致时间范围和可能的触发信号；依据不足时坦率说明。

## 行动建议
给出 2–3 条具体、可执行且与卦象依据相连的建议。

全文控制在 700 字以内。`;

// 无问题时：状态诊断（不猜问题、不谈吉凶，只分析世应关系结构）
const DIAGNOSIS_PROMPT = `你是一位熟悉六爻纳甲原理的状态分析者。用户没有提供具体问题。你只能根据世爻、应爻、日月、动爻与变爻，描述此刻可能存在的个人状态、外部互动方式和变化趋势。

边界规则：
1. 严禁猜测用户在问感情、工作、财富或健康，也不要替用户编造现实经历。
2. 严格按以下优先级分析：世爻的旺衰与日月作用 ＞ 动爻、变爻对世爻的作用 ＞ 世应关系 ＞ 六亲与六神 ＞ 卦名象意。六亲、六神和卦名只能辅助，不能单独决定结论。
3. 六亲或六神只代表一种可能倾向，必须结合旺衰和动静交叉验证。证据不足时使用“可能”“更像是”，不要给用户贴上“多疑、焦虑、掌控欲强”等确定性心理标签。
4. 每个关键判断必须对应具体爻位或作用关系。信号冲突时，说明哪一方更强以及原因；排盘没有的信息不要补充。
5. 不谈宿命式的吉凶，只描述当前状态、主要张力、可利用条件和行动节奏。

易读性规则：
- 先讲生活化结论，再补一句简短的排盘依据。
- 全文只保留 1–3 个真正重要的专业术语；术语首次出现时，紧跟括号内白话解释。
- 不连续罗列干支、六亲、六神或生克关系。不要使用“能量模型、交互场域、心理显像”等抽象包装词。
- 每段只说一个重点，句子尽量短。让完全不了解六爻的人也能一次读懂。
- 建议要具体说明现在适合推进、观察、收缩还是设定边界，以及原因。

输出时，第一行必须严格采用以下格式（不要添加 Markdown 标记）：
SUMMARY: 用不超过 60 字概括“当前状态 + 最大张力 + 首要行动”。直接给结论，不复述卦名，不堆术语。

此后空一行，再用 Markdown 严格采用以下三节结构：

## 你现在的状态
- **表面状态**：用白话描述当前呈现出来的行动方式。
- **内在动力**：说明行动力是充足、受阻还是反复，并以“排盘依据：”补充一句关键证据。

## 你和外部环境
- **互动方式**：说明目前更像主动输出、被动承压、获得支持、尝试控制还是保持平衡。
- **关键变量**：只分析影响最大的一处动爻或外部作用；静卦则说明现状为何可能持续。

## 接下来怎么做
先用一句话指出当前真正需要处理的关键张力，再给出 2–3 条具体行动建议。不要重复 SUMMARY。

全文控制在 600 字以内。`;

// ==========================================
// 路由处理
// ==========================================

export async function POST(req: Request) {
  let body: InterpretRequest;
  let meihuaResult: MeihuaResult | undefined;
  try {
    body = await req.json();
    if (!body || (body.question !== undefined && typeof body.question !== 'string')) throw new Error('bad question');
    if (body.module === 'meihua') {
      // Calculate from inputs on the server so prompts cannot contain fabricated chart data.
      meihuaResult = castMeihua(body.meihua.datePart, body.meihua.timePart);
    } else {
      if ((body.module !== undefined && body.module !== 'liuyao') || !body.time ||
        !Array.isArray(body.hex?.lines) || body.hex.lines.length !== 6 ||
        !Array.isArray(body.hex?.changedLines) || body.hex.changedLines.length !== 6 ||
        !body.hex.lines.every((line) => line && typeof line.relation === 'string' && typeof line.beast === 'string') ||
        !body.hex.changedLines.every((line) => line && typeof line.relation === 'string') ||
        !Array.isArray(body.time.shenSha?.guiRen)) throw new Error('bad payload');
    }
  } catch {
    return new Response('请求体格式错误', { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return new Response('服务端未配置 DEEPSEEK_API_KEY', { status: 500 });

  const question = body.question?.trim();
  const userPrompt = [
    body.module === 'meihua' ? formatMeihua(meihuaResult!) : formatPaiPan(body),
    ...(question ? ['', `所问之事：${question}`] : []),
  ].join('\n');

  let upstream: Response;
  try {
    upstream = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: body.module === 'meihua' ? MEIHUA_PROMPT : question ? QUESTION_PROMPT : DIAGNOSIS_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: req.signal,
    });
  } catch {
    return new Response('解卦服务连接失败，请稍后重试', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('DeepSeek API error:', upstream.status, detail);
    if (upstream.status === 402) return new Response('AI 解读暂不可用：DeepSeek 账户余额不足，请充值后重试。卦象与历史记录仍可使用。', { status: 502 });
    return new Response(`解卦服务暂时不可用 (${upstream.status})`, { status: 502 });
  }

  // 把 DeepSeek 的 SSE 流转成 NDJSON；summary 与 content 是两个独立字段。
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';
  let outputBuffer = '';
  let summaryParsed = false;

  const encodeEvent = (event: InterpretStreamEvent) =>
    encoder.encode(`${JSON.stringify(event)}\n`);

  const processDataLine = (raw: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') return;
    try {
      const json = JSON.parse(payload);
      const delta = json.choices?.[0]?.delta?.content;
      if (typeof delta !== 'string' || !delta) return;
      if (summaryParsed) {
        controller.enqueue(encodeEvent({ content: delta }));
        return;
      }
      outputBuffer += delta;
      const newlineIndex = outputBuffer.indexOf('\n');
      if (newlineIndex === -1) return;
      const firstLine = outputBuffer.slice(0, newlineIndex).trim();
      const summary = firstLine.replace(/^SUMMARY\s*:\s*/i, '').trim();
      if (summary) controller.enqueue(encodeEvent({ summary }));
      const content = outputBuffer.slice(newlineIndex + 1).replace(/^\s+/, '');
      if (content) controller.enqueue(encodeEvent({ content }));
      outputBuffer = '';
      summaryParsed = true;
    } catch {
      // Ignore non-JSON SSE lines without losing other deltas.
    }
  };

  const textStream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) processDataLine(line, controller);
      },
      flush(controller) {
        buffer += decoder.decode();
        if (buffer.trim()) processDataLine(buffer, controller);
        // Preserve model output even when the summary separator is missing.
        if (outputBuffer) controller.enqueue(encodeEvent({ content: outputBuffer }));
      },
    })
  );

  return new Response(textStream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

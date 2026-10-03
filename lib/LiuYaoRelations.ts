import type { DiZhi, LineResult, WuXing } from './LiuYaoEngine';
import type { TimeInfo } from './TimeBot';

export type RelationTone = 'strong' | 'support' | 'warning' | 'muted';

export interface RelationMark {
  label: string;
  detail: string;
  tone: RelationTone;
}

export interface LineRelationMark extends RelationMark {
  targetIndex: number;
}

type BranchRelation = '合' | '冲' | '刑' | '害';
type ElementRelation = '生' | '受生' | '克' | '受克' | '比和';
type LifeStage = '长生' | '帝旺' | '墓' | '绝';

const BRANCH_ELEMENT: Record<DiZhi, WuXing> = {
  子: '水',
  亥: '水',
  寅: '木',
  卯: '木',
  巳: '火',
  午: '火',
  辰: '土',
  戌: '土',
  丑: '土',
  未: '土',
  申: '金',
  酉: '金',
};

const BRANCH_PAIRS: Record<Exclude<BranchRelation, '刑'>, string[]> = {
  合: ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'],
  冲: ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'],
  害: ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'],
};

const PUNISH_GROUPS = [
  ['子', '卯'],
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
] as const;

const SELF_PUNISH = new Set<DiZhi>(['辰', '午', '酉', '亥']);

const GENERATES: Record<WuXing, WuXing> = {
  金: '水',
  水: '木',
  木: '火',
  火: '土',
  土: '金',
};

const CONTROLS: Record<WuXing, WuXing> = {
  金: '木',
  木: '土',
  土: '水',
  水: '火',
  火: '金',
};

// 六爻常用进退神表；退神取同一组配对的反向，不能只按地支相邻判断。
const ADVANCING_PAIRS: readonly (readonly [DiZhi, DiZhi])[] = [
  ['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉'],
  ['丑', '辰'], ['辰', '未'], ['未', '戌'], ['戌', '丑'],
];

// 采用《增删卜易》的生旺墓绝表（水土同宫），不套用八字阴阳顺逆长生。
// 这里只标注位置关系；是否实际生、墓、绝仍须结合旺衰及生克判断。
const LIFE_STAGES: Record<WuXing, Record<LifeStage, DiZhi>> = {
  金: { 长生: '巳', 帝旺: '酉', 墓: '丑', 绝: '寅' },
  木: { 长生: '亥', 帝旺: '卯', 墓: '未', 绝: '申' },
  水: { 长生: '申', 帝旺: '子', 墓: '辰', 绝: '巳' },
  火: { 长生: '寅', 帝旺: '午', 墓: '戌', 绝: '亥' },
  土: { 长生: '申', 帝旺: '子', 墓: '辰', 绝: '巳' },
};

function getElementRelation(source: WuXing, target: WuXing): ElementRelation {
  if (GENERATES[source] === target) return '生';
  if (GENERATES[target] === source) return '受生';
  if (CONTROLS[source] === target) return '克';
  if (CONTROLS[target] === source) return '受克';
  return '比和';
}

function hasPair(pairs: string[], a: DiZhi, b: DiZhi) {
  return pairs.some((pair) => pair.includes(a) && pair.includes(b));
}

export function getBranchRelations(a: DiZhi, b: DiZhi): BranchRelation[] {
  const relations: BranchRelation[] = [];

  if (a !== b) {
    if (hasPair(BRANCH_PAIRS.合, a, b)) relations.push('合');
    if (hasPair(BRANCH_PAIRS.冲, a, b)) relations.push('冲');
    if (hasPair(BRANCH_PAIRS.害, a, b)) relations.push('害');
    if (PUNISH_GROUPS.some((group) => group.includes(a as never) && group.includes(b as never))) {
      relations.push('刑');
    }
  } else if (SELF_PUNISH.has(a)) {
    relations.push('刑');
  }

  return relations;
}

function describeSeasonalRelation(
  sourceLabel: '月建' | '日辰',
  sourceBranch: DiZhi,
  line: LineResult,
): RelationMark[] {
  const marks: RelationMark[] = [];
  const prefix = sourceLabel === '月建' ? '月' : '日';

  if (sourceBranch === line.zhi) {
    marks.push({
      label: `临${sourceLabel}`,
      detail: `${line.zhi}爻与${sourceLabel}${sourceBranch}同支`,
      tone: 'support',
    });
  }

  for (const relation of getBranchRelations(sourceBranch, line.zhi)) {
    if (relation === '冲') {
      marks.push({
        label: sourceLabel === '月建' ? '月破' : '日冲',
        detail: `${sourceLabel}${sourceBranch}冲${line.zhi}爻`,
        tone: 'strong',
      });
    } else {
      marks.push({
        label: `${prefix}${relation}`,
        detail: `${sourceLabel}${sourceBranch}与${line.zhi}爻相${relation}`,
        tone: relation === '合' ? 'support' : 'warning',
      });
    }
  }

  const sourceElement = BRANCH_ELEMENT[sourceBranch];
  const elementRelation = getElementRelation(sourceElement, line.wuXing);
  const source = `${sourceLabel}${sourceBranch}${sourceElement}`;
  const target = `${line.zhi}${line.wuXing}爻`;
  const elementMarks: Record<ElementRelation, RelationMark> = {
    生: { label: `${prefix}生`, detail: `${source}生${target}`, tone: 'support' },
    受生: { label: `${prefix}泄`, detail: `${target}生${source}，爻气外泄`, tone: 'warning' },
    克: { label: `${prefix}克`, detail: `${source}克${target}`, tone: 'strong' },
    受克: {
      label: `${prefix}耗`,
      detail: `${target}与${source}为爻克日月五行的耗气关系，并非爻能制克日月`,
      tone: 'warning',
    },
    比和: { label: `${prefix}扶`, detail: `${source}与${target}同五行，比和扶助`, tone: 'support' },
  };

  // 同支已经标为临日/月，避免再重复显示同五行扶助。
  if (sourceBranch !== line.zhi) {
    marks.push(elementMarks[elementRelation]);
  }

  return marks;
}

export function getTimeRelationMarks(line: LineResult, time: TimeInfo): RelationMark[] {
  const marks = [
    ...describeSeasonalRelation('月建', time.monthBranch, line),
    ...describeSeasonalRelation('日辰', time.dayBranch, line),
  ];

  if (time.kongWang.includes(line.zhi)) {
    marks.unshift({
      label: '旬空',
      detail: `${line.zhi}落在${time.kongWang}空`,
      tone: 'muted',
    });
  }

  return marks;
}

export function getChangedTimeRelationMarks(
  original: LineResult,
  changed: LineResult,
  time: TimeInfo,
): RelationMark[] {
  // 变卦的静爻也会重新纳甲，但只有实际动爻才有对应的化爻。
  if (!original.isMoving) return [];

  const changedLabels: Record<string, string> = {
    旬空: '化空',
    月破: '化月破',
    临月建: '化月建',
    临日辰: '化日辰',
  };

  return getTimeRelationMarks(changed, time).map((mark) => ({
    ...mark,
    label: changedLabels[mark.label] ?? mark.label,
    detail: `变爻${changed.zhi}${changed.wuXing}：${mark.detail}`,
  }));
}

export function getReturnRelationMarks(
  original: LineResult,
  changed: LineResult,
): RelationMark[] {
  if (!original.isMoving) return [];

  const marks: RelationMark[] = [];

  if (original.zhi === changed.zhi) {
    marks.push({
      label: '化伏吟',
      detail: `${original.zhi}动而仍化${changed.zhi}`,
      tone: 'muted',
    });
  }

  if (ADVANCING_PAIRS.some(([from, to]) => from === original.zhi && to === changed.zhi)) {
    marks.push({
      label: '化进神',
      detail: `${original.zhi}动化${changed.zhi}，属于进神配对；是否能进需结合空破、旺衰`,
      tone: 'support',
    });
  } else if (ADVANCING_PAIRS.some(([from, to]) => to === original.zhi && from === changed.zhi)) {
    marks.push({
      label: '化退神',
      detail: `${original.zhi}动化${changed.zhi}，属于退神配对；是否实际退需结合空破、旺衰`,
      tone: 'warning',
    });
  }

  const stage = (Object.keys(LIFE_STAGES[original.wuXing]) as LifeStage[])
    .find((key) => LIFE_STAGES[original.wuXing][key] === changed.zhi);
  if (stage) {
    marks.push({
      label: `化${stage}`,
      detail: `${original.zhi}${original.wuXing}动化${changed.zhi}，按生旺墓绝表，${original.wuXing}的${stage}位在${changed.zhi}（水土同宫）；实际效力需结合旺衰、生克`,
      tone: stage === '长生' || stage === '帝旺' ? 'support' : 'warning',
    });
  }

  for (const relation of getBranchRelations(changed.zhi, original.zhi)) {
    marks.push({
      label: `回头${relation}`,
      detail: `变爻${changed.zhi}与本爻${original.zhi}相${relation}`,
      tone: relation === '合' ? 'support' : relation === '冲' ? 'strong' : 'warning',
    });
  }

  if (CONTROLS[changed.wuXing] === original.wuXing) {
    marks.push({
      label: '回头克',
      detail: `变爻${changed.zhi}${changed.wuXing}回头克本爻${original.zhi}${original.wuXing}`,
      tone: 'strong',
    });
  } else if (GENERATES[changed.wuXing] === original.wuXing) {
    marks.push({
      label: '回头生',
      detail: `变爻${changed.zhi}${changed.wuXing}回头生本爻${original.zhi}${original.wuXing}`,
      tone: 'support',
    });
  } else if (CONTROLS[original.wuXing] === changed.wuXing) {
    marks.push({
      label: '化耗',
      detail: `本爻${original.zhi}${original.wuXing}克变爻${changed.zhi}${changed.wuXing}`,
      tone: 'warning',
    });
  } else if (GENERATES[original.wuXing] === changed.wuXing) {
    marks.push({
      label: '化泄',
      detail: `本爻${original.zhi}${original.wuXing}生变爻${changed.zhi}${changed.wuXing}`,
      tone: 'warning',
    });
  } else if (original.wuXing === changed.wuXing) {
    marks.push({
      label: '化扶',
      detail: `本爻与变爻同属${original.wuXing}`,
      tone: 'support',
    });
  }

  return marks;
}

export function getLineRelationMarks(
  source: LineResult,
  target: LineResult,
): LineRelationMark[] {
  const marks: LineRelationMark[] = [];

  for (const relation of getBranchRelations(source.zhi, target.zhi)) {
    marks.push({
      targetIndex: target.index - 1,
      label: relation,
      detail: `${source.zhi}与${target.zhi}相${relation}`,
      tone: relation === '合' ? 'support' : relation === '冲' ? 'strong' : 'warning',
    });
  }

  const relation = getElementRelation(source.wuXing, target.wuXing);
  const sourceName = `${source.zhi}${source.wuXing}`;
  const targetName = `${target.zhi}${target.wuXing}`;
  const elementMarks: Record<ElementRelation, RelationMark> = {
    生: { label: '生', detail: `选中爻${sourceName}生目标爻${targetName}`, tone: 'support' },
    受生: { label: '受生', detail: `目标爻${targetName}生选中爻${sourceName}`, tone: 'support' },
    克: { label: '克', detail: `选中爻${sourceName}克目标爻${targetName}`, tone: 'strong' },
    受克: { label: '受克', detail: `目标爻${targetName}克选中爻${sourceName}`, tone: 'strong' },
    比和: { label: '比和', detail: `选中爻${sourceName}与目标爻${targetName}同五行`, tone: 'support' },
  };
  marks.push({ ...elementMarks[relation], targetIndex: target.index - 1 });

  return marks;
}

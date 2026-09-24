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
  if (CONTROLS[sourceElement] === line.wuXing) {
    marks.push({
      label: `${prefix}克`,
      detail: `${sourceLabel}${sourceBranch}${sourceElement}克${line.zhi}${line.wuXing}`,
      tone: 'strong',
    });
  } else if (CONTROLS[line.wuXing] === sourceElement) {
    marks.push({
      label: `克${prefix}`,
      detail: `${line.zhi}${line.wuXing}克${sourceLabel}${sourceBranch}${sourceElement}`,
      tone: 'warning',
    });
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
    if (relation === '合') continue;
    marks.push({
      targetIndex: target.index - 1,
      label: relation,
      detail: `${source.zhi}与${target.zhi}相${relation}`,
      tone: relation === '冲' ? 'strong' : 'warning',
    });
  }

  if (CONTROLS[source.wuXing] === target.wuXing) {
    marks.push({
      targetIndex: target.index - 1,
      label: '克',
      detail: `${source.zhi}${source.wuXing}克${target.zhi}${target.wuXing}`,
      tone: 'strong',
    });
  } else if (CONTROLS[target.wuXing] === source.wuXing) {
    marks.push({
      targetIndex: target.index - 1,
      label: '受克',
      detail: `${source.zhi}${source.wuXing}受${target.zhi}${target.wuXing}所克`,
      tone: 'strong',
    });
  }

  return marks;
}

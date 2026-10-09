import type { DiZhi, WuXing } from "./LiuYaoEngine";
import {
  getElementRelation,
  type MeihuaResult,
  type Trigram,
} from "./MeihuaEngine";
import { solarFromParts } from "./calendar";

export type HexagramStage = "original" | "mutual" | "changed";
export type TrigramPosition = "upper" | "lower";
export type TrigramId = `${HexagramStage}-${TrigramPosition}`;

export interface MeihuaTrigramNode {
  id: TrigramId;
  label: string;
  stage: HexagramStage;
  position: TrigramPosition;
  trigram: Trigram;
  role?: "体" | "用";
  qi?: "旺" | "衰";
}

export interface TrigramRelation {
  firstId: TrigramId;
  secondId: TrigramId;
  sourceId: TrigramId;
  targetId: TrigramId;
  kind: "生" | "克" | "比和";
  text: string;
}

export interface SeasonalQi {
  monthBranch: DiZhi;
  label: string;
  prosperous: WuXing;
  declining: WuXing;
}

const MONTH_QI: Record<DiZhi, Omit<SeasonalQi, "monthBranch">> = {
  寅: { label: "春", prosperous: "木", declining: "土" },
  卯: { label: "春", prosperous: "木", declining: "土" },
  巳: { label: "夏", prosperous: "火", declining: "金" },
  午: { label: "夏", prosperous: "火", declining: "金" },
  申: { label: "秋", prosperous: "金", declining: "木" },
  酉: { label: "秋", prosperous: "金", declining: "木" },
  亥: { label: "冬", prosperous: "水", declining: "火" },
  子: { label: "冬", prosperous: "水", declining: "火" },
  辰: { label: "季月", prosperous: "土", declining: "水" },
  未: { label: "季月", prosperous: "土", declining: "水" },
  戌: { label: "季月", prosperous: "土", declining: "水" },
  丑: { label: "季月", prosperous: "土", declining: "水" },
};

export function getSeasonalQi(datePart: string, timePart: string): SeasonalQi {
  // Seasonal months follow the actual solar-term instant, not the advanced lunar divination day.
  const monthBranch = solarFromParts(datePart, timePart)
    .getLunar()
    .getMonthZhiExact() as DiZhi;
  return { monthBranch, ...MONTH_QI[monthBranch] };
}

export function getTrigramNodes(result: MeihuaResult): MeihuaTrigramNode[] {
  const season = getSeasonalQi(result.datePart, result.timePart);
  const stages: { key: HexagramStage; label: string }[] = [
    { key: "original", label: "本" },
    { key: "mutual", label: "互" },
    { key: "changed", label: "变" },
  ];
  return stages.flatMap(({ key, label }) =>
    (["upper", "lower"] as const).map((position) => {
      const trigram = result[key][position];
      return {
        id: `${key}-${position}` as TrigramId,
        label: `${label}${position === "upper" ? "上" : "下"}`,
        stage: key,
        position,
        trigram,
        role:
          key === "original"
            ? position === result.bodyPosition
              ? "体"
              : "用"
            : undefined,
        qi:
          trigram.element === season.prosperous
            ? "旺"
            : trigram.element === season.declining
              ? "衰"
              : undefined,
      };
    }),
  );
}

export function describeTrigram(node: MeihuaTrigramNode) {
  return `${node.label}${node.trigram.name}（${node.trigram.element}）`;
}

export function getTrigramRelation(
  first: MeihuaTrigramNode,
  second: MeihuaTrigramNode,
): TrigramRelation {
  const relation = getElementRelation(
    first.trigram.element,
    second.trigram.element,
  );
  const reversed = relation === "受生" || relation === "受克";
  const source = reversed ? second : first;
  const target = reversed ? first : second;
  const kind =
    relation === "比和"
      ? "比和"
      : relation === "生" || relation === "受生"
        ? "生"
        : "克";
  return {
    firstId: first.id,
    secondId: second.id,
    sourceId: source.id,
    targetId: target.id,
    kind,
    text:
      kind === "比和"
        ? `${describeTrigram(first)}与${describeTrigram(second)}比和`
        : `${describeTrigram(source)}${kind}${describeTrigram(target)}`,
  };
}

export function getAllTrigramRelations(nodes: MeihuaTrigramNode[]) {
  return nodes.flatMap((first, index) =>
    nodes.slice(index + 1).map((second) => getTrigramRelation(first, second)),
  );
}

export function relationToReference(
  reference: MeihuaTrigramNode,
  target: MeihuaTrigramNode,
) {
  const relation = getElementRelation(
    reference.trigram.element,
    target.trigram.element,
  );
  const ref = reference.role === "体" ? "体" : "参照";
  const labels = {
    比和: "比和",
    生: `${ref}生此卦`,
    受生: `此卦生${ref}`,
    克: `${ref}克此卦`,
    受克: `此卦克${ref}`,
  };
  return {
    label: labels[relation],
    relation,
    detail: getTrigramRelation(reference, target).text,
  };
}

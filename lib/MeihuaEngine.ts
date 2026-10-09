import { BAGUA_WUXING, HEXAGRAM_NAMES } from "./LiuYaoEngine";
import type { BaguaName, WuXing, YaoValue } from "./LiuYaoEngine";
import { solarFromParts } from "./calendar";

export interface Trigram {
  number: number;
  name: BaguaName;
  image: string;
  element: WuXing;
  bits: number[]; // bottom to top
}

export const TRIGRAMS: Trigram[] = [
  ["乾", "天", [1, 1, 1]],
  ["兑", "泽", [1, 1, 0]],
  ["离", "火", [1, 0, 1]],
  ["震", "雷", [1, 0, 0]],
  ["巽", "风", [0, 1, 1]],
  ["坎", "水", [0, 1, 0]],
  ["艮", "山", [0, 0, 1]],
  ["坤", "地", [0, 0, 0]],
].map(([name, image, bits], index) => ({
  number: index + 1,
  name: name as BaguaName,
  image: image as string,
  element: BAGUA_WUXING[name as BaguaName],
  bits: bits as number[],
}));

export interface MeihuaHexagram {
  name: string;
  upper: Trigram;
  lower: Trigram;
  bits: number[];
}

export interface MeihuaResult {
  method: "lunar-time";
  datePart: string;
  timePart: string;
  lunar: {
    year: number;
    yearGanZhi: string;
    yearBranch: string;
    yearNumber: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
    monthText: string;
    dayText: string;
    hourBranch: string;
    hourNumber: number;
  };
  sums: { upper: number; lower: number };
  movingLine: number;
  lines: YaoValue[];
  original: MeihuaHexagram;
  mutual: MeihuaHexagram;
  changed: MeihuaHexagram;
  body: Trigram;
  use: Trigram;
  bodyPosition: "upper" | "lower";
  relationship: string;
}

export function remainderNumber(total: number, divisor: number) {
  return total % divisor || divisor;
}

export function hexagramFromBits(bits: number[]): MeihuaHexagram {
  const lower = TRIGRAMS.find(
    (gua) => gua.bits.join("") === bits.slice(0, 3).join(""),
  );
  const upper = TRIGRAMS.find(
    (gua) => gua.bits.join("") === bits.slice(3, 6).join(""),
  );
  if (bits.length !== 6 || !upper || !lower)
    throw new Error("卦象必须包含六个阴阳爻");
  return {
    name: HEXAGRAM_NAMES[upper.name + lower.name],
    upper,
    lower,
    bits: [...bits],
  };
}

export type ElementRelation = "生" | "受生" | "克" | "受克" | "比和";

/** Direction is always from source to target. */
export function getElementRelation(
  source: WuXing,
  target: WuXing,
): ElementRelation {
  const generates: Record<WuXing, WuXing> = {
    木: "火",
    火: "土",
    土: "金",
    金: "水",
    水: "木",
  };
  const controls: Record<WuXing, WuXing> = {
    木: "土",
    土: "水",
    水: "火",
    火: "金",
    金: "木",
  };
  if (source === target) return "比和";
  if (generates[source] === target) return "生";
  if (generates[target] === source) return "受生";
  if (controls[source] === target) return "克";
  return "受克";
}

export function bodyUseRelationship(body: WuXing, use: WuXing) {
  const labels: Record<ElementRelation, string> = {
    比和: "体用比和",
    生: "体生用",
    受生: "用生体",
    克: "体克用",
    受克: "用克体",
  };
  return labels[getElementRelation(body, use)];
}

export function castMeihua(datePart: string, timePart: string): MeihuaResult {
  const solar = solarFromParts(datePart, timePart);
  // Zi hour starts the next divination day, including lunar month/year boundaries.
  const lunar = (solar.getHour() === 23 ? solar.next(1) : solar).getLunar();
  // Lunar year changes at Chinese New Year, rather than Li Chun.
  const yearNumber = lunar.getYearZhiIndex() + 1;
  const month = Math.abs(lunar.getMonth());
  const day = lunar.getDay();
  const hourNumber = lunar.getTimeZhiIndex() + 1;
  const upperSum = yearNumber + month + day;
  const lowerSum = upperSum + hourNumber;
  const upper = TRIGRAMS[remainderNumber(upperSum, 8) - 1];
  const lower = TRIGRAMS[remainderNumber(lowerSum, 8) - 1];
  const movingLine = remainderNumber(lowerSum, 6);
  const bits = [...lower.bits, ...upper.bits];
  const changedBits = bits.map((bit, i) =>
    i === movingLine - 1 ? 1 - bit : bit,
  );
  const bodyPosition = movingLine <= 3 ? "upper" : "lower";
  const body = bodyPosition === "upper" ? upper : lower;
  const use = bodyPosition === "upper" ? lower : upper;
  return {
    method: "lunar-time",
    datePart,
    timePart,
    lunar: {
      year: lunar.getYear(),
      yearGanZhi: lunar.getYearInGanZhi(),
      yearBranch: lunar.getYearZhi(),
      yearNumber,
      month,
      day,
      isLeapMonth: lunar.getMonth() < 0,
      monthText: lunar.getMonthInChinese(),
      dayText: lunar.getDayInChinese(),
      hourBranch: lunar.getTimeZhi(),
      hourNumber,
    },
    sums: { upper: upperSum, lower: lowerSum },
    movingLine,
    lines: bits.map((bit, i) =>
      i === movingLine - 1 ? (bit ? 9 : 6) : bit ? 7 : 8,
    ) as YaoValue[],
    original: hexagramFromBits(bits),
    mutual: hexagramFromBits([...bits.slice(1, 4), ...bits.slice(2, 5)]),
    changed: hexagramFromBits(changedBits),
    body,
    use,
    bodyPosition,
    relationship: bodyUseRelationship(body.element, use.element),
  };
}

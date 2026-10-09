import { LiuYaoEngine } from "./LiuYaoEngine";
import type { YaoValue } from "./LiuYaoEngine";
import { castMeihua } from "./MeihuaEngine";
import { solarFromParts } from "./calendar";

export const HISTORY_KEY = "liuyao-simulator:history:v1";
export const HISTORY_EVENT = "divination-history-change";
export interface Interpretation {
  question: string;
  summary: string;
  content: string;
  kind: "question" | "diagnosis";
}
interface RecordBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  datePart: string;
  timePart: string;
  name: string;
  changedName: string;
  question: string;
  interpretation?: Interpretation;
}
export type DivinationRecord = RecordBase &
  (
    | { module: "liuyao"; lines: YaoValue[] }
    | { module: "meihua"; method: "lunar-time" }
  );
export type HistoryDraft =
  | { module: "liuyao"; datePart: string; timePart: string; lines: YaoValue[] }
  | {
      module: "meihua";
      datePart: string;
      timePart: string;
      method: "lunar-time";
    };

export function isYaoList(value: unknown): value is YaoValue[] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((line) => [6, 7, 8, 9].includes(line))
  );
}

function isRecord(value: unknown): value is DivinationRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<DivinationRecord>;
  if (
    typeof r.id !== "string" ||
    !r.id ||
    typeof r.datePart !== "string" ||
    typeof r.timePart !== "string" ||
    typeof r.createdAt !== "string" ||
    !Number.isFinite(Date.parse(r.createdAt)) ||
    typeof r.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(r.updatedAt)) ||
    typeof r.name !== "string" ||
    typeof r.changedName !== "string" ||
    typeof r.question !== "string"
  )
    return false;
  try {
    solarFromParts(r.datePart, r.timePart);
  } catch {
    return false;
  }
  if (
    r.interpretation &&
    (typeof r.interpretation.question !== "string" ||
      typeof r.interpretation.summary !== "string" ||
      typeof r.interpretation.content !== "string" ||
      !["question", "diagnosis"].includes(r.interpretation.kind))
  )
    return false;
  return (
    (r.module === "liuyao" && isYaoList(r.lines)) ||
    (r.module === "meihua" && r.method === "lunar-time")
  );
}

export function listHistory(): DivinationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(isRecord))
      throw new Error("invalid history");
    return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    throw new Error("无法读取本地历史，请检查浏览器存储设置或已有记录数据");
  }
}

export function getHistoryRecord(id: string) {
  return listHistory().find((record) => record.id === id);
}

function newRecordId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID requires HTTPS; getRandomValues also works on a local LAN HTTP origin.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function writeHistory(records: DivinationRecord[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch {
    throw new Error("历史记录保存失败，浏览器存储可能已满或被禁用");
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function saveHistory(
  draft: HistoryDraft,
  options: {
    id?: string;
    question?: string;
    interpretation?: Interpretation;
  } = {},
) {
  solarFromParts(draft.datePart, draft.timePart);
  if (draft.module === "liuyao" && !isYaoList(draft.lines))
    throw new Error("请先完成六爻");
  const records = listHistory();
  const existing = options.id
    ? records.find((record) => record.id === options.id)
    : undefined;
  // Only an existing id with the same inputs can update the original reading.
  const sameChart =
    existing &&
    existing.module === draft.module &&
    existing.datePart === draft.datePart &&
    existing.timePart === draft.timePart &&
    (existing.module !== "liuyao" ||
      (draft.module === "liuyao" &&
        existing.lines.join(",") === draft.lines.join(",")));
  const previous = sameChart ? existing : undefined;
  const now = new Date().toISOString();
  const hex =
    draft.module === "meihua"
      ? castMeihua(draft.datePart, draft.timePart)
      : new LiuYaoEngine().process(draft.lines);
  const record: DivinationRecord = {
    ...draft,
    id: previous?.id ?? newRecordId(),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    name: "original" in hex ? hex.original.name : hex.name,
    changedName:
      "changed" in hex ? hex.changed.name : (hex.changedName ?? hex.name),
    question: options.question ?? previous?.question ?? "",
    interpretation: options.interpretation ?? previous?.interpretation,
  };
  writeHistory([record, ...records.filter((item) => item.id !== record.id)]);
  return record;
}

export function deleteHistory(id: string) {
  writeHistory(listHistory().filter((record) => record.id !== id));
}

export function historyHref(record: DivinationRecord) {
  return `${record.module === "meihua" ? "/meihua" : "/result"}?record=${encodeURIComponent(record.id)}`;
}

import { Fragment } from "react";
import type { MeihuaResult } from "@/lib/MeihuaEngine";
import {
  describeTrigram,
  getTrigramNodes,
  getTrigramRelation,
  getSeasonalQi,
  type MeihuaTrigramNode,
} from "@/lib/MeihuaRelations";

const ELEMENT_STYLE = {
  木: "bg-emerald-50 text-emerald-700",
  火: "bg-orange-50 text-orange-700",
  土: "bg-amber-50 text-amber-700",
  金: "bg-slate-100 text-slate-600",
  水: "bg-sky-50 text-sky-700",
};

function RelationArrow({
  first,
  second,
  vertical = false,
}: {
  first: MeihuaTrigramNode;
  second: MeihuaTrigramNode;
  vertical?: boolean;
}) {
  const relation = getTrigramRelation(first, second);
  const forward = relation.sourceId === first.id;
  const both = relation.kind === "比和";
  const color =
    relation.kind === "生"
      ? "text-emerald-600"
      : relation.kind === "克"
        ? "text-rose-500"
        : "text-gray-400";

  return (
    <div
      role="img"
      aria-label={relation.text}
      title={relation.text}
      className={`flex items-center justify-center text-[10px] sm:text-xs ${vertical ? "h-9 gap-1.5" : "flex-col gap-1"} ${color}`}
    >
      <span aria-hidden="true">{relation.kind}</span>
      <svg
        aria-hidden="true"
        viewBox={vertical ? "0 0 16 32" : "0 0 40 16"}
        className={vertical ? "h-7 w-3.5" : "h-3.5 w-full"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {vertical ? (
          <>
            <path d="M8 2V30" />
            {(forward || both) && <path d="m3 25 5 5 5-5" />}
            {(!forward || both) && <path d="m3 7 5-5 5 5" />}
          </>
        ) : (
          <>
            <path d="M2 8H38" />
            {(forward || both) && <path d="m33 3 5 5-5 5" />}
            {(!forward || both) && <path d="m7 3-5 5 5 5" />}
          </>
        )}
      </svg>
    </div>
  );
}

export function MeihuaRelationsPanel({ result }: { result: MeihuaResult }) {
  const nodes = getTrigramNodes(result);
  const season = getSeasonalQi(result.datePart, result.timePart);
  const stages = ["本卦", "互卦", "变卦"];

  return (
    <section
      aria-label="六卦生克关系"
      className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">六卦生克</h2>
        <span className="text-[11px] text-gray-400">
          {season.monthBranch}月 · {season.prosperous}旺{season.declining}衰
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-y-2 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]">
        {stages.map((stage, index) => (
          <div
            key={stage}
            style={{ gridColumn: index * 2 + 1, gridRow: 1 }}
            className="pb-1 text-center text-xs text-gray-500"
          >
            {stage}
          </div>
        ))}

        {nodes.map((node, index) => (
          <div
            key={node.id}
            style={{
              gridColumn: Math.floor(index / 2) * 2 + 1,
              gridRow: node.position === "upper" ? 2 : 4,
            }}
            aria-label={`${describeTrigram(node)}${node.role ? `，${node.role}卦` : ""}${node.qi ? `，卦气${node.qi}` : ""}`}
            className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border px-1 py-3 ${node.role === "体" ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-gray-50/50"}`}
          >
            <span className="text-[10px] text-gray-400 sm:text-xs">
              {node.position === "upper" ? "上卦" : "下卦"}
              {node.role && (
                <span className="ml-1 text-amber-700">{node.role}</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <strong className="text-lg font-semibold">
                {node.trigram.name}
              </strong>
              <span
                className={`rounded px-1 py-0.5 text-[10px] sm:text-xs ${ELEMENT_STYLE[node.trigram.element]}`}
              >
                {node.trigram.element}
              </span>
            </span>
            <span className="min-h-4 text-[10px] text-gray-400">
              {node.qi ? `卦气${node.qi}` : node.trigram.image}
            </span>
          </div>
        ))}

        {[0, 1].map((position) => (
          <Fragment key={position}>
            {[0, 1].map((stage) => (
              <div
                key={stage}
                style={{
                  gridColumn: stage * 2 + 2,
                  gridRow: position === 0 ? 2 : 4,
                }}
              >
                <RelationArrow
                  first={nodes[stage * 2 + position]}
                  second={nodes[(stage + 1) * 2 + position]}
                />
              </div>
            ))}
          </Fragment>
        ))}
        {stages.map((stage, index) => (
          <div key={stage} style={{ gridColumn: index * 2 + 1, gridRow: 3 }}>
            <RelationArrow
              first={nodes[index * 2]}
              second={nodes[index * 2 + 1]}
              vertical
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-5 text-gray-400">
        箭头由生、克的一方指向另一方，双向箭头表示比和。
      </p>
    </section>
  );
}

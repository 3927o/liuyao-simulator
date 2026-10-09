const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Solar } = require("lunar-typescript");
const { castMeihua, getElementRelation } = require("../lib/MeihuaEngine.ts");
const {
  getSeasonalQi,
  getTrigramNodes,
  getTrigramRelation,
  getAllTrigramRelations,
  relationToReference,
} = require("../lib/MeihuaRelations.ts");

test("五行全部 25 种组合的生克与方向正确", () => {
  const elements = ["木", "火", "土", "金", "水"];
  const expected = [
    ["比和", "生", "克", "受克", "受生"],
    ["受生", "比和", "生", "克", "受克"],
    ["受克", "受生", "比和", "生", "克"],
    ["克", "受克", "受生", "比和", "生"],
    ["生", "克", "受克", "受生", "比和"],
  ];
  elements.forEach((source, row) =>
    elements.forEach((target, column) => {
      assert.equal(getElementRelation(source, target), expected[row][column]);
    }),
  );
});

test("本互变共六个独立位置，重复经卦不会被合并，体固定在本卦", () => {
  const result = castMeihua("2026-02-17", "00:00");
  const nodes = getTrigramNodes(result);
  assert.deepEqual(
    nodes.map((node) => node.id),
    [
      "original-upper",
      "original-lower",
      "mutual-upper",
      "mutual-lower",
      "changed-upper",
      "changed-lower",
    ],
  );
  assert.deepEqual(
    nodes.map((node) => node.trigram.name),
    ["乾", "兑", "巽", "离", "巽", "兑"],
  );
  assert.equal(nodes.filter((node) => node.role === "体").length, 1);
  assert.equal(nodes.find((node) => node.role === "体").id, "original-lower");
  const lowerMoving = getTrigramNodes(castMeihua("2026-02-17", "05:00"));
  assert.equal(
    lowerMoving.find((node) => node.role === "体").id,
    "original-upper",
  );
});

test("六个位置生成完整的 15 组关系，包含互卦与变卦之间的关系", () => {
  const nodes = getTrigramNodes(castMeihua("2026-02-17", "00:00"));
  const relations = getAllTrigramRelations(nodes);
  assert.equal(relations.length, 15);
  assert.equal(
    new Set(
      relations.map((relation) =>
        [relation.firstId, relation.secondId].sort().join(":"),
      ),
    ).size,
    15,
  );
  const mutualChanged = relations.find(
    (relation) =>
      relation.firstId === "mutual-lower" &&
      relation.secondId === "changed-upper",
  );
  assert.equal(mutualChanged.kind, "生");
  assert.equal(mutualChanged.sourceId, "changed-upper");
  assert.equal(mutualChanged.targetId, "mutual-lower");
  assert.match(mutualChanged.text, /变上巽（木）生互下离（火）/);
  assert.equal(getTrigramRelation(nodes[1], nodes[5]).kind, "比和");
});

test("切换参照时正确反转标签与方向，不更换本卦体", () => {
  const result = castMeihua("2026-02-17", "00:00");
  const nodes = getTrigramNodes(result);
  const [body, mutual] = [nodes[1], nodes[2]];
  assert.equal(relationToReference(body, mutual).label, "体克此卦");
  assert.equal(relationToReference(mutual, body).label, "此卦克参照");
  const forwards = getTrigramRelation(body, mutual);
  const backwards = getTrigramRelation(mutual, body);
  assert.equal(forwards.sourceId, backwards.sourceId);
  assert.equal(forwards.targetId, backwards.targetId);
  assert.equal(forwards.text, backwards.text);
  assert.equal(result.body.name, "兑");
  assert.equal(nodes.find((node) => node.role === "体").id, "original-lower");
});

test("十二节令月对应春夏秋冬与四季土月旺衰", () => {
  const expected = [
    ["丑", "土", "水"],
    ["寅", "木", "土"],
    ["卯", "木", "土"],
    ["辰", "土", "水"],
    ["巳", "火", "金"],
    ["午", "火", "金"],
    ["未", "土", "水"],
    ["申", "金", "木"],
    ["酉", "金", "木"],
    ["戌", "土", "水"],
    ["亥", "水", "火"],
    ["子", "水", "火"],
  ];
  expected.forEach(([branch, prosperous, declining], index) => {
    const qi = getSeasonalQi(
      `2026-${String(index + 1).padStart(2, "0")}-15`,
      "12:00",
    );
    assert.equal(qi.monthBranch, branch);
    assert.equal(qi.prosperous, prosperous);
    assert.equal(qi.declining, declining);
  });
  const nodes = getTrigramNodes(castMeihua("2026-02-17", "00:00"));
  assert.equal(nodes[2].qi, "旺");
  assert.equal(nodes[0].qi, undefined);
});

test("卦气在交节时刻切换，23 点换农历日不提前改变节令", () => {
  const liChun = Solar.fromYmd(2026, 2, 4).getLunar().getJieQiTable()["立春"];
  const instant = new Date(
    Date.UTC(
      liChun.getYear(),
      liChun.getMonth() - 1,
      liChun.getDay(),
      liChun.getHour(),
      liChun.getMinute(),
      liChun.getSecond(),
    ),
  );
  const before = new Date(instant.getTime() - 60_000).toISOString();
  const after = new Date(instant.getTime() + 60_000).toISOString();
  assert.equal(
    getSeasonalQi(before.slice(0, 10), before.slice(11, 16)).monthBranch,
    "丑",
  );
  assert.equal(
    getSeasonalQi(after.slice(0, 10), after.slice(11, 16)).monthBranch,
    "寅",
  );
  const previousDate = liChun.next(-1).toYmd();
  assert.equal(getSeasonalQi(previousDate, "23:00").monthBranch, "丑");
  assert.deepEqual(
    castMeihua(previousDate, "23:00").lunar,
    castMeihua(liChun.toYmd(), "00:00").lunar,
  );
});

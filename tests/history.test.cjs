const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  HISTORY_KEY,
  saveHistory,
  listHistory,
  getHistoryRecord,
  deleteHistory,
  historyHref,
} = require("../lib/divinationHistory.ts");

let storage;
beforeEach(() => {
  storage = new Map();
  global.window = new EventTarget();
  window.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
});
const liuyao = {
  module: "liuyao",
  datePart: "2026-02-16",
  timePart: "23:00",
  lines: [9, 7, 7, 8, 8, 6],
};
const meihua = {
  module: "meihua",
  method: "lunar-time",
  datePart: "2026-02-16",
  timePart: "23:00",
};

test("没有 randomUUID 的局域网 HTTP 浏览器仍可保存记录", () => {
  const original = Object.getOwnPropertyDescriptor(global, "crypto");
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { getRandomValues },
  });
  try {
    const record = saveHistory(meihua);
    assert.match(
      record.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.ok(getHistoryRecord(record.id));
  } finally {
    Object.defineProperty(global, "crypto", original);
  }
});

test("两模块记录持久保存、恢复原始时间与卦象", () => {
  const six = saveHistory(liuyao);
  const plum = saveHistory(meihua);
  assert.equal(listHistory().length, 2);
  assert.deepEqual(getHistoryRecord(six.id).lines, liuyao.lines);
  assert.equal(getHistoryRecord(plum.id).datePart, "2026-02-16");
  assert.equal(plum.name, "天泽履");
  assert.equal(historyHref(six), `/result?record=${six.id}`);
  assert.equal(historyHref(plum), `/meihua?record=${plum.id}`);
  assert.equal(JSON.parse(storage.get(HISTORY_KEY)).length, 2);
});

test("AI 解读更新同一条记录，重新保存不产生副本", () => {
  const first = saveHistory(meihua);
  const interpretation = {
    question: "测试问题",
    summary: "测试摘要",
    content: "## 正文\n测试解读",
    kind: "question",
  };
  const updated = saveHistory(meihua, {
    id: first.id,
    question: "测试问题",
    interpretation,
  });
  assert.equal(updated.id, first.id);
  assert.equal(updated.createdAt, first.createdAt);
  assert.equal(listHistory().length, 1);
  assert.deepEqual(getHistoryRecord(first.id).interpretation, interpretation);
  saveHistory(meihua, { id: first.id, question: "新问题" });
  assert.equal(getHistoryRecord(first.id).interpretation.question, "测试问题");
});

test("编辑日期或爻值生成新记录，保留原盘与原解读", () => {
  const first = saveHistory(liuyao, { question: "原问题" });
  const changed = saveHistory(
    { ...liuyao, lines: [7, 7, 7, 7, 7, 7] },
    { id: first.id, question: "新问题" },
  );
  assert.notEqual(changed.id, first.id);
  assert.deepEqual(getHistoryRecord(first.id).lines, liuyao.lines);
  assert.equal(getHistoryRecord(first.id).question, "原问题");
  assert.equal(listHistory().length, 2);
});

test("删除单条记录，保留其他记录；旧 id 不能覆盖新记录", () => {
  const first = saveHistory(liuyao);
  const second = saveHistory(meihua);
  deleteHistory(first.id);
  assert.equal(getHistoryRecord(first.id), undefined);
  assert.ok(getHistoryRecord(second.id));
  const next = saveHistory(liuyao, { id: first.id });
  assert.notEqual(next.id, first.id);
});

test("存储被禁用或写满时报告失败，损坏数据不会被覆盖", () => {
  storage.set(HISTORY_KEY, "bad json");
  assert.throws(() => listHistory(), /无法读取/);
  assert.throws(() => saveHistory(meihua), /无法读取/);
  assert.equal(storage.get(HISTORY_KEY), "bad json");
  storage.clear();
  window.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.throws(() => saveHistory(meihua), /保存失败/);
});

test("拒绝无效记录、爻值和日期", () => {
  assert.throws(() => saveHistory({ ...liuyao, lines: [7] }), /完成六爻/);
  assert.throws(() => saveHistory({ ...meihua, datePart: "2026-02-30" }));
  const valid = saveHistory(meihua);
  storage.set(
    HISTORY_KEY,
    JSON.stringify([{ ...valid, datePart: "2026-02-30" }]),
  );
  assert.throws(() => listHistory(), /无法读取/);
});

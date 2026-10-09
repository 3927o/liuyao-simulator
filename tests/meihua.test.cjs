const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Lunar } = require("lunar-typescript");
const {
  castMeihua,
  hexagramFromBits,
  bodyUseRelationship,
} = require("../lib/MeihuaEngine.ts");
const { LiuYaoEngine } = require("../lib/LiuYaoEngine.ts");
const { getNowParts, solarFromParts } = require("../lib/calendar.ts");
const { TimeBot } = require("../lib/TimeBot.ts");

test("农历春节取年支、月日及子时数，正确生成本互变卦", () => {
  const result = castMeihua("2026-02-17", "00:00");
  assert.equal(result.lunar.yearNumber, 7);
  assert.equal(result.lunar.month, 1);
  assert.equal(result.lunar.day, 1);
  assert.equal(result.lunar.hourNumber, 1);
  assert.deepEqual(result.sums, { upper: 9, lower: 10 });
  assert.equal(result.movingLine, 4);
  assert.equal(result.original.name, "天泽履");
  assert.equal(result.mutual.name, "风火家人");
  assert.equal(result.changed.name, "风泽中孚");
  assert.equal(result.body.name, "兑");
  assert.equal(result.use.name, "乾");
  assert.equal(result.relationship, "体用比和");
});

test("23 点跨农历年，22:59 仍用当天，23:00 与次日 00:00 同盘", () => {
  const before = castMeihua("2026-02-16", "22:59");
  const zi = castMeihua("2026-02-16", "23:00");
  const midnight = castMeihua("2026-02-17", "00:00");
  assert.equal(before.lunar.year, 2025);
  assert.equal(before.lunar.month, 12);
  assert.equal(before.lunar.hourNumber, 12);
  assert.equal(zi.lunar.year, 2026);
  assert.equal(zi.lunar.day, 1);
  assert.deepEqual(zi.lunar, midnight.lunar);
  assert.deepEqual(zi.lines, midnight.lines);
  assert.equal(zi.datePart, "2026-02-16");
});

test("23 点也跨农历月，日期本身保留实际输入", () => {
  const first = Lunar.fromYmd(2026, 2, 1).getSolar();
  const previous = first.next(-1).toYmd();
  assert.equal(castMeihua(previous, "22:59").lunar.month, 1);
  assert.equal(castMeihua(previous, "23:00").lunar.month, 2);
  assert.equal(castMeihua(previous, "23:00").lunar.day, 1);
});

test("闰月沿用月数，保留闰月标识", () => {
  const solar = Lunar.fromYmd(2025, -6, 1).getSolar();
  const result = castMeihua(solar.toYmd(), "09:00");
  assert.equal(result.lunar.month, 6);
  assert.equal(result.lunar.day, 1);
  assert.equal(result.lunar.isLeapMonth, true);
  assert.equal(result.lunar.hourNumber, 6);
});

test("余零分别按坤八与上爻六，动阴变阳", () => {
  const solar = Lunar.fromYmd(2019, 1, 3).getSolar();
  const result = castMeihua(solar.toYmd(), "13:00");
  assert.equal(result.sums.upper, 16);
  assert.equal(result.sums.lower, 24);
  assert.equal(result.original.name, "坤为地");
  assert.equal(result.movingLine, 6);
  assert.equal(result.changed.name, "山地剥");
  assert.deepEqual(result.lines, [8, 8, 8, 8, 8, 6]);
});

test("全部 64 卦方向与六爻引擎一致", () => {
  const engine = new LiuYaoEngine();
  for (let n = 0; n < 64; n++) {
    const bits = Array.from({ length: 6 }, (_, i) => (n >> i) & 1);
    const hex = hexagramFromBits(bits);
    assert.equal(
      hex.name,
      engine.process(bits.map((bit) => (bit ? 7 : 8))).name,
    );
    assert.ok(!hex.name.includes("未知"));
  }
});

test("每盘恰有一个动爻，互卦爻序与体用位置正确", () => {
  for (let day = 1; day <= 30; day++)
    for (let hour = 0; hour < 24; hour += 2) {
      const result = castMeihua(
        `2026-06-${String(day).padStart(2, "0")}`,
        `${String(hour).padStart(2, "0")}:00`,
      );
      assert.equal(
        result.lines.filter((line) => line === 6 || line === 9).length,
        1,
      );
      assert.equal(
        result.changed.bits.filter((bit, i) => bit !== result.original.bits[i])
          .length,
        1,
      );
      assert.deepEqual(result.mutual.bits, [
        ...result.original.bits.slice(1, 4),
        ...result.original.bits.slice(2, 5),
      ]);
      assert.equal(
        result.bodyPosition,
        result.movingLine <= 3 ? "upper" : "lower",
      );
    }
});

test("体用五行覆盖五种关系", () => {
  assert.equal(bodyUseRelationship("木", "木"), "体用比和");
  assert.equal(bodyUseRelationship("木", "水"), "用生体");
  assert.equal(bodyUseRelationship("木", "火"), "体生用");
  assert.equal(bodyUseRelationship("木", "金"), "用克体");
  assert.equal(bodyUseRelationship("木", "土"), "体克用");
});

test("北京时间换算不依赖运行环境时区，拒绝非法日期时间", () => {
  assert.deepEqual(getNowParts(new Date("2026-10-08T16:00:00Z")), {
    date: "2026-10-09",
    time: "00:00",
  });
  for (const [date, time] of [
    ["2026-02-30", "12:00"],
    ["2026-13-01", "12:00"],
    ["2026-01-01", "24:00"],
    ["2026-01-01", "12:60"],
    ["", ""],
  ]) {
    assert.throws(() => solarFromParts(date, time));
  }
  const time = new TimeBot().getTimeForParts("2026-02-17", "00:00");
  assert.equal(time.date.toISOString(), "2026-02-16T16:00:00.000Z");
  assert.equal(time.year, "丙午");
});

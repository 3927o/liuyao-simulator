const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { POST } = require("../app/api/interpret/route.ts");
const { LiuYaoEngine } = require("../lib/LiuYaoEngine.ts");
const { TimeBot } = require("../lib/TimeBot.ts");
const originalFetch = global.fetch;
const originalKey = process.env.DEEPSEEK_API_KEY;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = originalKey;
});
const request = (body) =>
  new Request("http://localhost/api/interpret", {
    method: "POST",
    body: JSON.stringify(body),
  });
function mockStream(onRequest, endWithNewline = true) {
  process.env.DEEPSEEK_API_KEY = "test-only";
  global.fetch = async (_url, options) => {
    onRequest(JSON.parse(options.body));
    const enc = new TextEncoder();
    const deltas = ["SUMMARY: 简短", "判断\n\n## 结论先说\n", "测试正文"];
    const stream = new ReadableStream({
      start(controller) {
        for (const content of deltas) {
          const bytes = enc.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}${!endWithNewline && content === deltas.at(-1) ? "" : "\n\n"}`,
          );
          for (let i = 0; i < bytes.length; i += 3)
            controller.enqueue(bytes.slice(i, i + 3));
        }
        if (endWithNewline) controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream);
  };
}

test("流的最后一个事件没有换行时也保留正文", async () => {
  mockStream(() => {}, false);
  const response = await POST(
    request({
      module: "meihua",
      meihua: { datePart: "2026-02-17", timePart: "00:00" },
    }),
  );
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.equal(
    events
      .filter((event) => event.content)
      .map((event) => event.content)
      .join(""),
    "## 结论先说\n测试正文",
  );
});

test("梅花 API 在服务端计算 23 点换日盘，用梅花提示词并解析流", async () => {
  mockStream((data) => {
    assert.match(data.messages[0].content, /梅花易数/);
    assert.match(data.messages[1].content, /天泽履/);
    assert.match(data.messages[1].content, /丙午年 正月初一/);
    assert.match(data.messages[1].content, /木旺土衰/);
    assert.match(data.messages[1].content, /变上巽（木）生互下离（火）/);
    assert.match(data.messages[0].content, /不能把十五组关系等权计数/);
    assert.match(data.messages[1].content, /所问之事：测试问题/);
  });
  const response = await POST(
    request({
      module: "meihua",
      question: "测试问题",
      meihua: { datePart: "2026-02-16", timePart: "23:00" },
    }),
  );
  assert.equal(response.status, 200);
  const rows = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.equal(rows[0].summary, "简短判断");
  assert.equal(
    rows
      .slice(1)
      .map((row) => row.content)
      .join(""),
    "## 结论先说\n测试正文",
  );
});

test("六爻 API 兼容原请求，空问题使用状态诊断提示词", async () => {
  const time = new TimeBot().getTimeForParts("2026-02-17", "00:00");
  const hex = new LiuYaoEngine().process([7, 7, 7, 7, 7, 7], time.dayStem);
  mockStream((data) => {
    assert.match(data.messages[0].content, /世爻/);
    assert.match(data.messages[1].content, /乾为天/);
    assert.match(data.messages[1].content, /六爻安静/);
  });
  assert.equal((await POST(request({ time, hex }))).status, 200);
});

test("非法模块、日期、问题与缺失记录返回 400，配置缺失返回 500", async () => {
  delete process.env.DEEPSEEK_API_KEY;
  for (const payload of [
    null,
    {},
    { module: "bad" },
    { module: "meihua", question: 123 },
    { module: "meihua", meihua: { datePart: "2026-02-30", timePart: "00:00" } },
  ]) {
    assert.equal((await POST(request(payload))).status, 400);
  }
  assert.equal(
    (
      await POST(
        request({
          module: "meihua",
          meihua: { datePart: "2026-02-17", timePart: "00:00" },
        }),
      )
    ).status,
    500,
  );
});

test("上游网络失败返回可读错误", async () => {
  process.env.DEEPSEEK_API_KEY = "test-only";
  global.fetch = async () => {
    throw new Error("offline");
  };
  const response = await POST(
    request({
      module: "meihua",
      meihua: { datePart: "2026-02-17", timePart: "00:00" },
    }),
  );
  assert.equal(response.status, 502);
  assert.match(await response.text(), /连接失败/);
});

test("上游余额不足显示明确提示", async () => {
  process.env.DEEPSEEK_API_KEY = "test-only";
  global.fetch = async () => new Response("", { status: 402 });
  const response = await POST(
    request({
      module: "meihua",
      meihua: { datePart: "2026-02-17", timePart: "00:00" },
    }),
  );
  assert.equal(response.status, 502);
  assert.match(await response.text(), /余额不足/);
});

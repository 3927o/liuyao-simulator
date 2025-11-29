import { LiuYaoEngine, YaoValue } from './LiuYaoEngine'; // 确保路径正确

// 1. 初始化引擎
const engine = new LiuYaoEngine();

// 2. 模拟输入: 地天泰 (内乾外坤)
// 顺序：从初爻到上爻
// 9 (老阳, 动) -> 变阴
// 7 (少阳, 静)
// 7 (少阳, 静)
// 8 (少阴, 静)
// 8 (少阴, 静)
// 6 (老阴, 动) -> 变阳
const input: YaoValue[] = [9, 7, 7, 8, 8, 6];

console.log("🎲 输入卦象: 地天泰 (初九动, 上六动)");
console.log("---------------------------------------------------");

// 3. 执行排盘
try {
  const result = engine.process(input);

  // 4. 打印核心信息
  console.log(`✅ 卦名: 【${result.name}】`);
  console.log(`🏠 所属宫: ${result.palace}宫 (${result.palaceElement})`);
  
  // 打印每一爻详情
  console.log("\n--- 六爻排盘 ---");
  // 倒序打印，因为传统是从上往下看 (上爻在最上面)
  [...result.lines].reverse().forEach(line => {
    const shiYing = line.isShi ? " (世)" : line.isYing ? " (应)" : "     ";
    const movingMark = line.isMoving ? (line.isYang ? " O -> " : " X -> ") : "      ";
    const baseText = `${line.gan}${line.zhi}${line.wuXing} [${line.relation}]`;
    
    let changedText = "";
    if (line.changed) {
      changedText = `变: ${line.changed.zhi}${line.changed.wuXing} [${line.changed.relation}]`;
    }

    console.log(
      `第${line.index}爻 | ${line.isYang ? '阳' : '阴'} | ` +
      `${shiYing} | ${baseText} | ${movingMark} ${changedText}`
    );
  });

} catch (error) {
  console.error("❌ 排盘失败:", error);
}
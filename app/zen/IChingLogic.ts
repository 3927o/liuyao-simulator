// --- IChingLogic.ts ---
import { LiuYaoEngine } from '@/lib/LiuYaoEngine';

// 卦象类型定义
export type YaoValue = 6 | 7 | 8 | 9; // 6:老阴, 7:少阳, 8:少阴, 9:老阳

// 计算单次爻值
// 设定：正面(有字/有光) = 3, 背面(无字) = 2
// 结果：
// 3背 (2+2+2=6) -> 老阴 (变爻)
// 1正2背 (3+2+2=7) -> 少阳 (静爻)
// 2正1背 (3+3+2=8) -> 少阴 (静爻)
// 3正 (3+3+3=9) -> 老阳 (变爻)
export const calculateYao = (coins: [0|1, 0|1, 0|1]): YaoValue => {
  const sum = coins.reduce<number>((acc, val) => acc + (val === 1 ? 3 : 2), 0);
  return sum as YaoValue;
};

// 根据 6 个爻值解析卦名
export const resolveHexagram = (lines: YaoValue[]) => {
  // 将爻值转换为二进制字符串 (老阳/少阳->1, 老阴/少阴->0)
  // 注意：六爻是从下往上排的，但二进制通常从左读，这里我们统一：索引0为初爻(底部)
  const binaryString = lines.map(val => (val === 7 || val === 9) ? '1' : '0').join('');
  
  const info = new LiuYaoEngine().process(lines);
  
  return {
    binary: binaryString,
    name: info.name,
    description: lines.some(l => l === 6 || l === 9) ? `变卦：${info.changedName}` : '六爻安静，无动爻。',
    hasMovingLine: lines.some(l => l === 6 || l === 9) // 是否有变爻
  };
};

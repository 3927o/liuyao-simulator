/**
 * TimeBot.ts
 * 赛博六爻 - 天时系统
 * 功能：基于 lunar-javascript 计算干支、空亡、神煞
 */

import { Solar, Lunar } from 'lunar-typescript';
import { TianGan, DiZhi } from './LiuYaoEngine'; // 引用之前的类型定义

// 神煞结果接口
export interface ShenSha {
  yiMa: DiZhi;      // 驿马
  taoHua: DiZhi;    // 桃花
  luShen: DiZhi;    // 禄神
  guiRen: DiZhi[];  // 贵人 (通常有两个)
}

export interface TimeInfo {
  // 原始对象 (方便调试)
  date: Date;
  
  // 干支文本
  year: string;   // e.g. "乙巳"
  month: string;  // e.g. "丁亥"
  day: string;    // e.g. "癸卯"
  hour: string;   // e.g. "壬子"
  
  // 核心参数 (供引擎使用)
  dayStem: TianGan;   // 日干 (用于起六神)
  dayBranch: DiZhi;   // 日支 (用于推神煞)
  monthBranch: DiZhi; // 月支 (用于判断旺衰)
  
  // 特殊信息
  kongWang: string;   // 旬空 (e.g. "辰巳")
  shenSha: ShenSha;   // 神煞对象
}

export class TimeBot {

  /**
   * 获取指定时间的天时信息
   * @param date JS Date对象 (不传则默认当前时间)
   */
  public getTime(date: Date = new Date()): TimeInfo {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();

    // 1. 获取干支
    const yearGanZhi = lunar.getYearInGanZhi();
    const monthGanZhi = lunar.getMonthInGanZhi();
    const dayGanZhi = lunar.getDayInGanZhi();
    const timeGanZhi = lunar.getTimeInGanZhi();

    // 2. 提取核心参数
    // lunar库返回的是字符串，我们强转为特定类型
    const dayStem = lunar.getDayGan() as TianGan;
    const dayBranch = lunar.getDayZhi() as DiZhi;
    const monthBranch = lunar.getMonthZhi() as DiZhi;

    // 3. 计算旬空 (Day Void)
    // lunar库自带 getDayXunKong() 返回如 "辰巳"
    const kongWang = lunar.getDayXunKong();

    // 4. 计算神煞 (Helper function)
    const shenSha = this.calculateShenSha(dayStem, dayBranch);

    return {
      date,
      year: yearGanZhi,
      month: monthGanZhi,
      day: dayGanZhi,
      hour: timeGanZhi,
      dayStem,
      dayBranch,
      monthBranch,
      kongWang,
      shenSha
    };
  }

  /**
   * 内部方法：计算四大核心神煞
   * 规则源自《增删卜易》与常用六爻神煞诀
   */
  private calculateShenSha(dayStem: string, dayBranch: string): ShenSha {
    // 辅助：三合局查表
    // 申子辰 -> 水局; 寅午戌 -> 火局; 亥卯未 -> 木局; 巳酉丑 -> 金局
    
    // 1. 驿马 (Traveling Horse) - 冲三合局首位者为马
    // 申子辰马在寅, 寅午戌马在申, 亥卯未马在巳, 巳酉丑马在亥
    const yiMaMap: Record<string, DiZhi> = {
      '申': '寅', '子': '寅', '辰': '寅',
      '寅': '申', '午': '申', '戌': '申',
      '亥': '巳', '卯': '巳', '未': '巳',
      '巳': '亥', '酉': '亥', '丑': '亥'
    };

    // 2. 桃花 (Peach Blossom) - 三合局沐浴之地
    // 申子辰见酉, 寅午戌见卯, 亥卯未见子, 巳酉丑见午
    const taoHuaMap: Record<string, DiZhi> = {
      '申': '酉', '子': '酉', '辰': '酉',
      '寅': '卯', '午': '卯', '戌': '卯',
      '亥': '子', '卯': '子', '未': '子',
      '巳': '午', '酉': '午', '丑': '午'
    };

    // 3. 禄神 (Prosperity) - 取决于日干
    // 甲禄在寅, 乙禄在卯, 丙戊禄在巳, 丁己禄在午, 庚禄在申, 辛禄在酉, 壬禄在亥, 癸禄在子
    const luShenMap: Record<string, DiZhi> = {
      '甲': '寅', '乙': '卯',
      '丙': '巳', '戊': '巳',
      '丁': '午', '己': '午',
      '庚': '申', '辛': '酉',
      '壬': '亥', '癸': '子'
    };

    // 4. 贵人 (Nobleman) - 天乙贵人 (日干)
    // 甲戊庚牛羊(丑未), 乙己鼠猴乡(子申), 丙丁猪鸡位(亥酉), 壬癸兔蛇藏(卯巳), 六辛逢马虎(午寅)
    const guiRenMap: Record<string, DiZhi[]> = {
      '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'],
      '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '壬': ['巳', '卯'], '癸': ['巳', '卯'],
      '辛': ['午', '寅']
    };

    return {
      yiMa: yiMaMap[dayBranch] || '寅', // Fallback
      taoHua: taoHuaMap[dayBranch] || '酉',
      luShen: luShenMap[dayStem] || '寅',
      guiRen: guiRenMap[dayStem] || []
    };
  }
}

const bot = new TimeBot();

// ==========================================
// Case 1: 验证你上传的图片数据
// 目标：乙巳年 丁亥月 癸卯日 (神煞：驿马-巳, 桃花-子, 日禄-子, 贵人-卯,巳)
// 注意：图片里没有写具体几点，我们假设是当天中午12点
// ==========================================
// 设定日期：2025年11月某日 (需要反推一下乙巳年丁亥月癸卯日是哪天)
// 经查万年历，2025年11月26日(左右)是癸卯日
const targetDate = new Date('2024-11-30T01:10:00'); 

console.log("🛠️ 正在进行时光回溯测试 (Backtest)...");
console.log("目标: 乙巳年 丁亥月 癸卯日");
const past = bot.getTime(targetDate);

console.log("------------------------------------------------");
console.log(`📅 日期: ${past.date.toLocaleDateString()}`);
console.log(`🔠 干支: ${past.year}年 ${past.month}月 ${past.day}日 ${past.hour}时`);
console.log(`⬛ 空亡: ${past.kongWang}`);
console.log(`🌟 神煞:`);
console.log(`   驿马: ${past.shenSha.yiMa}`);
console.log(`   桃花: ${past.shenSha.taoHua}`);
console.log(`   日禄: ${past.shenSha.luShen}`);
console.log(`   贵人: ${past.shenSha.guiRen.join(', ')}`);
console.log("------------------------------------------------");

// 校验
if (past.day === '癸卯' && past.shenSha.yiMa === '巳' && past.shenSha.taoHua === '子') {
  console.log("✅ 历史数据验证成功！神煞计算与图片一致。");
} else {
  console.log("⚠️ 历史数据验证可能有偏差，请检查日期是否准确。");
}
/**
 * TimeBot.ts
 * 赛博六爻 - 天时系统
 * 功能：基于 lunar-javascript 计算干支、空亡、神煞
 */

import { Solar } from 'lunar-typescript';
import { solarFromParts } from './calendar';
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
    return this.fromSolar(solar, date);
  }

  public getTimeForParts(datePart: string, timePart: string): TimeInfo {
    return this.fromSolar(solarFromParts(datePart, timePart), new Date(`${datePart}T${timePart}:00+08:00`));
  }

  private fromSolar(solar: Solar, date: Date): TimeInfo {
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

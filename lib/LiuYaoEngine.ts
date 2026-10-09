/**
 * LiuYaoEngine.ts
 * 完整版赛博六爻引擎 (v2.0)
 * 支持：纳甲、世应、六亲、伏神、六神、变卦推演
 */

// ==========================================
// 1. 类型定义
// ==========================================

export type YaoValue = 6 | 7 | 8 | 9; // 6老阴(X), 7少阳, 8少阴, 9老阳(O)
export type WuXing = '金' | '木' | '水' | '火' | '土';
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type BaguaName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';
export type SixBeast = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武';

export interface LineResult {
  index: number;      // 爻位 (1-6)
  isYang: boolean;    // 阴阳
  isMoving: boolean;  // 动爻?
  value: YaoValue;    
  
  // 本卦信息
  gan: TianGan;       
  zhi: DiZhi;
  wuXing: WuXing;
  relation: string;   // 六亲
  beast: SixBeast;    // 六神

  // 伏神 (本卦缺少的五行，从本宫卦借入)
  hidden?: {
    gan: TianGan;
    zhi: DiZhi;
    wuXing: WuXing;
    relation: string;
  };
  
  // 变爻信息
  changed?: {
    gan: TianGan;
    zhi: DiZhi;
    wuXing: WuXing;
    relation: string;
  };
  
  isShi: boolean;     // 世
  isYing: boolean;    // 应
}

export interface HexagramResult {
  name: string;
  palace: BaguaName;
  palaceElement: WuXing;
  changedName?: string;
  lines: LineResult[];       // 本卦6爻
  changedLines: LineResult[]; // 变卦6爻 (新增)
}

// ==========================================
// 2. 常量定义
// ==========================================

const WUXING_MAP: Record<DiZhi, WuXing> = {
  '子': '水', '亥': '水', '寅': '木', '卯': '木', '巳': '火', '午': '火',
  '辰': '土', '戌': '土', '丑': '土', '未': '土', '申': '金', '酉': '金'
};

export const BAGUA_WUXING: Record<BaguaName, WuXing> = {
  '乾': '金', '兑': '金', '离': '火', '震': '木', '巽': '木', '坎': '水', '艮': '土', '坤': '土'
};

// 八纯卦二进制 (用于寻宫和提取伏神)
const PURE_BAGUA_BITS: Record<BaguaName, number[]> = {
  '乾': [1, 1, 1, 1, 1, 1], '兑': [1, 1, 0, 1, 1, 0], '离': [1, 0, 1, 1, 0, 1], '震': [1, 0, 0, 1, 0, 0],
  '巽': [0, 1, 1, 0, 1, 1], '坎': [0, 1, 0, 0, 1, 0], '艮': [0, 0, 1, 0, 0, 1], '坤': [0, 0, 0, 0, 0, 0]
};

const PALACE_ORDER: BaguaName[] = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

// 纳甲规则
const NAJIA_RULES: Record<BaguaName, { inner: DiZhi[], outer: DiZhi[], innerGan: TianGan, outerGan: TianGan }> = {
  '乾': { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'], innerGan: '甲', outerGan: '壬' },
  '震': { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'], innerGan: '庚', outerGan: '庚' },
  '坎': { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'], innerGan: '戊', outerGan: '戊' },
  '艮': { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'], innerGan: '丙', outerGan: '丙' },
  '坤': { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'], innerGan: '乙', outerGan: '癸' },
  '巽': { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'], innerGan: '辛', outerGan: '辛' },
  '离': { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'], innerGan: '己', outerGan: '己' },
  '兑': { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'], innerGan: '丁', outerGan: '丁' }
};

// 六神起法 (根据日干)
// 甲乙起青龙，丙丁起朱雀...
const LIU_SHEN_ORDER: SixBeast[] = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const LIU_SHEN_START: Record<string, number> = {
  '甲': 0, '乙': 0, 
  '丙': 1, '丁': 1,
  '戊': 2,
  '己': 3,
  '庚': 4, '辛': 4,
  '壬': 5, '癸': 5
};

// 64卦名表 (Key: 上卦+下卦)
// Value 格式通常为：[上卦自然象][下卦自然象][卦名]，纯卦为 [卦名]为[自然象]
export const HEXAGRAM_NAMES: Record<string, string> = {
  // --- 上卦：乾 (天) ---
  '乾乾': '乾为天',
  '乾兑': '天泽履',
  '乾离': '天火同人',
  '乾震': '天雷无妄',
  '乾巽': '天风姤',
  '乾坎': '天水讼',
  '乾艮': '天山遁',
  '乾坤': '天地否',

  // --- 上卦：兑 (泽) ---
  '兑乾': '泽天夬',
  '兑兑': '兑为泽',
  '兑离': '泽火革',
  '兑震': '泽雷随',
  '兑巽': '泽风大过',
  '兑坎': '泽水困',
  '兑艮': '泽山咸',
  '兑坤': '泽地萃',

  // --- 上卦：离 (火) ---
  '离乾': '火天大有',
  '离兑': '火泽睽',
  '离离': '离为火',
  '离震': '火雷噬嗑',
  '离巽': '火风鼎',
  '离坎': '火水未济',
  '离艮': '火山旅',
  '离坤': '火地晋',

  // --- 上卦：震 (雷) ---
  '震乾': '雷天大壮',
  '震兑': '雷泽归妹',
  '震离': '雷火丰',
  '震震': '震为雷',
  '震巽': '雷风恒',
  '震坎': '雷水解',
  '震艮': '雷山小过',
  '震坤': '雷地豫',

  // --- 上卦：巽 (风) ---
  '巽乾': '风天小畜',
  '巽兑': '风泽中孚',
  '巽离': '风火家人',
  '巽震': '风雷益',
  '巽巽': '巽为风',
  '巽坎': '风水涣',
  '巽艮': '风山渐',
  '巽坤': '风地观',

  // --- 上卦：坎 (水) ---
  '坎乾': '水天需',
  '坎兑': '水泽节',
  '坎离': '水火既济',
  '坎震': '水雷屯',
  '坎巽': '水风井',
  '坎坎': '坎为水',
  '坎艮': '水山蹇',
  '坎坤': '水地比',

  // --- 上卦：艮 (山) ---
  '艮乾': '山天大畜',
  '艮兑': '山泽损',
  '艮离': '山火贲',
  '艮震': '山雷颐',
  '艮巽': '山风蛊',
  '艮坎': '山水蒙',
  '艮艮': '艮为山',
  '艮坤': '山地剥',

  // --- 上卦：坤 (地) ---
  '坤乾': '地天泰',
  '坤兑': '地泽临',
  '坤离': '地火明夷',
  '坤震': '地雷复',
  '坤巽': '地风升',
  '坤坎': '地水师',
  '坤艮': '地山谦',
  '坤坤': '坤为地',
};

// ==========================================
// 3. 核心类
// ==========================================

export class LiuYaoEngine {

/**
   * 排盘主函数 (升级版：支持全盘变卦显示)
   */
  public process(yaoList: YaoValue[], dayStem: TianGan = '甲'): HexagramResult {
    // 1. 基础转换
    const baseBits = yaoList.map(y => (y === 9 || y === 7) ? 1 : 0);
    const changedBits = yaoList.map(y => {
       if (y === 9) return 0; // 老阳变阴
       if (y === 6) return 1; // 老阴变阳
       return (y === 7) ? 1 : 0; // 静爻不变
    });
    
    // 2. 识别卦名
    const lowerName = this.bitsToBagua(baseBits.slice(0, 3));
    const upperName = this.bitsToBagua(baseBits.slice(3, 6));
    const name = HEXAGRAM_NAMES[upperName + lowerName] || `${upperName}${lowerName}`;

    const cLowerName = this.bitsToBagua(changedBits.slice(0, 3));
    const cUpperName = this.bitsToBagua(changedBits.slice(3, 6));
    // 即使没有动爻，变卦名也可以是本卦名，但通常前端会隐藏
    const changedName = HEXAGRAM_NAMES[cUpperName + cLowerName] || `${cUpperName}${cLowerName}`;

    // 3. 寻宫 (京房八宫) - 永远以本卦为准
    const { palace, shi, ying } = this.findShiYao(baseBits);
    const palaceElement = BAGUA_WUXING[palace];

    // 4. 辅助数据准备
    const beastStartIndex = LIU_SHEN_START[dayStem] || 0;
    const presentRelations = new Set<string>();

    // ==========================================
    // 第一步：构建本卦 (Base Hexagram)
    // ==========================================
    const lines: LineResult[] = yaoList.map((val, index) => {
      const isInner = index < 3;
      const localIndex = index % 3;
      
      const guaConfig = NAJIA_RULES[isInner ? lowerName : upperName];
      const zhi = isInner ? guaConfig.inner[localIndex] : guaConfig.outer[localIndex];
      const zhiWuXing = WUXING_MAP[zhi];
      const relation = this.getRelation(palaceElement, zhiWuXing);
      
      presentRelations.add(relation);

      const beast = LIU_SHEN_ORDER[(beastStartIndex + index) % 6];
      const isMoving = val === 6 || val === 9;

      return {
        index: index + 1,
        isYang: val === 9 || val === 7,
        isMoving,
        value: val,
        gan: isInner ? guaConfig.innerGan : guaConfig.outerGan,
        zhi,
        wuXing: zhiWuXing,
        relation,
        beast,
        isShi: (index + 1) === shi,
        isYing: (index + 1) === ying
      };
    });

    // ==========================================
    // 第二步：构建变卦 (Changed Hexagram) - 全盘计算
    // ==========================================
    // 注意：变卦的六亲，依然对比【本卦的宫五行 (palaceElement)】
    const changedLines: LineResult[] = changedBits.map((bit, index) => {
      const isInner = index < 3;
      const localIndex = index % 3;
      
      // 使用【变卦】的卦象来取纳甲
      const guaConfig = NAJIA_RULES[isInner ? cLowerName : cUpperName];
      const zhi = isInner ? guaConfig.inner[localIndex] : guaConfig.outer[localIndex];
      const zhiWuXing = WUXING_MAP[zhi];
      
      // 关键：六亲依然对比【本宫】
      const relation = this.getRelation(palaceElement, zhiWuXing);

      return {
        index: index + 1,
        isYang: bit === 1,
        isMoving: false, // 在变卦视图中，通常不再标记动爻，或者是另一种标记方式
        value: bit === 1 ? 7 : 8, // 变卦里只有静爻 (7/8)
        gan: isInner ? guaConfig.innerGan : guaConfig.outerGan,
        zhi,
        wuXing: zhiWuXing,
        relation,
        beast: lines[index].beast, // 六神通常只排一次，沿用本卦
        isShi: false, // 变卦通常不标世应，或者标变卦的世应(较少见)，这里暂空
        isYing: false
      };
    });

    // ==========================================
    // 第三步：回填伏神 (Hidden Spirits)
    // ==========================================
    const pureBits = PURE_BAGUA_BITS[palace];
    const pureConfig = NAJIA_RULES[palace];
    
    lines.forEach((line, index) => {
       // 简化伏神逻辑：如果本卦缺某五行，则去纯卦找
       // 实际排盘规则：按宫位排伏神。伏神只出现在本宫纯卦对应的爻位下。
       const isInner = index < 3;
       const localIndex = index % 3;
       const pureZhi = isInner ? pureConfig.inner[localIndex] : pureConfig.outer[localIndex];
       const pureWuXing = WUXING_MAP[pureZhi];
       const pureRelation = this.getRelation(palaceElement, pureWuXing);
       
       // 只有当该五行在本卦中完全缺失时，才显示伏神
       if (!presentRelations.has(pureRelation)) {
         line.hidden = {
            gan: isInner ? pureConfig.innerGan : pureConfig.outerGan,
            zhi: pureZhi,
            wuXing: pureWuXing,
            relation: pureRelation
         };
       }
    });

    // 修改返回结构，不再在 lines 内部嵌套 changed，而是并行返回
    // 你需要修改 HexagramResult 接口定义
    return { 
      name, 
      palace, 
      palaceElement, 
      changedName, 
      lines,
      changedLines // 新增字段
    };
  }

  // --- Helpers ---

  private bitsToBagua(bits: number[]): BaguaName {
    const key = bits.join('');
    const map: Record<string, BaguaName> = {
      '111': '乾', '000': '坤', '010': '坎', '101': '离',
      '100': '震', '001': '艮', '011': '巽', '110': '兑'
    };
    return map[key] || '乾';
  }

  private getRelation(me: WuXing, other: WuXing): string {
    if (me === other) return '兄弟';
    const rels: Record<string, string> = {
      '金水':'子孙', '金木':'妻财', '金火':'官鬼', '金土':'父母',
      '木火':'子孙', '木土':'妻财', '木金':'官鬼', '木水':'父母',
      '水木':'子孙', '水火':'妻财', '水土':'官鬼', '水金':'父母',
      '火土':'子孙', '火金':'妻财', '火水':'官鬼', '火木':'父母',
      '土金':'子孙', '土水':'妻财', '土木':'官鬼', '土火':'父母'
    };
    return rels[me + other] || '未知';
  }

  private findShiYao(targetBits: number[]): { palace: BaguaName, shi: number, ying: number } {
    const isMatch = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
    const flip = (b: number[], i: number) => { const n = [...b]; n[i] = n[i]?0:1; return n; };

    for (const pName of PALACE_ORDER) {
      const pure = PURE_BAGUA_BITS[pName];
      if (isMatch(targetBits, pure)) return { palace: pName, shi: 6, ying: 3 };
      
      let c = [...pure];
      c = flip(c, 0); if (isMatch(targetBits, c)) return { palace: pName, shi: 1, ying: 4 };
      c = flip(c, 1); if (isMatch(targetBits, c)) return { palace: pName, shi: 2, ying: 5 };
      c = flip(c, 2); if (isMatch(targetBits, c)) return { palace: pName, shi: 3, ying: 6 };
      c = flip(c, 3); if (isMatch(targetBits, c)) return { palace: pName, shi: 4, ying: 1 };
      c = flip(c, 4); if (isMatch(targetBits, c)) return { palace: pName, shi: 5, ying: 2 };
      c = flip(c, 3); if (isMatch(targetBits, c)) return { palace: pName, shi: 4, ying: 1 }; // 游魂
      c[0]=pure[0]; c[1]=pure[1]; c[2]=pure[2];
      if (isMatch(targetBits, c)) return { palace: pName, shi: 3, ying: 6 }; // 归魂
    }
    throw new Error("Invalid Hexagram");
  }
}

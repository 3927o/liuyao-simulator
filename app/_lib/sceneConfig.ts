/**
 * 场景配置文件
 * 统一管理硬币材质、音效、震动、灯光等参数
 * 修改此文件即可调整所有效果
 */

// ============================================
// 硬币配置
// ============================================
export const COIN_CONFIG = {
  /** 材质配置 */
  material: {
    /** 粗糙度 (0=镜面, 1=完全哑光) */
    roughness: {
      white: 0.85,   // 阳面
      black: 0.9,    // 阴面
      edge: 0.7,     // 边缘（略光滑）
      mark: 0.8,     // 标记
    },
    /** 金属感 (0=塑料, 1=金属) */
    metalness: {
      white: 0,
      black: 0,
      edge: 0.05,    // 边缘微微金属感
      mark: 0,
    },
    /** 颜色配置 */
    colors: {
      white: "#ffffff",      // 阳面 - 白色
      black: "#111111",      // 阴面 - 黑色
      edge: "#e0e0e0",       // 边缘 - 浅灰
      darkMark: "#333333",   // 阳面标记 - 深灰
      lightMark: "#cccccc",  // 阴面标记 - 浅灰
    },
  },

  /** 音效配置 */
  audio: {
    /** 基础频率范围 [最小, 最大] Hz - 影响音高 */
    baseFreq: [800, 1200] as [number, number],
    /** 主音量 (0-1) */
    volume: 0.3,
    /** 衰减时间（秒）- 越短越清脆 */
    decay: 0.15,
    /** 低频撞击音量比例 */
    impactVolume: 0.2,
    /** 高频泛音音量比例 */
    shimmerVolume: 0.1,
  },

  /** 震动配置 */
  vibration: {
    /** 冷却时间(ms) - 防止连续碰撞震动过频 */
    cooldown: 50,
    /** 震动时长范围 [最小, 最大] ms */
    duration: [10, 50] as [number, number],
  },
};

// ============================================
// 灯光配置
// ============================================
export const LIGHT_CONFIG = {
  /** 主方向光 */
  directional: {
    /** 位置 [x, y, z] */
    position: [10, 15, 10] as [number, number, number],
    /** 亮度 */
    intensity: 1.5,
    /** 颜色 */
    color: "#ffffff",
  },

  /** 阴影配置 */
  shadow: {
    /** 阴影贴图分辨率 - 越高越清晰但越耗性能 (512/1024/2048) */
    mapSize: 1024,
    /** 阴影相机范围 */
    cameraFar: 50,
    cameraSize: 10,
    /** 阴影偏移 - 解决阴影条纹问题 */
    bias: -0.0001,
    /** 地面阴影透明度 (0-1) */
    opacity: 0.15,
  },

  /** 环境光 */
  ambient: {
    intensity: 0.8,
  },

  /** 点光源 */
  point: {
    position: [-5, 10, 5] as [number, number, number],
    intensity: 0.5,
    color: "#ffffff",
  },
};

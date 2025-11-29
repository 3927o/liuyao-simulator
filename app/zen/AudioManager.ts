// --- Audio Engine: 实时声音合成系统 ---
class AudioManager {
  private ctx: AudioContext | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  constructor() {
    // 浏览器策略要求：AudioContext 必须在用户交互后才能初始化
  }

  init() {
    if (!this.ctx) {
      // 兼容性处理
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- 1. 启动注能音效 (The Drone) ---
  startCharging() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 创建两个略微失谐的振荡器，制造"科幻感"的干涉波
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();

    // 设置波形：锯齿波比较有"电"的感觉
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc2.type = 'square'; // 方波增加一点厚度

    // 初始频率 (低频嗡嗡声)
    this.droneOsc1.frequency.setValueAtTime(55, t); // A1
    this.droneOsc2.frequency.setValueAtTime(55.5, t); // 略微失谐

    // 滤波器：初始状态把高频切掉，声音很闷
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(100, t);
    this.filter.Q.value = 5; // 增加共振峰值

    // 初始音量为 0
    this.droneGain.gain.setValueAtTime(0, t);
    this.droneGain.gain.linearRampToValueAtTime(0.3, t + 0.1); // 渐入

    // 连线: Osc -> Filter -> Gain -> Out
    this.droneOsc1.connect(this.filter);
    this.droneOsc2.connect(this.filter);
    this.filter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  // --- 2. 实时更新注能参数 ---
  updateCharging(energy: number) {
    if (!this.ctx || !this.droneOsc1 || !this.droneOsc2 || !this.filter || !this.droneGain) return;

    const t = this.ctx.currentTime;
    
    // 频率爬升：从 55Hz 爬升到 约 400Hz
    // 使用指数级增长，听起来更像引擎加速
    const baseFreq = 55 + Math.pow(energy, 2) * 300;
    
    // 实时更新频率
    this.droneOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    // 第二个振荡器失谐程度随能量增加，制造"不稳定"的撕裂感
    this.droneOsc2.frequency.setTargetAtTime(baseFreq * (1 + energy * 0.05), t, 0.05);

    // 滤波器打开：能量越高，声音越亮（听到更多高频细节）
    const filterFreq = 100 + Math.pow(energy, 3) * 3000;
    this.filter.frequency.setTargetAtTime(filterFreq, t, 0.1);

    // 音量随能量微增
    this.droneGain.gain.setTargetAtTime(0.2 + energy * 0.2, t, 0.1);
  }

  // --- 3. 停止注能 (松手时) ---
  stopCharging() {
    if (!this.ctx || !this.droneGain || !this.droneOsc1) return;
    const t = this.ctx.currentTime;
    
    // 快速淡出
    this.droneGain.gain.cancelScheduledValues(t);
    this.droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    
    const osc1 = this.droneOsc1;
    const osc2 = this.droneOsc2;
    setTimeout(() => {
      osc1.stop();
      osc2?.stop();
    }, 500);

    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;
  }

  // --- 4. 触发"定格"音效 (Cyber Gong) ---
  playImpact() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // FM 合成：模拟金属撞击声
    const carrier = this.ctx.createOscillator(); // 载波 (听到的主音)
    const modulator = this.ctx.createOscillator(); // 调制波 (改变音色的)
    const modGain = this.ctx.createGain(); // 调制深度
    const masterGain = this.ctx.createGain(); // 总音量

    // 参数设置：制造一种空灵的金属声
    carrier.frequency.value = 220; // 基础音调 (A3)
    modulator.frequency.value = 330; // 调制比例 1.5 (产生非谐波泛音，像钟声)
    
    // 调制深度包络：撞击瞬间声音很“脏”，然后迅速变纯净
    modGain.gain.setValueAtTime(1000, t); 
    modGain.gain.exponentialRampToValueAtTime(0.01, t + 1);

    // 音量包络：长尾音
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(1, t + 0.02); // 瞬间起音
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 3); // 3秒长尾

    // 连线: Modulator -> ModGain -> Carrier.frequency
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    
    // Carrier -> MasterGain -> Out
    carrier.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    carrier.start();
    modulator.start();
    
    // 自动停止
    setTimeout(() => {
      carrier.stop();
      modulator.stop();
    }, 3000);
  }
}

// 单例导出
export const audioManager = new AudioManager();
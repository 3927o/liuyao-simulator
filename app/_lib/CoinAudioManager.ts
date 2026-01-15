import { COIN_CONFIG } from './sceneConfig';

const { audio } = COIN_CONFIG;

/**
 * 硬币碰撞音效合成器
 * 使用 Web Audio API 合成清脆的金属碰撞声
 * 参数可在 sceneConfig.ts 中调整
 */
class CoinAudioManager {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 播放金属碰撞音效
   * @param velocity 碰撞速度 (0-1)，影响音量和音色
   */
  playCollision(velocity: number = 0.5) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const normalizedVel = Math.min(1, Math.max(0.1, velocity));

    // 从配置读取参数
    const [minFreq, maxFreq] = audio.baseFreq;
    const baseFreq = minFreq + Math.random() * (maxFreq - minFreq);

    // === 高频金属撞击声 (主音) ===
    const metalOsc = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metalOsc.frequency.setValueAtTime(baseFreq, t);
    metalOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.1);
    metalOsc.type = 'triangle';

    metalGain.gain.setValueAtTime(audio.volume * normalizedVel, t);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + audio.decay);

    metalOsc.connect(metalGain);
    metalGain.connect(this.ctx.destination);
    metalOsc.start(t);
    metalOsc.stop(t + audio.decay + 0.05);

    // === 低频撞击感 (增加厚度) ===
    const impactOsc = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();

    impactOsc.frequency.setValueAtTime(150 + Math.random() * 50, t);
    impactOsc.type = 'sine';

    impactGain.gain.setValueAtTime(audio.impactVolume * normalizedVel, t);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    impactOsc.connect(impactGain);
    impactGain.connect(this.ctx.destination);
    impactOsc.start(t);
    impactOsc.stop(t + 0.1);

    // === 高频泛音 (金属光泽) ===
    const shimmerOsc = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();

    shimmerOsc.frequency.setValueAtTime(baseFreq * 2.5, t);
    shimmerOsc.type = 'sine';

    shimmerGain.gain.setValueAtTime(audio.shimmerVolume * normalizedVel, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.ctx.destination);
    shimmerOsc.start(t);
    shimmerOsc.stop(t + 0.12);
  }
}

// 单例导出
export const coinAudioManager = new CoinAudioManager();

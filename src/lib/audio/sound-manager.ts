export enum SfxType {
  CLICK_CORRECT = 'click_correct',
  CLICK_WRONG = 'click_wrong',
  COMBO = 'combo',
  HINT_USED = 'hint_used',
  GAME_COMPLETE = 'game_complete',
  ACHIEVEMENT = 'achievement',
  BUTTON_CLICK = 'button_click',
  TIMER_WARNING = 'timer_warning',
  PERFECT = 'perfect',
  LEVEL_UP = 'level_up',
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private enabled = true;
  private musicEnabled = true;
  private bgmOsc: OscillatorNode | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.5;
      this.sfxGain.gain.value = 0.6;
      this.musicGain.gain.value = 0.3;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  setMusicEnabled(v: boolean) {
    this.musicEnabled = v;
    if (!v) this.stopBGM();
  }
  setSfxVolume(v: number) { if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusicVolume(v: number) { if (this.musicGain) this.musicGain.gain.value = v; }

  playSfx(type: SfxType) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;

      switch (type) {
        case SfxType.CLICK_CORRECT:
          this.playTone(ctx, now, [880, 1100], 'sine', 0.3, 0.25);
          break;
        case SfxType.CLICK_WRONG:
          this.playTone(ctx, now, [220, 180], 'sawtooth', 0.15, 0.2);
          break;
        case SfxType.COMBO:
          this.playTone(ctx, now, [440], 'sine', 0.2, 0.15);
          this.playTone(ctx, now + 0.08, [660], 'sine', 0.2, 0.15);
          this.playTone(ctx, now + 0.16, [880], 'sine', 0.25, 0.2);
          break;
        case SfxType.HINT_USED:
          this.playTone(ctx, now, [660, 550], 'sine', 0.2, 0.4);
          break;
        case SfxType.GAME_COMPLETE:
          this.playChord(ctx, now, [523, 659, 784], 0.3, 0.6);
          this.playChord(ctx, now + 0.3, [587, 740, 880], 0.25, 0.6);
          break;
        case SfxType.ACHIEVEMENT:
          this.playTone(ctx, now, [784], 'sine', 0.2, 0.15);
          this.playTone(ctx, now + 0.1, [988], 'sine', 0.25, 0.15);
          this.playTone(ctx, now + 0.2, [1175], 'sine', 0.3, 0.25);
          break;
        case SfxType.BUTTON_CLICK:
          this.playTone(ctx, now, [600], 'sine', 0.1, 0.05);
          break;
        case SfxType.TIMER_WARNING:
          this.playTone(ctx, now, [800, 600], 'square', 0.15, 0.15);
          break;
        case SfxType.PERFECT:
          this.playChord(ctx, now, [523, 659, 784], 0.3, 0.3);
          this.playChord(ctx, now + 0.2, [659, 784, 988], 0.3, 0.3);
          this.playChord(ctx, now + 0.4, [784, 988, 1175], 0.35, 0.5);
          break;
        case SfxType.LEVEL_UP:
          for (let i = 0; i < 5; i++) {
            this.playTone(ctx, now + i * 0.08, [440 + i * 110], 'sine', 0.2, 0.12);
          }
          break;
      }
    } catch {
      // Audio not available
    }
  }

  private playTone(ctx: AudioContext, start: number, freqs: number[], type: OscillatorType, vol: number, dur: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqs[0], start);
    if (freqs.length > 1) osc.frequency.linearRampToValueAtTime(freqs[1], start + dur);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  }

  private playChord(ctx: AudioContext, start: number, freqs: number[], vol: number, dur: number) {
    for (const f of freqs) {
      this.playTone(ctx, start, [f], 'sine', vol / freqs.length, dur);
    }
  }

  playBGM() {
    if (!this.musicEnabled) return;
    // Simple ambient pad
    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;
      this.stopBGM();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 220;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(this.musicGain || ctx.destination);
      osc.start(now);
      this.bgmOsc = osc;
    } catch { /* */ }
  }

  stopBGM() {
    if (this.bgmOsc) {
      try { this.bgmOsc.stop(); } catch { /* */ }
      this.bgmOsc = null;
    }
  }
}

export const soundManager = new SoundManager();

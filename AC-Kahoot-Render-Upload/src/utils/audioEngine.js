// Web Audio API Synthesizer - Zero external audio file dependencies
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgInterval = null;
    this.thinkingInterval = null;
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("AudioContext init error", e);
    }
  }

  toggleMute() {
    try {
      this.isMuted = !this.isMuted;
      if (this.isMuted) {
        this.stopLobbyMusic();
        this.stopThinkingMusic();
      }
    } catch {}
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  playClick() {
    this.playTone(800, 'triangle', 0.05, 0.15);
  }

  playAnswerLockIn() {
    if (this.isMuted) return;
    this.init();
    // Satisfying 2-tone futuristic lock-in chime: 600Hz -> 1200Hz
    this.playTone(600, 'triangle', 0.08, 0.2);
    setTimeout(() => {
      this.playTone(1200, 'sine', 0.15, 0.25);
    }, 60);
  }

  playCountdownTick() {
    this.playTone(520, 'sine', 0.08, 0.2);
  }

  playTickTock(isFast = false) {
    this.playTone(isFast ? 880 : 660, 'triangle', 0.05, isFast ? 0.25 : 0.18);
  }

  playHeartbeat() {
    if (this.isMuted) return;
    this.init();
    // Low sub-bass double pulse: Thump-thump
    this.playTone(90, 'sine', 0.12, 0.3);
    setTimeout(() => {
      this.playTone(75, 'sine', 0.16, 0.25);
    }, 120);
  }

  playCountdownFinal() {
    this.playTone(1040, 'triangle', 0.4, 0.35);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.init();
    // Happy major arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.25, 0.25);
      }, i * 60);
    });
  }

  playIncorrect() {
    if (this.isMuted) return;
    this.init();
    // Low buzz
    this.playTone(180, 'sawtooth', 0.3, 0.2);
    setTimeout(() => {
      this.playTone(140, 'sawtooth', 0.4, 0.2);
    }, 120);
  }

  playFanfare() {
    if (this.isMuted) return;
    this.init();
    // Grand victory fanfare chords
    const fanfare = [
      { f: 523.25, d: 120 }, // C5
      { f: 659.25, d: 120 }, // E5
      { f: 783.99, d: 120 }, // G5
      { f: 1046.50, d: 350 }, // C6
      { f: 880.00, d: 120 },  // A5
      { f: 1046.50, d: 120 }, // C6
      { f: 1174.66, d: 500 }  // D6
    ];
    let time = 0;
    fanfare.forEach((n) => {
      setTimeout(() => {
        this.playTone(n.f, 'triangle', n.d / 1000, 0.3);
      }, time);
      time += n.d + 25;
    });
  }

  startLobbyMusic() {
    if (this.isMuted || this.bgInterval) return;
    this.init();
    const chords = [
      [329.63, 392.00, 493.88], // E minor
      [261.63, 329.63, 392.00], // C major
      [293.66, 369.99, 440.00], // D major
      [246.94, 311.13, 369.99]  // B minor
    ];
    let step = 0;
    this.bgInterval = setInterval(() => {
      if (this.isMuted) return;
      const currentChord = chords[Math.floor(step / 4) % chords.length];
      const note = currentChord[step % currentChord.length];
      this.playTone(note, 'sine', 0.2, 0.08);
      step++;
    }, 280);
  }

  stopLobbyMusic() {
    if (this.bgInterval) {
      clearInterval(this.bgInterval);
      this.bgInterval = null;
    }
  }

  startThinkingMusic() {
    if (this.isMuted || this.thinkingInterval) return;
    this.init();
    
    // Focused pulsing question groove: Arpeggiated bass & mid synths
    const baseline = [
      220.00, 261.63, 329.63, 440.00, // A minor pulse
      196.00, 246.94, 293.66, 392.00, // G major pulse
      174.61, 220.00, 261.63, 349.23, // F major pulse
      246.94, 329.63, 392.00, 493.88  // E minor pulse
    ];
    let step = 0;
    this.thinkingInterval = setInterval(() => {
      if (this.isMuted) return;
      const note = baseline[step % baseline.length];
      this.playTone(note, 'triangle', 0.16, 0.09);
      step++;
    }, 220);
  }

  stopThinkingMusic() {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }
}

export const sound = new AudioEngine();

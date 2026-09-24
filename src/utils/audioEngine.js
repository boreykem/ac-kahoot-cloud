// Web Audio API Synthesizer - High Volume & Studio-Quality Dynamic Sound Engine
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.isMuted = false;
    this.bgInterval = null;
    this.thinkingInterval = null;
    this.volume = 1.0; // 100% Maximum Volume
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          
          // Studio Master Compressor to boost perceived loudness without digital distortion
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(25, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

          // Master Gain Node at Maximum
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);

          this.masterGain.connect(this.compressor);
          this.compressor.connect(this.ctx.destination);
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
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
      }
      if (this.isMuted) {
        this.stopLobbyMusic();
        this.stopThinkingMusic();
      }
    } catch {}
    return this.isMuted;
  }

  setVolume(val = 1.0) {
    this.volume = Math.max(0, Math.min(1.0, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  playTone(freq, type = 'triangle', duration = 0.16, gainVal = 0.8) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      // Quick smooth attack to prevent click, full sustain, and smooth decay
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  // Play layered dual-harmonic tone for extra punchy acoustic loudness
  playRichTone(freq, type1 = 'triangle', type2 = 'sine', duration = 0.2, gainVal = 0.85) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = type1;
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = type2;
      osc2.frequency.setValueAtTime(freq * 1.002, now); // subtle chorus detune for thickness

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  playClick() {
    this.playTone(880, 'triangle', 0.06, 0.65);
  }

  playAnswerLockIn() {
    if (this.isMuted) return;
    this.init();
    // Loud, crisp 2-tone futuristic lock-in chime: 650Hz -> 1300Hz
    this.playRichTone(650, 'triangle', 'sine', 0.1, 0.8);
    setTimeout(() => {
      this.playRichTone(1300, 'sine', 'triangle', 0.2, 0.9);
    }, 70);
  }

  playCountdownTick() {
    this.playRichTone(580, 'triangle', 'sine', 0.1, 0.75);
  }

  playTickTock(isFast = false) {
    this.playRichTone(isFast ? 960 : 720, 'triangle', 'sine', 0.07, isFast ? 0.85 : 0.75);
  }

  playHeartbeat() {
    if (this.isMuted) return;
    this.init();
    // Deep, punchy sub-bass pulse (80Hz -> 65Hz)
    this.playTone(95, 'triangle', 0.14, 0.85);
    setTimeout(() => {
      this.playTone(75, 'sine', 0.18, 0.8);
    }, 110);
  }

  playCountdownFinal() {
    this.playRichTone(1100, 'triangle', 'square', 0.45, 0.95);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.init();
    // Grand triumphant major arpeggio: C5 -> E5 -> G5 -> C6 (High Volume)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playRichTone(freq, 'triangle', 'sine', 0.28, 0.85);
      }, i * 65);
    });
  }

  playIncorrect() {
    if (this.isMuted) return;
    this.init();
    // Punchy, low dual-saw buzzer (200Hz & 150Hz)
    this.playTone(200, 'sawtooth', 0.28, 0.75);
    setTimeout(() => {
      this.playTone(150, 'sawtooth', 0.38, 0.75);
    }, 110);
  }

  playFanfare() {
    if (this.isMuted) return;
    this.init();
    // Epic victory fanfare chords
    const fanfare = [
      { f: 523.25, d: 130 }, // C5
      { f: 659.25, d: 130 }, // E5
      { f: 783.99, d: 130 }, // G5
      { f: 1046.50, d: 380 }, // C6
      { f: 880.00, d: 130 },  // A5
      { f: 1046.50, d: 130 }, // C6
      { f: 1174.66, d: 550 }  // D6
    ];
    let time = 0;
    fanfare.forEach((n) => {
      setTimeout(() => {
        this.playRichTone(n.f, 'triangle', 'sawtooth', n.d / 1000, 0.95);
      }, time);
      time += n.d + 30;
    });
  }

  win() {
    this.playFanfare();
  }

  error() {
    this.playIncorrect();
  }

  startLobbyMusic() {
    if (this.isMuted || this.bgInterval) return;
    this.init();
    
    // Upbeat, rich Kahoot-style lobby groove
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
      
      // Main melody note (Loud & Punchy)
      this.playRichTone(note, 'triangle', 'sine', 0.22, 0.55);
      
      // Add bass note on downbeat
      if (step % 4 === 0) {
        this.playTone(note / 2, 'sine', 0.26, 0.6);
      }
      step++;
    }, 260);
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
    
    // High-energy in-game question rhythm: Driving bass + upbeat synth pulses
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
      
      // Crisp rhythmic synth
      this.playRichTone(note, 'triangle', 'sawtooth', 0.17, 0.65);
      
      // Driving punchy bass kick every 2 beats
      if (step % 2 === 0) {
        this.playTone(note / 2, 'sine', 0.16, 0.7);
      }
      step++;
    }, 210);
  }

  stopThinkingMusic() {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }
}

export const sound = new AudioEngine();

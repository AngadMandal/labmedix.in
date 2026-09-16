/**
 * Synthetic Hospital Announcement Chime & Text-to-Speech Token Announcer
 * Powered purely by Web Audio API & SpeechSynthesis (zero external mp3 assets needed)
 */

export const playHospitalChime = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime + 0.05;

    // Tone 1: 523.25 Hz (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, startTime);
    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.linearRampToValueAtTime(0.28, startTime + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.55);

    // Tone 2: 659.25 Hz (E5) after 0.22s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, startTime + 0.22);
    gain2.gain.setValueAtTime(0.001, startTime + 0.22);
    gain2.gain.linearRampToValueAtTime(0.32, startTime + 0.26);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.22);
    osc2.stop(startTime + 0.85);

    // Tone 3: 783.99 Hz (G5) after 0.46s (resonant hospital resolution)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, startTime + 0.46);
    gain3.gain.setValueAtTime(0.001, startTime + 0.46);
    gain3.gain.linearRampToValueAtTime(0.36, startTime + 0.5);
    gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.4);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(startTime + 0.46);
    osc3.stop(startTime + 1.4);
  } catch (err) {
    console.warn('[AudioChime] Web Audio chime could not be initialized:', err);
  }
};

/**
 * Optional automated text-to-speech announcement for hospital waiting rooms
 */
export const announceTokenSpeech = (
  tokenNo: string,
  doctorName?: string,
  roomNo?: string
): void => {
  try {
    playHospitalChime();

    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const text = `Token number ${tokenNo.replace(/[^a-zA-Z0-9]/g, ' ')}. ${
          doctorName ? `Please proceed to ${doctorName}` : ''
        }. ${roomNo ? `in ${roomNo}` : ''}.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      }, 700);
    }
  } catch (err) {
    console.warn('[AudioChime] Speech announcement failed:', err);
  }
};

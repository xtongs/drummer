/**
 * 音频引擎 - 使用 Web Audio API 生成节拍声音
 */

let audioContext: AudioContext | null = null;

/**
 * 获取或创建 AudioContext
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // 如果上下文被暂停，恢复它
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * 生成节拍器 click 声音
 */
export function playClick(
  time: number,
  frequency: number = 800,
  duration: number = 0.01
): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.3, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

  oscillator.start(time);
  oscillator.stop(time + duration);
}

/**
 * 生成重拍声音（第一拍）
 */
export function playAccent(time: number): void {
  playClick(time, 1000, 0.02);
}

/**
 * 生成轻拍声音（其他拍）
 */
export function playBeat(time: number): void {
  playClick(time, 600, 0.01);
}

/**
 * 生成底鼓声音
 */
export function playKick(time: number): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(60, time);
  oscillator.frequency.exponentialRampToValueAtTime(30, time + 0.1);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.5, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

  oscillator.start(time);
  oscillator.stop(time + 0.1);
}

/**
 * 生成军鼓声音
 */
export function playSnare(time: number): void {
  const ctx = getAudioContext();
  const gainNode = ctx.createGain();
  const noise = ctx.createBufferSource();
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);

  // 生成白噪声
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  noise.buffer = noiseBuffer;
  noise.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

  noise.start(time);
  noise.stop(time + 0.1);
}

/**
 * 生成踩镲声音
 */
export function playHiHat(time: number): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = 8000;
  oscillator.type = "square";

  gainNode.gain.setValueAtTime(0.2, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

  oscillator.start(time);
  oscillator.stop(time + 0.05);
}

/**
 * 生成镲片声音
 */
export function playCymbal(time: number, frequency: number = 1000): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = "sawtooth";

  gainNode.gain.setValueAtTime(0.3, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

  oscillator.start(time);
  oscillator.stop(time + 0.2);
}

/**
 * 生成嗵鼓声音
 */
export function playTom(time: number, frequency: number = 200): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, time + 0.1);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.4, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

  oscillator.start(time);
  oscillator.stop(time + 0.1);
}


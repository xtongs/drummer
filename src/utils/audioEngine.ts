/**
 * 音频引擎 - 使用 Web Audio API 生成鼓组声音
 * 模拟库乐队"南加风情"(SoCal) 鼓组音色
 */

import type { DrumType } from "../types";

let audioContext: AudioContext | null = null;
let isResuming = false;

/**
 * 获取或创建 AudioContext（共享实例）
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * 确保 AudioContext 已恢复（异步）
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended" && !isResuming) {
    isResuming = true;
    try {
      await ctx.resume();
    } finally {
      isResuming = false;
    }
  }
}

/**
 * 预先初始化 AudioContext（在用户首次交互时调用）
 */
export function preInitAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/**
 * 创建噪声缓冲区
 */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * 生成节拍器 click 声音
 */
function playClick(
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
 * SoCal 风格底鼓 - 深沉有力，有 punch 感
 */
export function playKick(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.85;

  // 主音调 - 低频正弦波带频率滑动
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
  osc.type = "sine";

  oscGain.gain.setValueAtTime(1, time);
  oscGain.gain.setValueAtTime(0.8, time + 0.01);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

  // Click/Attack - 给底鼓增加冲击感
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.connect(clickGain);
  clickGain.connect(masterGain);

  clickOsc.frequency.setValueAtTime(400, time);
  clickOsc.frequency.exponentialRampToValueAtTime(80, time + 0.02);
  clickOsc.type = "triangle";

  clickGain.gain.setValueAtTime(0.6, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

  // 次低频增强
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.connect(subGain);
  subGain.connect(masterGain);

  subOsc.frequency.setValueAtTime(60, time);
  subOsc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
  subOsc.type = "sine";

  subGain.gain.setValueAtTime(0.5, time);
  subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

  osc.start(time);
  osc.stop(time + 0.25);
  clickOsc.start(time);
  clickOsc.stop(time + 0.03);
  subOsc.start(time);
  subOsc.stop(time + 0.2);
}

/**
 * SoCal 风格军鼓 - 明亮，有弹簧沙沙声
 */
export function playSnare(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.7;

  // 主音调 - 鼓体共振
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.05);
  osc.type = "triangle";

  oscGain.gain.setValueAtTime(0.7, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

  // 谐波 - 增加明亮感
  const osc2 = ctx.createOscillator();
  const osc2Gain = ctx.createGain();
  osc2.connect(osc2Gain);
  osc2Gain.connect(masterGain);

  osc2.frequency.setValueAtTime(400, time);
  osc2.frequency.exponentialRampToValueAtTime(200, time + 0.03);
  osc2.type = "sine";

  osc2Gain.gain.setValueAtTime(0.3, time);
  osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

  // 噪声 - 弹簧沙沙声
  const noiseBuffer = createNoiseBuffer(ctx, 0.2);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // 带通滤波器 - 让噪声更像弹簧
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 5000;
  filter.Q.value = 1;

  const noiseGain = ctx.createGain();
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(0.5, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

  osc.start(time);
  osc.stop(time + 0.12);
  osc2.start(time);
  osc2.stop(time + 0.08);
  noise.start(time);
  noise.stop(time + 0.18);
}

/**
 * SoCal 风格闭合踩镲 - 清脆短促
 */
export function playHiHatClosed(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.45;

  // 高频噪声
  const noiseBuffer = createNoiseBuffer(ctx, 0.1);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // 高通滤波器
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 7000;

  // 带通滤波器 - 金属质感
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 10000;
  bandpass.Q.value = 1;

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  // 高频振荡器 - 金属泛音
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.value = 8500;
  osc.type = "square";

  oscGain.gain.setValueAtTime(0.15, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

  noise.start(time);
  noise.stop(time + 0.05);
  osc.start(time);
  osc.stop(time + 0.03);
}

/**
 * SoCal 风格开放踩镲 - 清脆有延音
 */
export function playHiHatOpen(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.4;

  // 高频噪声
  const noiseBuffer = createNoiseBuffer(ctx, 0.4);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // 高通滤波器
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 6000;

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.3, time + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

  // 多个金属泛音
  const frequencies = [8000, 9500, 11000];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(masterGain);

    osc.frequency.value = freq;
    osc.type = "square";

    oscGain.gain.setValueAtTime(0.08, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15 + i * 0.05);

    osc.start(time);
    osc.stop(time + 0.2 + i * 0.05);
  });

  noise.start(time);
  noise.stop(time + 0.35);
}

/**
 * 踩镲通用接口（默认闭合）
 */
export function playHiHat(time: number): void {
  playHiHatClosed(time);
}

/**
 * SoCal 风格 Crash 镲 - 明亮，延音长
 */
export function playCrash(time: number, brightness: number = 1): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.5;

  // 噪声基础
  const noiseBuffer = createNoiseBuffer(ctx, 1.5);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // 高通滤波器
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 3000 * brightness;

  // 低通滤波器 - 控制亮度
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(12000 * brightness, time);
  lowpass.frequency.exponentialRampToValueAtTime(4000, time + 1.2);

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.5, time + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

  // 金属泛音
  const frequencies = [5000, 6500, 8000, 10000];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(masterGain);

    osc.frequency.value = freq * brightness;
    osc.type = "sine";

    oscGain.gain.setValueAtTime(0.1, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8 - i * 0.1);

    osc.start(time);
    osc.stop(time + 0.8);
  });

  noise.start(time);
  noise.stop(time + 1.2);
}

/**
 * SoCal 风格 Ride 镲 - 明亮清脆，有钟声感
 */
export function playRide(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.4;

  // 钟声感 - 主音调
  const bell = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bell.connect(bellGain);
  bellGain.connect(masterGain);

  bell.frequency.value = 3000;
  bell.type = "sine";

  bellGain.gain.setValueAtTime(0.4, time);
  bellGain.gain.exponentialRampToValueAtTime(0.1, time + 0.1);
  bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

  // 谐波
  const harm = ctx.createOscillator();
  const harmGain = ctx.createGain();
  harm.connect(harmGain);
  harmGain.connect(masterGain);

  harm.frequency.value = 5500;
  harm.type = "sine";

  harmGain.gain.setValueAtTime(0.2, time);
  harmGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  // 噪声成分
  const noiseBuffer = createNoiseBuffer(ctx, 0.6);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 8000;

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(0.3, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

  bell.start(time);
  bell.stop(time + 0.5);
  harm.start(time);
  harm.stop(time + 0.3);
  noise.start(time);
  noise.stop(time + 0.5);
}

/**
 * 兼容旧接口
 */
export function playCymbal(time: number, frequency: number = 1000): void {
  if (frequency >= 1000) {
    playCrash(time, frequency / 1000);
  } else {
    playRide(time);
  }
}

/**
 * SoCal 风格嗵鼓 - 有厚度，音高明显
 */
export function playTom(time: number, frequency: number = 200): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.65;

  // 主音调
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(frequency * 1.5, time);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.8, time + 0.05);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, time + 0.2);
  osc.type = "sine";

  oscGain.gain.setValueAtTime(1, time);
  oscGain.gain.exponentialRampToValueAtTime(0.4, time + 0.05);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  // 谐波 - 增加厚度
  const harm = ctx.createOscillator();
  const harmGain = ctx.createGain();
  harm.connect(harmGain);
  harmGain.connect(masterGain);

  harm.frequency.setValueAtTime(frequency * 2, time);
  harm.frequency.exponentialRampToValueAtTime(frequency, time + 0.08);
  harm.type = "triangle";

  harmGain.gain.setValueAtTime(0.3, time);
  harmGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  // Attack click
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.connect(clickGain);
  clickGain.connect(masterGain);

  click.frequency.setValueAtTime(frequency * 4, time);
  click.frequency.exponentialRampToValueAtTime(frequency * 2, time + 0.01);
  click.type = "triangle";

  clickGain.gain.setValueAtTime(0.4, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

  osc.start(time);
  osc.stop(time + 0.3);
  harm.start(time);
  harm.stop(time + 0.15);
  click.start(time);
  click.stop(time + 0.02);
}

/**
 * 根据鼓件类型播放对应的声音
 */
export async function playDrumSound(drumType: DrumType): Promise<void> {
  await resumeAudioContext();
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  switch (drumType) {
    case "Kick":
      playKick(time);
      break;
    case "Snare":
      playSnare(time);
      break;
    case "Hi-Hat Closed":
      playHiHatClosed(time);
      break;
    case "Hi-Hat Open":
      playHiHatOpen(time);
      break;
    case "Crash 1":
      playCrash(time, 1.2);
      break;
    case "Crash 2":
      playCrash(time, 1.0);
      break;
    case "Ride":
      playRide(time);
      break;
    case "Tom 1":
      playTom(time, 280);
      break;
    case "Tom 2":
      playTom(time, 220);
      break;
    case "Tom 3":
      playTom(time, 160);
      break;
    default:
      playSnare(time);
  }
}

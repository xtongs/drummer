/**
 * 音频引擎 - 使用 Web Audio API 生成鼓组声音
 * 支持真实采样和合成音色混合
 */

import type { DrumType } from "../types";

// 导入采样文件
import kickUrl from "../sounds/kick.mp3";
import snareUrl from "../sounds/snare.mp3";
import hiHatClosedUrl from "../sounds/hi-hat-closed.mp3";
import hiHatOpenUrl from "../sounds/hi-hat-open.mp3";
import crash1Url from "../sounds/crash.mp3";
import crash2Url from "../sounds/crash2.mp3";
import rideUrl from "../sounds/ride.mp3";
import tom1Url from "../sounds/tom1.mp3";
import tom2Url from "../sounds/tom2.mp3";
import tom3Url from "../sounds/tom3.mp3";
import metronomeUrl from "../sounds/metronome.mp3";

let audioContext: AudioContext | null = null;
let isResuming = false;

// 采样缓存（Web Audio API 用于合成音色）
const sampleBuffers: Map<string, AudioBuffer> = new Map();
// HTML5 Audio 元素缓存（用于采样播放，不受静音开关影响）
const audioElements: Map<string, HTMLAudioElement> = new Map();
let samplesLoaded = false;
let samplesLoadPromise: Promise<void> | null = null;

// 当前音量乘数（用于鬼音等）
let currentVolumeMultiplier = 1;

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
 * 加载采样文件（加载为 AudioBuffer 用于精确时序调度，iOS 兼容）
 */
async function loadSample(url: string, name: string): Promise<void> {
  const ctx = getAudioContext();
  try {
    // 加载为 AudioBuffer（用于 Web Audio API 精确调度）
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    sampleBuffers.set(name, audioBuffer);

    // 保留 HTML5 Audio 元素作为后备（虽然现在主要使用 AudioBuffer）
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.volume = 1;
    audioElements.set(name, audio);
  } catch {
    // Failed to load sample - 继续使用合成音色作为后备
  }
}

/**
 * 加载所有采样
 */
function loadAllSamples(): Promise<void> {
  if (samplesLoaded) return Promise.resolve();
  if (samplesLoadPromise) return samplesLoadPromise;

  samplesLoadPromise = Promise.all([
    loadSample(kickUrl, "kick"),
    loadSample(snareUrl, "snare"),
    loadSample(hiHatClosedUrl, "hiHatClosed"),
    loadSample(hiHatOpenUrl, "hiHatOpen"),
    loadSample(crash1Url, "crash1"),
    loadSample(crash2Url, "crash2"),
    loadSample(rideUrl, "ride"),
    loadSample(tom1Url, "tom1"),
    loadSample(tom2Url, "tom2"),
    loadSample(tom3Url, "tom3"),
    loadSample(metronomeUrl, "metronome"),
  ]).then(() => {
    samplesLoaded = true;
  });

  return samplesLoadPromise;
}

/**
 * 预先初始化 AudioContext 和加载采样（在用户首次交互时调用）
 */
export function preInitAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  // 开始加载采样
  loadAllSamples();
}

/**
 * 等待采样加载完成
 */
export async function ensureSamplesLoaded(): Promise<void> {
  await loadAllSamples();
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
 * 播放节拍器采样（使用 Web Audio API 精确调度，iOS 兼容）
 */
function playMetronomeSample(
  time: number,
  volume: number = 1,
  playbackRate: number = 1
): boolean {
  const buffer = sampleBuffers.get("metronome");
  if (!buffer) return false;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  // 设置音量
  gainNode.gain.value = Math.max(0, Math.min(1, volume));

  // 使用精确的调度时间（确保不早于当前时间）
  const playTime = Math.max(time, ctx.currentTime);
  source.start(playTime);

  return true;
}

/**
 * 合成节拍器 click 声音（后备）
 */
function playClickSynth(
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
 * 生成重拍声音（第一拍）- 音高较高
 */
export function playAccent(time: number): void {
  // playbackRate > 1 音高更高
  if (playMetronomeSample(time, 0.8, 1.2)) {
    return;
  }
  playClickSynth(time, 1000, 0.02);
}

/**
 * 生成轻拍声音（其他拍）- 音高较低
 */
export function playBeat(time: number): void {
  if (playMetronomeSample(time, 0.6, 1.0)) {
    return;
  }
  playClickSynth(time, 600, 0.01);
}

/**
 * 底鼓 - 优先使用真实采样
 */
export function playKick(time: number): void {
  if (playSample("kick", time, 0.9)) {
    return;
  }
  // 后备：合成音色
  playKickSynth(time);
}

/**
 * 合成底鼓（后备）
 */
function playKickSynth(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.85;

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

  osc.start(time);
  osc.stop(time + 0.25);
}

/**
 * 播放采样（使用 Web Audio API 精确调度，iOS 兼容）
 * @param applyVolumeMultiplier 是否应用全局音量乘数（用于鬼音等）
 */
function playSample(
  name: string,
  time: number,
  volume: number = 1,
  applyVolumeMultiplier: boolean = true
): boolean {
  const buffer = sampleBuffers.get(name);
  if (!buffer) return false;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  // 应用音量乘数
  const finalVolume = applyVolumeMultiplier
    ? Math.max(0, Math.min(1, volume * currentVolumeMultiplier))
    : Math.max(0, Math.min(1, volume));
  gainNode.gain.value = finalVolume;

  // 使用精确的调度时间（确保不早于当前时间）
  const playTime = Math.max(time, ctx.currentTime);
  source.start(playTime);

  return true;
}

/**
 * 军鼓 - 优先使用真实采样，如果未加载则使用合成音色
 */
export function playSnare(time: number): void {
  // 尝试使用采样
  if (playSample("snare", time, 0.8)) {
    return;
  }

  // 后备：合成音色
  playSnareSynth(time);
}

/**
 * 合成军鼓音色（后备）
 */
function playSnareSynth(time: number): void {
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
 * 闭合踩镲 - 优先使用真实采样
 */
export function playHiHatClosed(time: number): void {
  if (playSample("hiHatClosed", time, 0.5)) {
    return;
  }
  // 后备：合成音色
  playHiHatClosedSynth(time);
}

/**
 * 合成闭合踩镲（后备）
 */
function playHiHatClosedSynth(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.45;

  const noiseBuffer = createNoiseBuffer(ctx, 0.1);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 7000;

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  noise.start(time);
  noise.stop(time + 0.05);
}

/**
 * 开放踩镲 - 优先使用真实采样
 */
export function playHiHatOpen(time: number): void {
  if (playSample("hiHatOpen", time, 0.6)) {
    return;
  }
  // 后备：合成音色
  playHiHatOpenSynth(time);
}

/**
 * 合成开放踩镲（后备）
 */
function playHiHatOpenSynth(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.4;

  const noiseBuffer = createNoiseBuffer(ctx, 0.4);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 6000;

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

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
 * Crash 镲 - 优先使用真实采样
 */
export function playCrash(time: number, brightness: number = 1): void {
  // brightness > 1 使用 crash1，否则使用 crash2
  const sampleName = brightness > 1 ? "crash1" : "crash2";
  if (playSample(sampleName, time, 0.6)) {
    return;
  }
  // 后备：合成音色
  playCrashSynth(time, brightness);
}

/**
 * 合成 Crash 镲（后备）
 */
function playCrashSynth(time: number, brightness: number = 1): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.5;

  const noiseBuffer = createNoiseBuffer(ctx, 1.5);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 3000 * brightness;

  const noiseGain = ctx.createGain();
  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

  noise.start(time);
  noise.stop(time + 1.2);
}

/**
 * Ride 镲 - 优先使用真实采样
 */
export function playRide(time: number): void {
  if (playSample("ride", time, 0.7)) {
    return;
  }
  // 后备：合成音色
  playRideSynth(time);
}

/**
 * 合成 Ride 镲（后备）
 */
function playRideSynth(time: number): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.4;

  const bell = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bell.connect(bellGain);
  bellGain.connect(masterGain);

  bell.frequency.value = 3000;
  bell.type = "sine";

  bellGain.gain.setValueAtTime(0.4, time);
  bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

  bell.start(time);
  bell.stop(time + 0.5);
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
 * 嗵鼓 - 优先使用真实采样
 * frequency: 250=tom1(高), 200=tom2(中), 150=tom3(低)
 */
export function playTom(time: number, frequency: number = 200): void {
  // 根据频率选择采样
  let sampleName: string;
  if (frequency >= 230) {
    sampleName = "tom1";
  } else if (frequency >= 180) {
    sampleName = "tom2";
  } else {
    sampleName = "tom3";
  }

  if (playSample(sampleName, time, 0.8)) {
    return;
  }
  // 后备：合成音色
  playTomSynth(time, frequency);
}

/**
 * 合成嗵鼓（后备）
 */
function playTomSynth(time: number, frequency: number = 200): void {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.65;

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(frequency * 1.5, time);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, time + 0.2);
  osc.type = "sine";

  oscGain.gain.setValueAtTime(1, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.start(time);
  osc.stop(time + 0.3);
}
/**
 * 根据鼓件类型播放对应的声音
 * @param volume 音量乘数，默认为 1（正常），鬼音使用 0.5
 */
export async function playDrumSound(
  drumType: DrumType,
  volume: number = 1
): Promise<void> {
  await resumeAudioContext();
  // 确保采样已加载
  await ensureSamplesLoaded();

  // 设置音量乘数
  currentVolumeMultiplier = volume;

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

  // 重置音量乘数
  currentVolumeMultiplier = 1;
}

/**
 * 获取当前音量乘数
 */
export function getVolumeMultiplier(): number {
  return currentVolumeMultiplier;
}

/**
 * 设置当前音量乘数（用于鬼音等）
 */
export function setVolumeMultiplier(multiplier: number): void {
  currentVolumeMultiplier = multiplier;
}

/**
 * 重置音量乘数为默认值
 */
export function resetVolumeMultiplier(): void {
  currentVolumeMultiplier = 1;
}

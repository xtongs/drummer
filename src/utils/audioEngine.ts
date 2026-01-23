/**
 * 音频引擎 - 使用 Tone.js 生成鼓组声音
 * 支持真实采样和合成音色混合
 */

import * as Tone from "tone";
import type { DrumType } from "../types";
import {
  getCachedAudioBuffer,
  cacheAudioBuffer,
  checkAndUpdateCacheVersion,
} from "./audioCache";

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

let toneContext: Tone.BaseContext | null = null;
let isResuming = false;

// 采样缓存（用于 Tone.js 播放）
const sampleBuffers: Map<string, AudioBuffer> = new Map();
let samplesLoaded = false;
let samplesLoadPromise: Promise<void> | null = null;

// 当前音量乘数（用于鬼音等）
let currentVolumeMultiplier = 1;

// 主音量乘数（用于控制节奏型整体音量，0-100）
let masterVolumeMultiplier = 100;

// 采样加载进度回调
export type SampleLoadProgressCallback = (
  loaded: number,
  total: number,
  currentName: string
) => void;
let progressCallback: SampleLoadProgressCallback | null = null;

function getToneContext(): Tone.BaseContext {
  if (!toneContext) {
    toneContext = Tone.getContext();
  }
  return toneContext;
}

function getRawContext(): AudioContext {
  const context = getToneContext() as Tone.BaseContext & {
    rawContext?: AudioContext;
    context?: AudioContext;
  };

  return (
    context.rawContext ??
    context.context ??
    (context as unknown as AudioContext)
  );
}

function scheduleDispose(nodes: Array<{ dispose: () => void }>, disposeAtTime: number): void {
  const delaySeconds = Math.max(0, disposeAtTime - getAudioContext().currentTime);
  const delayMs = delaySeconds * 1000;
  setTimeout(() => {
    nodes.forEach((node) => node.dispose());
  }, delayMs);
}

/**
 * 获取或创建 AudioContext（共享实例）
 */
export function getAudioContext(): AudioContext {
  return getRawContext();
}

/**
 * 确保 AudioContext 已恢复（异步）
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended" && !isResuming) {
    isResuming = true;
    try {
      await Tone.start();
    } finally {
      isResuming = false;
    }
  }
}

/**
 * 加载采样文件（加载为 AudioBuffer 用于精确时序调度，iOS 兼容）
 * 优先从 IndexedDB 缓存读取，避免重复解码
 * 每次启动时静默更新缓存以确保最新
 */
async function loadSample(url: string, name: string, forceUpdate = false): Promise<void> {
  const ctx = getAudioContext();
  try {
    let audioBuffer: AudioBuffer;

    // 尝试从 IndexedDB 缓存读取
    const cachedBuffer = await getCachedAudioBuffer(ctx, name);
    if (cachedBuffer && !forceUpdate) {
      audioBuffer = cachedBuffer;
    } else {
      // 缓存不存在或需要强制更新，从网络加载并解码
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // 缓存解码后的 AudioBuffer 到 IndexedDB
      await cacheAudioBuffer(name, audioBuffer);
    }

    sampleBuffers.set(name, audioBuffer);
  } catch {
    // Failed to load sample - 继续使用合成音色作为后备
  }
}

/**
 * 加载所有采样
 * @param forceUpdate 是否强制更新缓存（即使缓存存在也重新加载）
 */
function loadAllSamples(forceUpdate = false): Promise<void> {
  if (samplesLoaded && !forceUpdate) return Promise.resolve();
  if (samplesLoadPromise) return samplesLoadPromise;

  const samples = [
    { url: kickUrl, name: "kick" },
    { url: snareUrl, name: "snare" },
    { url: hiHatClosedUrl, name: "hiHatClosed" },
    { url: hiHatOpenUrl, name: "hiHatOpen" },
    { url: crash1Url, name: "crash1" },
    { url: crash2Url, name: "crash2" },
    { url: rideUrl, name: "ride" },
    { url: tom1Url, name: "tom1" },
    { url: tom2Url, name: "tom2" },
    { url: tom3Url, name: "tom3" },
    { url: metronomeUrl, name: "metronome" },
  ];

  let loadedCount = 0;

  samplesLoadPromise = (async () => {
    for (const sample of samples) {
      await loadSample(sample.url, sample.name, forceUpdate);
      loadedCount++;
      if (progressCallback) {
        progressCallback(loadedCount, samples.length, sample.name);
      }
    }
    samplesLoaded = true;
  })();

  return samplesLoadPromise;
}

/**
 * 预先初始化 AudioContext 和加载采样（在用户首次交互时调用）
 */
export function preInitAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    Tone.start().catch(() => { });
  }
  // 开始加载采样
  loadAllSamples();
}

/**
 * 等待采样加载完成
 */
export async function ensureSamplesLoaded(): Promise<void> {
  // 检查并更新缓存版本
  await checkAndUpdateCacheVersion();
  await loadAllSamples();
}

/**
 * 静默更新采样缓存（后台执行，不阻塞界面）
 * 即使缓存存在也会重新加载和更新
 */
export async function updateSampleCache(): Promise<void> {
  try {
    // 强制重新加载所有采样并更新缓存
    samplesLoaded = false;
    samplesLoadPromise = null;
    await loadAllSamples(true);
  } catch (error) {
    // 静默处理错误，不影响用户体验
    console.warn("Failed to update sample cache:", error);
  }
}

/**
 * 设置采样加载进度回调
 */
export function setSampleLoadProgressCallback(
  callback: SampleLoadProgressCallback | null
): void {
  progressCallback = callback;
}

/**
 * 播放节拍器采样（使用 Tone.js 精确调度，iOS 兼容）
 */
function playMetronomeSample(
  time: number,
  volume: number = 1,
  playbackRate: number = 1
): boolean {
  return playSample("metronome", time, volume, false, playbackRate);
}

/**
 * 合成节拍器 click 声音（后备）
 */
function playClickSynth(
  time: number,
  frequency: number = 800,
  duration: number = 0.01
): void {
  const gain = new Tone.Gain(0.3).toDestination();
  const osc = new Tone.Oscillator({ frequency, type: "sine" });

  osc.connect(gain);
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

  osc.start(time);
  osc.stop(time + duration);

  scheduleDispose([osc, gain], time + duration + 0.1);
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
  const masterGain = new Tone.Gain(0.85).toDestination();
  const oscGain = new Tone.Gain();
  const osc = new Tone.Oscillator({ type: "sine" });

  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

  oscGain.gain.setValueAtTime(1, time);
  oscGain.gain.setValueAtTime(0.8, time + 0.01);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

  osc.start(time);
  osc.stop(time + 0.25);

  scheduleDispose([osc, oscGain, masterGain], time + 0.35);
}

/**
 * 播放采样（使用 Tone.js 精确调度，iOS 兼容）
 * @param applyVolumeMultiplier 是否应用全局音量乘数（用于鬼音等）
 */
function playSample(
  name: string,
  time: number,
  volume: number = 1,
  applyVolumeMultiplier: boolean = true,
  playbackRate: number = 1
): boolean {
  const buffer = sampleBuffers.get(name);
  if (!buffer) return false;

  const masterVolume = masterVolumeMultiplier / 100;
  const finalVolume = applyVolumeMultiplier
    ? Math.max(0, Math.min(1, volume * currentVolumeMultiplier * masterVolume))
    : Math.max(0, Math.min(1, volume * masterVolume));

  const gainNode = new Tone.Gain(finalVolume).toDestination();
  const player = new Tone.Player(buffer);
  player.connect(gainNode);
  player.playbackRate = playbackRate;

  const playTime = Math.max(time, getAudioContext().currentTime);
  player.start(playTime);

  const safeRate = Math.max(0.01, playbackRate);
  const duration = buffer.duration / safeRate;
  scheduleDispose([player, gainNode], playTime + duration + 0.1);

  return true;
}

/**
 * 军鼓 - 优先使用真实采样，如果未加载则使用合成音色
 */
export function playSnare(time: number): void {
  // 尝试使用采样
  if (playSample("snare", time, 0.5)) {
    return;
  }

  // 后备：合成音色
  playSnareSynth(time);
}

/**
 * 合成军鼓音色（后备）
 */
function playSnareSynth(time: number): void {
  const masterGain = new Tone.Gain(0.5).toDestination();

  const osc = new Tone.Oscillator({ type: "triangle" });
  const oscGain = new Tone.Gain();
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.05);

  oscGain.gain.setValueAtTime(0.7, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

  const osc2 = new Tone.Oscillator({ type: "sine" });
  const osc2Gain = new Tone.Gain();
  osc2.connect(osc2Gain);
  osc2Gain.connect(masterGain);

  osc2.frequency.setValueAtTime(400, time);
  osc2.frequency.exponentialRampToValueAtTime(200, time + 0.03);

  osc2Gain.gain.setValueAtTime(0.3, time);
  osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

  const noise = new Tone.Noise("white");
  const filter = new Tone.Filter({ type: "bandpass", frequency: 5000, Q: 1 });
  const noiseGain = new Tone.Gain();
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

  scheduleDispose(
    [osc, oscGain, osc2, osc2Gain, noise, filter, noiseGain, masterGain],
    time + 0.28
  );
}

/**
 * 闭合踩镲 - 优先使用真实采样
 */
export function playHiHatClosed(time: number): void {
  if (playSample("hiHatClosed", time, 0.3)) {
    return;
  }
  // 后备：合成音色
  playHiHatClosedSynth(time);
}

/**
 * 合成闭合踩镲（后备）
 */
function playHiHatClosedSynth(time: number): void {
  const masterGain = new Tone.Gain(0.25).toDestination();

  const noise = new Tone.Noise("white");
  const highpass = new Tone.Filter({ type: "highpass", frequency: 7000 });
  const noiseGain = new Tone.Gain();

  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  noise.start(time);
  noise.stop(time + 0.05);

  scheduleDispose([noise, highpass, noiseGain, masterGain], time + 0.15);
}

/**
 * 开放踩镲 - 优先使用真实采样
 */
export function playHiHatOpen(time: number): void {
  if (playSample("hiHatOpen", time, 0.3)) {
    return;
  }
  // 后备：合成音色
  playHiHatOpenSynth(time);
}

/**
 * 合成开放踩镲（后备）
 */
function playHiHatOpenSynth(time: number): void {
  const masterGain = new Tone.Gain(0.4).toDestination();

  const noise = new Tone.Noise("white");
  const highpass = new Tone.Filter({ type: "highpass", frequency: 6000 });
  const noiseGain = new Tone.Gain();

  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

  noise.start(time);
  noise.stop(time + 0.35);

  scheduleDispose([noise, highpass, noiseGain, masterGain], time + 0.45);
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
  const masterGain = new Tone.Gain(0.5).toDestination();

  const noise = new Tone.Noise("white");
  const highpass = new Tone.Filter({ type: "highpass", frequency: 3000 * brightness });
  const noiseGain = new Tone.Gain();

  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

  noise.start(time);
  noise.stop(time + 1.2);

  scheduleDispose([noise, highpass, noiseGain, masterGain], time + 1.3);
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
  const masterGain = new Tone.Gain(0.4).toDestination();

  const bellGain = new Tone.Gain();
  const bell = new Tone.Oscillator({ type: "sine", frequency: 3000 });
  bell.connect(bellGain);
  bellGain.connect(masterGain);

  bellGain.gain.setValueAtTime(0.4, time);
  bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

  bell.start(time);
  bell.stop(time + 0.5);

  scheduleDispose([bell, bellGain, masterGain], time + 0.6);
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

  if (playSample(sampleName, time, 1)) {
    return;
  }
  // 后备：合成音色
  playTomSynth(time, frequency);
}

/**
 * 合成嗵鼓（后备）
 */
function playTomSynth(time: number, frequency: number = 200): void {
  const masterGain = new Tone.Gain(0.65).toDestination();

  const oscGain = new Tone.Gain();
  const osc = new Tone.Oscillator({ type: "sine" });
  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.frequency.setValueAtTime(frequency * 1.5, time);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, time + 0.2);

  oscGain.gain.setValueAtTime(1, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.start(time);
  osc.stop(time + 0.3);

  scheduleDispose([osc, oscGain, masterGain], time + 0.4);
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

/**
 * 设置主音量乘数（用于控制节奏型整体音量）
 */
export function setMasterVolumeMultiplier(volumePct: number): void {
  masterVolumeMultiplier = Math.max(0, Math.min(100, volumePct));
}

/**
 * 获取主音量乘数
 */
export function getMasterVolumeMultiplier(): number {
  return masterVolumeMultiplier;
}

/**
 * useSound - 音效系统 Hook
 * 使用 Web Audio API 程序化生成音效（不依赖音频文件）
 */

import { useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** 放置珠子：短促高音 beep */
function playPlaceSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

/** 删除珠子：短促低音 */
function playRemoveSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

/** 熨烫滋滋声：白噪声 + 滤波 */
function startIroningSound(): { stop: () => void } {
  const ctx = getAudioContext();

  // 白噪声
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // 带通滤波器模拟滋滋声
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(3000, ctx.currentTime);
  bandpass.Q.setValueAtTime(2, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);

  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  return {
    stop: () => {
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      setTimeout(() => {
        try { source.stop(); } catch { /* ignore */ }
      }, 300);
    },
  };
}

/** 成功：上行和弦 */
function playSuccessSound() {
  const ctx = getAudioContext();
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const duration = 0.15;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * duration);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * duration);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * duration + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * duration + duration + 0.2);

    osc.start(ctx.currentTime + i * duration);
    osc.stop(ctx.currentTime + i * duration + duration + 0.3);
  });
}

/** 失败：下行和弦 */
function playFailureSound() {
  const ctx = getAudioContext();
  const notes = [523.25, 493.88, 440, 349.23]; // C5, B4, A4, F4
  const duration = 0.18;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * duration);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * duration);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * duration + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * duration + duration + 0.3);

    osc.start(ctx.currentTime + i * duration);
    osc.stop(ctx.currentTime + i * duration + duration + 0.4);
  });
}

export function useSound() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const ironingSoundRef = useRef<{ stop: () => void } | null>(null);

  const place = useCallback(() => {
    if (!soundEnabled) return;
    playPlaceSound();
  }, [soundEnabled]);

  const remove = useCallback(() => {
    if (!soundEnabled) return;
    playRemoveSound();
  }, [soundEnabled]);

  const startIroning = useCallback(() => {
    if (!soundEnabled) return;
    ironingSoundRef.current = startIroningSound();
  }, [soundEnabled]);

  const stopIroning = useCallback(() => {
    ironingSoundRef.current?.stop();
    ironingSoundRef.current = null;
  }, []);

  const success = useCallback(() => {
    if (!soundEnabled) return;
    playSuccessSound();
  }, [soundEnabled]);

  const failure = useCallback(() => {
    if (!soundEnabled) return;
    playFailureSound();
  }, [soundEnabled]);

  return { place, remove, startIroning, stopIroning, success, failure };
}

# Change: Replace audio engine with Tone.js

## Why

The current audio engine relies on direct Web Audio API orchestration. Switching to Tone.js provides a more robust scheduling layer while keeping playback behavior unchanged.

## What Changes

- Replace existing audio engine implementation with Tone.js-backed playback and scheduling.
- Keep current sample loading, caching, and volume behavior consistent with existing specs.
- Update audio engine technical constraints to document the Tone.js usage.

## Impact

- 影响的规范: audio-engine
- 影响的代码: src/utils/audioEngine.ts, src/hooks/useSampleLoader.ts, src/hooks/useMetronome.ts, src/utils/audioCache.ts

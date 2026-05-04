import { describe, it, expect } from 'vitest';
import {
  WAVEFORM_THRESHOLD_DAYS,
  pickViz,
  statusToFillModifier,
  statusLabel,
  volumeToIntensityStep,
} from './dashboardViz';

describe('WAVEFORM_THRESHOLD_DAYS', () => {
  it('is 60', () => {
    expect(WAVEFORM_THRESHOLD_DAYS).toBe(60);
  });
});

describe('pickViz', () => {
  it('returns waveform for 7 days', () => {
    expect(pickViz(7)).toBe('waveform');
  });

  it('returns waveform for 30 days', () => {
    expect(pickViz(30)).toBe('waveform');
  });

  it('returns waveform for 59 days', () => {
    expect(pickViz(59)).toBe('waveform');
  });

  it('returns heatmap for exactly 60 days', () => {
    expect(pickViz(60)).toBe('heatmap');
  });

  it('returns heatmap for 90 days', () => {
    expect(pickViz(90)).toBe('heatmap');
  });

  it('returns heatmap for 365 days', () => {
    expect(pickViz(365)).toBe('heatmap');
  });

  it('returns waveform for 0 (guard)', () => {
    expect(pickViz(0)).toBe('waveform');
  });

  it('returns waveform for negative (guard)', () => {
    expect(pickViz(-1)).toBe('waveform');
  });

  it('returns waveform for NaN (guard)', () => {
    expect(pickViz(NaN)).toBe('waveform');
  });
});

describe('statusToFillModifier', () => {
  it('maps completed → success', () => {
    expect(statusToFillModifier('completed')).toBe('success');
  });

  it('maps partial → partial', () => {
    expect(statusToFillModifier('partial')).toBe('partial');
  });

  it('maps abandoned → danger', () => {
    expect(statusToFillModifier('abandoned')).toBe('danger');
  });

  it('maps empty → empty', () => {
    expect(statusToFillModifier('empty')).toBe('empty');
  });

  it('maps unknown → empty (fallback)', () => {
    expect(statusToFillModifier('unknown')).toBe('empty');
  });
});

describe('statusLabel', () => {
  it('returns Concluído for completed', () => {
    expect(statusLabel('completed')).toBe('Concluído');
  });

  it('returns Parcial for partial', () => {
    expect(statusLabel('partial')).toBe('Parcial');
  });

  it('returns Abandonado for abandoned', () => {
    expect(statusLabel('abandoned')).toBe('Abandonado');
  });

  it('returns Sem treino for empty', () => {
    expect(statusLabel('empty')).toBe('Sem treino');
  });
});

describe('volumeToIntensityStep', () => {
  it('returns s1 for null volume', () => {
    expect(volumeToIntensityStep(null, 1000)).toBe('s1');
  });

  it('returns s1 for null max', () => {
    expect(volumeToIntensityStep(500, null)).toBe('s1');
  });

  it('returns s1 for zero max', () => {
    expect(volumeToIntensityStep(500, 0)).toBe('s1');
  });

  it('returns s1 for <25% volume', () => {
    expect(volumeToIntensityStep(200, 1000)).toBe('s1');
  });

  it('returns s2 for 25-49% volume', () => {
    expect(volumeToIntensityStep(400, 1000)).toBe('s2');
  });

  it('returns s3 for 50-74% volume', () => {
    expect(volumeToIntensityStep(600, 1000)).toBe('s3');
  });

  it('returns s4 for ≥75% volume', () => {
    expect(volumeToIntensityStep(800, 1000)).toBe('s4');
  });

  it('returns s4 for 100% volume', () => {
    expect(volumeToIntensityStep(1000, 1000)).toBe('s4');
  });
});

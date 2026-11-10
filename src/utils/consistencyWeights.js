import { PILLAR, PILLAR_LABELS, PILLAR_ORDER } from '../constants/consistencyRanking';

const PERCENT = 100;
const DECIMAL_FACTOR = 10;
const FEMININE_PILLARS = Object.freeze([PILLAR.HYDRATION, PILLAR.DIET]);

// Value rounded to one decimal
const roundOneDecimal = (value) => Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR;

// Effective share of each pillar: its weight over the sum of the active weights, in percent with one decimal; null when the pillar is off
export const effectivePercents = (weights, activePillars) => {
  const total = activePillars.reduce((sum, pillar) => sum + weights[pillar], 0);
  return Object.fromEntries(
    PILLAR_ORDER.map((pillar) => {
      if (!activePillars.includes(pillar)) return [pillar, null];
      return [pillar, total === 0 ? 0 : roundOneDecimal((weights[pillar] / total) * PERCENT)];
    }),
  );
};

// "Dieta desligada", "Hidratação e Dieta desligadas" or "todos os pilares ligados"
const offPillarsText = (offPillars) => {
  if (offPillars.length === 0) return 'todos os pilares ligados';
  const names = offPillars.map((pillar) => PILLAR_LABELS[pillar]).join(' e ');
  const allFeminine = offPillars.every((pillar) => FEMININE_PILLARS.includes(pillar));
  const suffix = allFeminine ? 'desligada' : 'desligado';
  return `${names} ${suffix}${offPillars.length > 1 ? 's' : ''}`;
};

// "42,9%" of an effective share
const percentText = (percent) => `${percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// "Peso efetivo com Dieta desligada: Treinos 42,9% · …" of the current weights and active pillars
export const effectiveWeightsPhrase = (weights, activePillars) => {
  const percents = effectivePercents(weights, activePillars);
  const offPillars = PILLAR_ORDER.filter((pillar) => !activePillars.includes(pillar));
  const shares = PILLAR_ORDER.filter((pillar) => activePillars.includes(pillar)).map((pillar) => `${PILLAR_LABELS[pillar]} ${percentText(percents[pillar])}`);
  return `Peso efetivo com ${offPillarsText(offPillars)}: ${shares.join(' · ')}`;
};

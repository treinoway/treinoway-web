import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Check, Flag, Info, Trophy } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import Badge from '../../components/ds/Badge';
import Banner from '../../components/ds/Banner';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import Segmented from '../../components/ds/Segmented';
import SkeletonRows from '../../components/ds/SkeletonRows';
import PreviousSeasonsList from '../../components/consistency/PreviousSeasonsList';
import RulesSection from '../../components/consistency/RulesSection';
import WeightRow from '../../components/consistency/WeightRow';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useInternalLinkGuard from '../../hooks/useInternalLinkGuard';
import useConsistencyConfig from '../../hooks/useConsistencyConfig';
import { formatCloseDateLabel, formatCloseLabel } from '../../utils/consistencyFormat';
import { effectivePercents, effectiveWeightsPhrase } from '../../utils/consistencyWeights';
import { CONFIG_DEFAULTS, PILLAR_ORDER, SEASON_WEEK_OPTIONS, WEIGHT_TOTAL } from '../../constants/consistencyRanking';

const BASE_URL = '/trainer/consistency-ranking';
const RANKING_PATH = '/trainer/consistency-ranking';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const DEFAULT_WEIGHTS_TEXT = Object.values(CONFIG_DEFAULTS.weights).join(' · ');
const WEIGHTS_HELP = 'Defina a importância de cada pilar. Cada pilar vale no máximo 100% por semana; fazer a mais não soma. Pilar sem meta para um aluno numa semana fica fora da conta dele.';
const COMMUNITY_NOTE = 'Login e participação na comunidade ficam fora do ranking: medem uso do app, não o cumprimento do plano.';

// Option of the season duration control
const durationItemOf = (weeks) => ({ id: weeks, label: `${weeks} semanas` });

// "DD/MM" of a "YYYY-MM-DD" date shifted by some days
const dayMonthOf = (dateKey, shiftDays = 0) => {
  const date = new Date(Date.parse(dateKey) + shiftDays * MS_PER_DAY);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Current season and closed seasons of the trainer, loaded once when the page opens
const useSeasonOverview = () => {
  const [overview, setOverview] = useState({ season: null, seasons: [] });

  useEffect(() => {
    Promise.all([api.get(`${BASE_URL}/standings`), api.get(`${BASE_URL}/seasons`)])
      .then(([standings, seasons]) => setOverview({ season: standings.data.season ?? null, seasons: seasons.data.seasons ?? [] }))
      .catch(() => setOverview({ season: null, seasons: [] }));
  }, []);

  return overview;
};

// Section with the eyebrow and title of the design above its content
const SettingsSection = ({ eyebrow, title, children }) => (
  <section className="settings-section" aria-label={title}>
    <div className="settings-section__head">
      <span className="type-overline settings-section__eyebrow">{eyebrow}</span>
      <h2 className="type-h3">{title}</h2>
    </div>
    {children}
  </section>
);

SettingsSection.propTypes = {
  eyebrow: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Back arrow, title and the restore and save actions
const SettingsHeader = ({ settings, onBack, onSave }) => (
  <header className="ds-page-header settings-header">
    <div className="settings-header__heading">
      <button type="button" className="icon-button" aria-label="Voltar" onClick={onBack}>
        <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      <div className="consistency-page__heading">
        <h1 className="ds-page-header__title type-h1">Configuração do ranking</h1>
        <p className="type-body consistency-page__subtitle">Como a constância dos teus alunos é calculada.</p>
      </div>
    </div>
    <div className="ds-page-header__actions">
      <button type="button" className="btn btn--secondary" onClick={settings.restoreDefaults}>Restaurar padrões</button>
      <button type="button" className="btn btn--primary" disabled={!settings.canSave} onClick={onSave}>
        <Check size={16} strokeWidth={2} aria-hidden="true" />
        {settings.saving ? 'Carregando...' : 'Salvar'}
      </button>
    </div>
  </header>
);

SettingsHeader.propTypes = {
  settings: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

// Current season: title, dates, early close, duration of the next seasons and the close note
const SeasonBlock = ({ season, config, closeRequested, onDurationChange, onEndSeason }) => {
  const dates = `${dayMonthOf(season.startWeek)} a ${dayMonthOf(season.endWeek, DAYS_PER_WEEK - 1)} · semana ${season.currentWeek} de ${season.weeks} · fecha ${formatCloseDateLabel(season.closesAt, config.timeZone)}`;
  return (
    <div className="section-card settings-card">
      <div className="settings-season">
        <span className="season-header__icon" aria-hidden="true"><Trophy size={24} strokeWidth={2} /></span>
        <div className="season-header__identity">
          <div className="season-header__title">
            <h3 className="type-h4">{`Temporada ${season.number}`}</h3>
            <Badge tone="success">Ativa</Badge>
          </div>
          <span className="type-caption season-header__dates">{dates}</span>
        </div>
        <button type="button" className="btn btn--secondary" disabled={closeRequested} onClick={onEndSeason}>
          <Flag size={16} strokeWidth={2} aria-hidden="true" />
          {closeRequested ? 'Encerramento agendado' : 'Encerrar temporada'}
        </button>
      </div>
      <div className="settings-season__duration">
        <div className="settings-season__field">
          <span className="field-label type-caption-strong">Duração das próximas temporadas</span>
          <Segmented ariaLabel="Duração das próximas temporadas" items={SEASON_WEEK_OPTIONS.map(durationItemOf)} value={config.seasonWeeks} onChange={(weeks) => onDurationChange(weeks)} />
          <span className="field-hint type-caption">{`Sempre de segunda a domingo. Vale a partir da Temporada ${season.number + 1} (${dayMonthOf(season.endWeek, DAYS_PER_WEEK)}).`}</span>
        </div>
        <p className="student-panel__note type-caption">
          <Info size={16} strokeWidth={2} aria-hidden="true" />
          {`Encerrar antes fecha a temporada no próximo ${formatCloseLabel(season.closesAt, config.timeZone)} e abre a nova na segunda. Nenhuma semana é cortada no meio.`}
        </p>
      </div>
    </div>
  );
};

SeasonBlock.propTypes = {
  season: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  closeRequested: PropTypes.bool.isRequired,
  onDurationChange: PropTypes.func.isRequired,
  onEndSeason: PropTypes.func.isRequired,
};

// Sum of the weights as a bar, highlighted when it is not 100
const WeightsSummary = ({ config, weightSum, onRestoreWeights }) => {
  const isValid = weightSum === WEIGHT_TOTAL;
  return (
    <div className="weights-summary">
      <div className="weights-summary__head type-body-strong">
        <span>Soma dos pesos</span>
        <span className={isValid ? '' : 'weights-summary__total--invalid'}>{`${weightSum} de ${WEIGHT_TOTAL}`}</span>
      </div>
      <span className="score-bar__track" role="progressbar" aria-label="Soma dos pesos" aria-valuemin={0} aria-valuemax={WEIGHT_TOTAL} aria-valuenow={weightSum}>
        <span className="score-bar__fill" style={{ width: `${Math.min(weightSum, WEIGHT_TOTAL)}%` }} />
      </span>
      <div className="weights-summary__foot type-caption">
        <span>{effectiveWeightsPhrase(config.weights, config.activePillars)}</span>
        <button type="button" className="btn btn--ghost" onClick={onRestoreWeights}>{`Restaurar ${DEFAULT_WEIGHTS_TEXT}`}</button>
      </div>
    </div>
  );
};

WeightsSummary.propTypes = {
  config: PropTypes.object.isRequired,
  weightSum: PropTypes.number.isRequired,
  onRestoreWeights: PropTypes.func.isRequired,
};

// Weights of the five pillars with the sum, the effective shares and the notice of when new weights apply
const WeightsBlock = ({ settings, notice }) => {
  const { config } = settings;
  const percents = effectivePercents(config.weights, config.activePillars);
  const handleRestoreWeights = () => PILLAR_ORDER.forEach((pillar) => settings.setWeight(pillar, CONFIG_DEFAULTS.weights[pillar]));
  return (
    <div className="section-card settings-card">
      {notice && (
        <div className="settings-notice">
          <Calendar size={16} strokeWidth={2} aria-hidden="true" />
          <span className="type-body">{notice}</span>
        </div>
      )}
      <p className="type-caption settings-card__help">{WEIGHTS_HELP}</p>
      <div className="settings-weights">
        {PILLAR_ORDER.map((pillar) => (
          <WeightRow
            key={pillar}
            pillar={pillar}
            weight={config.weights[pillar]}
            active={config.activePillars.includes(pillar)}
            effectivePercent={percents[pillar]}
            onWeightChange={settings.setWeight}
            onActiveChange={settings.setPillarActive}
          />
        ))}
      </div>
      <WeightsSummary config={config} weightSum={settings.weightSum} onRestoreWeights={handleRestoreWeights} />
      <p className="student-panel__note type-caption">
        <Info size={16} strokeWidth={2} aria-hidden="true" />
        {COMMUNITY_NOTE}
      </p>
    </div>
  );
};

WeightsBlock.propTypes = {
  settings: PropTypes.object.isRequired,
  notice: PropTypes.string,
};

// "Pesos novos valem a partir de segunda, DD/MM. A Temporada N continua e as semanas fechadas mantêm o score."
const weightsNoticeOf = (effectiveFrom, season) =>
  effectiveFrom && season
    ? `Pesos novos valem a partir de segunda, ${dayMonthOf(effectiveFrom)}. A Temporada ${season.number} continua e as semanas fechadas mantêm o score.`
    : null;

// Loaded page: header and the four sections of the design that exist today
const SettingsContent = ({ settings, overview, closeRequested, actions }) => {
  const { season, seasons } = overview;
  const { config } = settings;
  return (
    <div className="consistency-page settings-page">
      <SettingsHeader settings={settings} onBack={actions.onBack} onSave={actions.onSave} />
      {season && (
        <SettingsSection eyebrow="Temporada" title="Temporada atual e duração">
          <SeasonBlock season={season} config={config} closeRequested={closeRequested} onDurationChange={(weeks) => settings.setField('seasonWeeks', weeks)} onEndSeason={actions.onEndSeason} />
        </SettingsSection>
      )}
      <SettingsSection eyebrow="Pontuação" title="Pilares e pesos">
        <WeightsBlock settings={settings} notice={weightsNoticeOf(settings.effectiveFrom, season)} />
      </SettingsSection>
      <SettingsSection eyebrow="Regras" title="Regras de justiça">
        <div className="section-card settings-card">
          <RulesSection config={config} onChange={settings.setField} />
        </div>
      </SettingsSection>
      <SettingsSection eyebrow="Histórico" title="Temporadas anteriores">
        <div className="section-card settings-card">
          <PreviousSeasonsList seasons={seasons} onOpenSeason={actions.onOpenSeason} />
        </div>
      </SettingsSection>
    </div>
  );
};

SettingsContent.propTypes = {
  settings: PropTypes.object.isRequired,
  overview: PropTypes.object.isRequired,
  closeRequested: PropTypes.bool.isRequired,
  actions: PropTypes.object.isRequired,
};

// Configuration of the consistency ranking: season and duration, pillars and weights, fairness rules and previous seasons
const ConsistencyRankingSettings = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const settings = useConsistencyConfig();
  const overview = useSeasonOverview();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [closeRequested, setCloseRequested] = useState(false);
  const { isDirty } = settings;

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeUnload = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const leaveTo = useCallback((path) => {
    if (!isDirty) {
      navigate(path);
      return;
    }
    requestConfirm({ message: 'Há mudanças não salvas. Descartar e sair?', confirmLabel: 'Descartar', busyLabel: 'Saindo...', onConfirm: () => navigate(path) });
  }, [isDirty, navigate, requestConfirm]);

  useInternalLinkGuard(isDirty, leaveTo);

  const handleSave = async () => {
    try {
      await settings.save();
      showToast('Configuração salva.', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleEndSeason = () => requestConfirm({
    message: `Encerrar a Temporada ${overview.season.number}? Ela fecha no próximo fechamento da semana e a nova abre na segunda.`,
    confirmLabel: 'Encerrar temporada',
    busyLabel: 'Encerrando...',
    onConfirm: async () => {
      await api.post(`${BASE_URL}/seasons/current/close`);
      setCloseRequested(true);
    },
  });

  const actions = {
    onBack: () => leaveTo(RANKING_PATH),
    onSave: handleSave,
    onEndSeason: handleEndSeason,
    onOpenSeason: (number) => leaveTo(`${RANKING_PATH}?season=${number}`),
  };

  if (settings.error) {
    const retry = <button type="button" className="btn btn--secondary" onClick={settings.reload}>Tentar de novo</button>;
    return <Banner tone="error" action={retry}>{settings.error}</Banner>;
  }
  if (settings.loading || !settings.config) return <SkeletonRows label="Carregando configuração" count={8} />;

  return (
    <>
      <SettingsContent settings={settings} overview={overview} closeRequested={closeRequested} actions={actions} />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
};

export default ConsistencyRankingSettings;

import PropTypes from 'prop-types';
import { Plus, X } from 'lucide-react';
import Segmented from '../ds/Segmented';
import { WATER_CUP_ML, WATER_ML_PER_KG } from '../../constants/nutrition';
import { formatFlexible, previewTitle } from '../../utils/nutritionFormat';
import { suggestedWaterMl } from '../../utils/waterTarget';

const FREE_MEAL_ITEMS = [
  { id: '0', label: 'Não liberar' },
  { id: '1', label: '1 por semana' },
  { id: '2', label: '2 por semana' },
];
const FREE_MEAL_TEXT_LIMIT = 500;
const OBSERVATIONS_LIMIT = 2000;
const ML_PER_LITRE = 1000;
const MAX_CUPS = 24;

// Water target in litres shown to the nutritionist, null when unset.
const toLitres = (ml) => (ml == null ? null : ml / ML_PER_LITRE);

// Number of cups of the water target (0 when unset), capped to keep the drawing compact.
const cupCount = (waterTargetMl) => (waterTargetMl ? Math.min(MAX_CUPS, Math.ceil(waterTargetMl / WATER_CUP_ML)) : 0);

// Row of slanted bars, one per cup.
const Cups = ({ count, small = false }) => (
  <div className={`cups${small ? ' cups--small' : ''}`} aria-hidden="true">
    {Array.from({ length: count }, (unused, index) => <span key={index} className="cups__cup" />)}
  </div>
);

Cups.propTypes = { count: PropTypes.number.isRequired, small: PropTypes.bool };

// Card header: title (with optional subtitle) and the "APARECE NO APP/PDF" badge.
const SectionHeader = ({ id, title, subtitle, badge, badgeTone = 'app' }) => (
  <div className="guidance-card__header">
    <div>
      <h2 id={id} className="goals-card__title">{title}</h2>
      {subtitle && <p className="goals-card__subtitle">{subtitle}</p>}
    </div>
    <span className={`prescription-badge prescription-badge--${badgeTone}`}>{badge}</span>
  </div>
);

SectionHeader.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.string,
  badge: PropTypes.string.isRequired,
  badgeTone: PropTypes.oneOf(['app', 'pdf']),
};

// Daily water target with the suggestion button, the cup summary and the cups drawing.
export const WaterSection = ({ waterTargetMl, weightKg, onChange }) => {
  const suggestion = suggestedWaterMl(weightKg);
  const cups = cupCount(waterTargetMl);
  const summary = waterTargetMl == null
    ? 'Sem meta de água definida.'
    : `No app: meta de ${formatFlexible(toLitres(waterTargetMl))} L, em ${Math.ceil(waterTargetMl / WATER_CUP_ML)} copos de ${WATER_CUP_ML} ml.`;

  return (
    <section className="guidance-card" aria-labelledby="water-title">
      <SectionHeader id="water-title" title="Ingestão hídrica" badge="Aparece no app" />
      <div className="prescription-field">
        <label className="prescription-label" htmlFor="water-target">Meta diária</label>
        <div className="water-target">
          <input
            id="water-target"
            type="number"
            min="0"
            step="0.1"
            className="input water-target__input"
            value={waterTargetMl == null ? '' : toLitres(waterTargetMl)}
            onChange={(event) => onChange(event.target.value === '' ? null : Math.round(Number(event.target.value) * ML_PER_LITRE))}
          />
          <span className="macro-table__unit">litros</span>
          {suggestion != null && (
            <button type="button" className="prescription-chip-button" onClick={() => onChange(suggestion)}>
              Usar {WATER_ML_PER_KG} ml/kg · {formatFlexible(toLitres(suggestion))} L
            </button>
          )}
        </div>
      </div>
      <p className="prescription-note">{summary}</p>
      <Cups count={cups} />
    </section>
  );
};

WaterSection.propTypes = {
  waterTargetMl: PropTypes.number,
  weightKg: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

// Free meals per week with the guidance text.
export const FreeMealSection = ({ perWeek, text, onPerWeekChange, onTextChange }) => (
  <section className="guidance-card" aria-labelledby="free-meal-title">
    <SectionHeader id="free-meal-title" title="Refeição livre" badge="Aparece no app" />
    <Segmented
      ariaLabel="Refeições livres por semana"
      items={FREE_MEAL_ITEMS}
      value={String(perWeek)}
      onChange={(id) => onPerWeekChange(Number(id))}
    />
    {perWeek === 0 ? (
      <p className="prescription-note">Sem refeição livre neste plano. Esse bloco não aparece pra paciente.</p>
    ) : (
      <div className="prescription-field">
        <label className="prescription-label" htmlFor="free-meal-text">Orientação</label>
        <textarea
          id="free-meal-text"
          className="input"
          rows={3}
          maxLength={FREE_MEAL_TEXT_LIMIT}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
        />
        <span className="guidance-card__counter">{text.length}/{FREE_MEAL_TEXT_LIMIT}</span>
      </div>
    )}
  </section>
);

FreeMealSection.propTypes = {
  perWeek: PropTypes.number.isRequired,
  text: PropTypes.string.isRequired,
  onPerWeekChange: PropTypes.func.isRequired,
  onTextChange: PropTypes.func.isRequired,
};

// One supplement row: name, dose, when and remove.
const SupplementRow = ({ supplement, onChange, onRemove }) => {
  const label = supplement.name.trim().toLowerCase() || 'suplemento';
  return (
    <li className="supplement-row">
      <input className="input supplement-row__name" aria-label="Nome do suplemento" placeholder="Nome do suplemento" value={supplement.name} onChange={(event) => onChange({ name: event.target.value })} />
      <input className="input" aria-label={`Dose de ${label}`} placeholder="Dose" value={supplement.dose} onChange={(event) => onChange({ dose: event.target.value })} />
      <input className="input" aria-label={`Quando tomar ${label}`} placeholder="Quando tomar" value={supplement.when} onChange={(event) => onChange({ when: event.target.value })} />
      <button type="button" className="supplement-row__remove" aria-label={`Remover ${label}`} title={`Remover ${label}`} onClick={onRemove}>
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
};

SupplementRow.propTypes = {
  supplement: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// Supplements table (name, dose, when).
export const SupplementsSection = ({ supplements, onChange, onAdd, onRemove }) => (
  <section className="guidance-card" aria-labelledby="supplements-title">
    <SectionHeader id="supplements-title" title="Suplementação" subtitle="Cada item vira um lembrete no horário certo pra paciente." badge="Aparece no app e no PDF" />
    <div className="supplements-table">
      <div className="supplements-table__head" aria-hidden="true">
        <span>Suplemento</span><span>Dose</span><span>Quando</span><span />
      </div>
      <ul className="supplements-list">
        {supplements.map((supplement) => (
          <SupplementRow
            key={supplement.key}
            supplement={supplement}
            onChange={(changes) => onChange(supplement.key, changes)}
            onRemove={() => onRemove(supplement.key)}
          />
        ))}
      </ul>
    </div>
    <div className="supplements-actions">
      <button type="button" className="btn btn--secondary prescription-button" onClick={onAdd}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Adicionar suplemento
      </button>
      <p className="prescription-note">Fitoterápicos e manipulados seguem as normas do CFN pra tua habilitação.</p>
    </div>
  </section>
);

SupplementsSection.propTypes = {
  supplements: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// Plan notes (PDF only).
export const ObservationsSection = ({ value, onChange }) => (
  <section className="guidance-card" aria-labelledby="observations-title">
    <SectionHeader
      id="observations-title"
      title={<label htmlFor="observations">Observações do plano</label>}
      subtitle="Orientações gerais que acompanham o cardápio impresso ou enviado."
      badge="Aparece no PDF"
      badgeTone="pdf"
    />
    <textarea
      id="observations"
      className="input"
      rows={5}
      maxLength={OBSERVATIONS_LIMIT}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    <span className="guidance-card__counter">{value.length}/{OBSERVATIONS_LIMIT}</span>
  </section>
);

ObservationsSection.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

// Free-meal line of the preview.
const freeMealPreview = (perWeek) => `${perWeek} por semana`;

// One supplement of the preview, with placeholders for the missing dose/time.
const PreviewSupplement = ({ supplement }) => (
  <li className="phone__supplement">
    <span className="phone__dot" aria-hidden="true" />
    <span>
      <span className="phone__supplement-name">{`${supplement.name} · ${supplement.dose || 'dose a definir'}`}</span>
      <span className="phone__supplement-when">{supplement.when || 'horário a definir'}</span>
    </span>
  </li>
);

PreviewSupplement.propTypes = { supplement: PropTypes.object.isRequired };

// Phone-style preview of what the patient sees in the app for these guidance fields.
export const GuidancePreview = ({ firstName, waterTargetMl, perWeek, freeMealText = '', supplements }) => (
  <section className="guidance-card guidance-preview" aria-label={previewTitle(firstName)}>
    <h2 className="goals-card__title">{previewTitle(firstName)}</h2>
    <p className="goals-card__subtitle">Muda junto com o que tu preenche.</p>
    <div className="phone" aria-hidden="true">
      <p className="phone__title">Nutrição · Orientações</p>
      <div className="phone__card">
        <p className="phone__label">Água</p>
        <p className="phone__water">
          {waterTargetMl == null ? '-' : `${formatFlexible(toLitres(waterTargetMl))} L`} <span>por dia</span>
        </p>
        <Cups count={cupCount(waterTargetMl)} small />
      </div>
      {perWeek > 0 && (
        <div className="phone__card">
          <p className="phone__label">Refeição livre</p>
          <p className="phone__value">{freeMealPreview(perWeek)}</p>
          {freeMealText && <p className="phone__text">{freeMealText}</p>}
        </div>
      )}
      {supplements.length > 0 && (
        <div className="phone__card">
          <p className="phone__label">Suplementos</p>
          <ul className="phone__list">
            {supplements.map((supplement) => <PreviewSupplement key={supplement.key} supplement={supplement} />)}
          </ul>
        </div>
      )}
    </div>
    <p className="guidance-preview__note">As observações do plano ficam no PDF, fora do app.</p>
  </section>
);

GuidancePreview.propTypes = {
  firstName: PropTypes.string,
  waterTargetMl: PropTypes.number,
  perWeek: PropTypes.number.isRequired,
  freeMealText: PropTypes.string,
  supplements: PropTypes.arrayOf(PropTypes.object).isRequired,
};

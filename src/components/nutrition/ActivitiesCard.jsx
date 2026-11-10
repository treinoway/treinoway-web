import { useState } from 'react';
import PropTypes from 'prop-types';
import { Plus, X } from 'lucide-react';
import { activityKcalPerDay } from '../../utils/nutritionCalc';
import { formatDecimal, formatInteger } from '../../utils/nutritionFormat';

const EMPTY_DRAFT = { name: '', met: '', minutes: '', perWeek: '' };

// Whether the draft has a name and positive numbers.
const isDraftValid = (draft) =>
  draft.name.trim() && [draft.met, draft.minutes, draft.perWeek].every((value) => Number(value) > 0);

// Inline form that adds a manual activity.
const ActivityForm = ({ onSave, onCancel }) => {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const setField = (key) => (event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSave = () => onSave({
    name: draft.name.trim(),
    met: Number(draft.met),
    minutes: Number(draft.minutes),
    perWeek: Number(draft.perWeek),
    included: true,
    fromTraining: false,
  });

  return (
    <div className="activity-form">
      <div className="prescription-field activity-form__name">
        <label className="prescription-label" htmlFor="activity-name">Nome da atividade</label>
        <input id="activity-name" className="input" value={draft.name} onChange={setField('name')} />
      </div>
      <div className="prescription-field">
        <label className="prescription-label" htmlFor="activity-met">MET</label>
        <input id="activity-met" type="number" step="any" className="input" value={draft.met} onChange={setField('met')} />
      </div>
      <div className="prescription-field">
        <label className="prescription-label" htmlFor="activity-minutes">Minutos por sessão</label>
        <input id="activity-minutes" type="number" className="input" value={draft.minutes} onChange={setField('minutes')} />
      </div>
      <div className="prescription-field">
        <label className="prescription-label" htmlFor="activity-per-week">Sessões por semana</label>
        <input id="activity-per-week" type="number" className="input" value={draft.perWeek} onChange={setField('perWeek')} />
      </div>
      <div className="activity-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn--primary" onClick={handleSave} disabled={!isDraftValid(draft)}>Salvar atividade</button>
      </div>
    </div>
  );
};

ActivityForm.propTypes = { onSave: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired };

// One activity: include checkbox, summary and kcal/day (manual ones can be removed).
const ActivityItem = ({ activity, weightKg, onToggle, onRemove }) => (
  <li className="activity-item">
    <label className="activity-item__main">
      <input
        type="checkbox"
        className="activity-item__check"
        aria-label={`Incluir ${activity.name} no cálculo`}
        checked={activity.included}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span className="activity-item__text">
        <span className="activity-item__name">{activity.name}</span>
        <span className="activity-item__detail">
          {activity.perWeek}×/semana · {activity.minutes} min · MET {formatDecimal(activity.met)}
        </span>
      </span>
      <span className="activity-item__kcal">+{formatInteger(activityKcalPerDay(activity, weightKg))} kcal/dia</span>
    </label>
    {!activity.fromTraining && (
      <button type="button" className="activity-item__remove" aria-label={`Remover ${activity.name}`} title={`Remover ${activity.name}`} onClick={onRemove}>
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    )}
  </li>
);

ActivityItem.propTypes = {
  activity: PropTypes.object.isRequired,
  weightKg: PropTypes.number.isRequired,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// "ATIVIDADES FÍSICAS · METs" panel, prefilled from the patient's training in TeuFit.
const ActivitiesCard = ({ activities, weightKg, trainerName, onChange }) => {
  const [adding, setAdding] = useState(false);
  const hasTrainingActivity = activities.some((activity) => activity.fromTraining);

  const handleToggle = (index) => (included) =>
    onChange(activities.map((activity, position) => (position === index ? { ...activity, included } : activity)));

  const handleRemove = (index) => () => onChange(activities.filter((activity, position) => position !== index));

  const handleAdd = (activity) => {
    onChange([...activities, activity]);
    setAdding(false);
  };

  return (
    <section className="activities-card" aria-label="Atividades por MET">
      <div className="activities-card__header">
        <p className="activities-card__title">Atividades físicas · METs</p>
        {hasTrainingActivity && (
          <span className="prescription-badge">{trainerName ? `Do treino do ${trainerName} no TeuFit` : 'Do treino no TeuFit'}</span>
        )}
      </div>
      <ul className="activities-card__list">
        {activities.map((activity, index) => (
          <ActivityItem
            key={`${activity.name}-${index}`}
            activity={activity}
            weightKg={weightKg}
            onToggle={handleToggle(index)}
            onRemove={handleRemove(index)}
          />
        ))}
      </ul>
      {adding ? (
        <ActivityForm onSave={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" className="prescription-text-button" onClick={() => setAdding(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Adicionar atividade
        </button>
      )}
    </section>
  );
};

ActivitiesCard.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object).isRequired,
  weightKg: PropTypes.number.isRequired,
  trainerName: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default ActivitiesCard;

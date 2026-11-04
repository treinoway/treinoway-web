import PropTypes from 'prop-types';
import { Check } from 'lucide-react';
import Avatar from '../ds/Avatar';
import { objectiveName } from '../../constants/nutrition';
import { formatFlexible, personName } from '../../utils/nutritionFormat';

// "29 anos · 66 kg · Objetivo: Déficit moderado" with only the known parts.
const describePatient = (patient) => {
  const objective = objectiveName(patient.objective);
  return [
    patient.age != null && `${patient.age} anos`,
    patient.weightKg != null && `${formatFlexible(patient.weightKg)} kg`,
    objective && `Objetivo: ${objective}`,
  ].filter(Boolean).join(' · ');
};

// Publish area: the published state when nothing is pending, otherwise the publish button.
const PublishControl = ({ plan, publishing, onPublish }) => {
  if (plan.status === 'published' && !plan.hasUnpublishedChanges) {
    return (
      <span className="nutri-published" role="status" aria-label="Plano publicado">
        <Check size={18} strokeWidth={2} aria-hidden="true" />
        Publicado
      </span>
    );
  }
  return (
    <button type="button" className="btn btn--primary nutri-hero__action" onClick={onPublish} disabled={publishing}>
      {publishing ? 'Publicando…' : 'Publicar plano'}
    </button>
  );
};

PublishControl.propTypes = {
  plan: PropTypes.object.isRequired,
  publishing: PropTypes.bool.isRequired,
  onPublish: PropTypes.func.isRequired,
};

// Hero card of the plan summary: patient identity, plan status with save / publish and the slot for KPIs and tabs.
const PlanHero = ({ patient, plan, statusLines = [], publishing, onSaveDraft, onPublish, children }) => {
  const name = personName(patient);
  return (
    <section className="nutri-hero" aria-label="Paciente">
      <div className="nutri-hero__inner">
        <div className="nutri-hero__top">
          <div className="nutri-hero__identity">
            <Avatar name={name} src={patient.avatarUrl ?? undefined} size="lg" />
            <div className="nutri-hero__text">
              <p className="nutri-eyebrow">Paciente · Plano alimentar</p>
              <h1 className="nutri-hero__name">{name}</h1>
              <p className="nutri-hero__facts">{describePatient(patient)}</p>
            </div>
          </div>
          <div className="nutri-hero__actions">
            {statusLines.length > 0 && (
              <p className="nutri-hero__status" aria-live="polite">
                {statusLines.map((line) => <span key={line}>{line}</span>)}
              </p>
            )}
            <button type="button" className="btn btn--secondary nutri-hero__action" onClick={onSaveDraft} disabled={publishing}>Salvar rascunho</button>
            <PublishControl plan={plan} publishing={publishing} onPublish={onPublish} />
          </div>
        </div>
        {children}
      </div>
    </section>
  );
};

PlanHero.propTypes = {
  patient: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  statusLines: PropTypes.arrayOf(PropTypes.string),
  publishing: PropTypes.bool.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default PlanHero;

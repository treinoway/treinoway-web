import { useState } from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getOverview, getPlan, getSheet, patchGuidance, publishPlan } from '../../api/nutrition';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import usePlanAutosave from '../../hooks/usePlanAutosave';
import usePlanMutation from '../../hooks/usePlanMutation';
import useLoadResource from '../../hooks/useLoadResource';
import LoadState from '../../components/nutrition/LoadState';
import PrescriptionLayout from '../../components/nutrition/PrescriptionLayout';
import {
  FreeMealSection,
  GuidancePreview,
  ObservationsSection,
  SupplementsSection,
  WaterSection,
} from '../../components/nutrition/GuidanceSections';

let nextSupplementKey = 0;

// Builds a supplement row with a stable local key.
const toSupplementRow = (supplement = {}) => {
  nextSupplementKey += 1;
  return { key: `supplement-${nextSupplementKey}`, name: supplement.name ?? '', dose: supplement.dose ?? '', when: supplement.when ?? '' };
};

// Supplements as the API wants them: named rows only, empty dose/when as null.
const toSupplementPayload = (rows) => rows
  .filter((row) => row.name.trim())
  .map((row) => ({ name: row.name.trim(), dose: row.dose.trim() || null, when: row.when.trim() || null }));

// Loads plan, sheet (weight for the water suggestion) and overview (patient name).
const loadGuidanceData = async (patientId) => {
  const [plan, sheet, overview] = await Promise.all([getPlan(patientId), getSheet(patientId), getOverview(patientId)]);
  return { plan, sheet, overview };
};

// Form state of the guidance fields, initialised from the plan.
const initialForm = (guidance) => ({
  waterTargetMl: guidance.waterTargetMl,
  freeMealsPerWeek: guidance.freeMealsPerWeek,
  freeMealText: guidance.freeMealText ?? '',
  observations: guidance.observations ?? '',
  supplements: guidance.supplements.map(toSupplementRow),
});

// API payload of the form (what autosave compares and sends).
const toPayload = (form) => ({
  waterTargetMl: form.waterTargetMl,
  freeMealsPerWeek: form.freeMealsPerWeek,
  freeMealText: form.freeMealText || null,
  supplements: toSupplementPayload(form.supplements),
  observations: form.observations || null,
});

// Whether the app already shows the current version of the plan.
const isUpToDate = (plan) => plan.status === 'published' && !plan.hasUnpublishedChanges;

// Footer action: "Publicar plano" while there is something to publish, the "Publicado" state otherwise.
const PublishAction = ({ plan, publishing, onPublish }) => {
  if (isUpToDate(plan)) {
    return (
      <span className="btn prescription-footer__published">
        <Check size={18} strokeWidth={2} aria-hidden="true" />
        Publicado
      </span>
    );
  }
  return (
    <button type="button" className="btn btn--primary prescription-footer__button" onClick={onPublish} disabled={publishing}>
      {publishing ? 'Publicando…' : 'Publicar plano'}
    </button>
  );
};

PublishAction.propTypes = {
  plan: PropTypes.object.isRequired,
  publishing: PropTypes.bool.isRequired,
  onPublish: PropTypes.func.isRequired,
};

// Editor of the guidance step: water, free meal, supplements, notes, preview and publish.
const GuidanceEditor = ({ patient, initialPlan, weightKg }) => {
  const { showToast } = useToast();
  const [plan, setPlan] = useState(initialPlan);
  const [form, setForm] = useState(() => initialForm(initialPlan.guidance));
  const [publishing, setPublishing] = useState(false);
  const runMutation = usePlanMutation(setPlan);
  const autosave = usePlanAutosave({ value: toPayload(form), save: (payload) => runMutation.applyLatest(() => patchGuidance(plan.id, payload)) });
  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateSupplement = (key, changes) => setForm((prev) => ({
    ...prev,
    supplements: prev.supplements.map((row) => (row.key === key ? { ...row, ...changes } : row)),
  }));
  const addSupplement = () => setForm((prev) => ({ ...prev, supplements: [...prev.supplements, toSupplementRow()] }));
  const removeSupplement = (key) => setForm((prev) => ({ ...prev, supplements: prev.supplements.filter((row) => row.key !== key) }));

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const saved = await autosave.flush();
      if (!saved) return;
      await runMutation.applyLatest(() => publishPlan(plan.id));
      showToast('Plano publicado.', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPublishing(false);
    }
  };

  const saveStatusText = autosave.statusText || (isUpToDate(plan) ? 'Publicado · já aparece no app do paciente.' : '');

  return (
    <PrescriptionLayout
      step="guidance"
      patient={{ ...patient, weightKg: weightKg ?? patient.weightKg }}
      plan={plan}
      title="Orientações do plano"
      subtitle="O que acompanha o cardápio no dia a dia. Cada bloco mostra onde aparece."
      saveStatusText={saveStatusText}
      saveStatus={autosave.status}
      onRetrySave={autosave.retry}
      onBeforeNavigate={autosave.flush}
      footerExtra={<PublishAction plan={plan} publishing={publishing} onPublish={handlePublish} />}
    >
      <div className="guidance-board">
        <div className="guidance-board__form">
          <div className="guidance-board__pair">
            <WaterSection waterTargetMl={form.waterTargetMl} weightKg={weightKg} onChange={setField('waterTargetMl')} />
            <FreeMealSection perWeek={form.freeMealsPerWeek} text={form.freeMealText} onPerWeekChange={setField('freeMealsPerWeek')} onTextChange={setField('freeMealText')} />
          </div>
          <SupplementsSection supplements={form.supplements} onChange={updateSupplement} onAdd={addSupplement} onRemove={removeSupplement} />
          <ObservationsSection value={form.observations} onChange={setField('observations')} />
        </div>
        <GuidancePreview
          firstName={patient.firstName}
          waterTargetMl={form.waterTargetMl}
          perWeek={form.freeMealsPerWeek}
          freeMealText={form.freeMealText}
          supplements={form.supplements.filter((row) => row.name.trim())}
        />
      </div>
    </PrescriptionLayout>
  );
};

GuidanceEditor.propTypes = {
  patient: PropTypes.object.isRequired,
  initialPlan: PropTypes.object.isRequired,
  weightKg: PropTypes.number,
};

/** Prescrição 3 · Orientações: water, free meal, supplements, notes, app preview and publish. */
const PrescriptionGuidance = () => {
  const { patientId } = useParams();
  const resource = useLoadResource(() => loadGuidanceData(patientId), patientId);
  const { data } = resource;

  return (
    <LoadState loading={resource.loading} error={resource.error} onRetry={resource.reload}>
      {data && (
        <GuidanceEditor
          patient={data.overview.patient}
          initialPlan={data.plan}
          weightKg={data.sheet.weightKg}
        />
      )}
    </LoadState>
  );
};

export default PrescriptionGuidance;

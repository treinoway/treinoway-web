import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addItem,
  addMeal,
  addSubstitute,
  deleteItem,
  deleteSubstitute,
  getOverview,
  getPlan,
  patchGuidance,
  patchItem,
  publishPlan,
} from '../../api/nutrition';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLoadResource from '../../hooks/useLoadResource';
import usePlanAutosave, { AUTOSAVE_STATUS } from '../../hooks/usePlanAutosave';
import usePlanMutation from '../../hooks/usePlanMutation';
import { useQuantityDrafts } from '../../hooks/useMenuEditor';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import AddMealModal from '../../components/nutrition/AddMealModal';
import AdherenceKpis from '../../components/nutrition/AdherenceKpis';
import AppPreview from '../../components/nutrition/AppPreview';
import DayVsGoals from '../../components/nutrition/DayVsGoals';
import { WaterSection } from '../../components/nutrition/GuidanceSections';
import LoadState from '../../components/nutrition/LoadState';
import PatientTabs from '../../components/nutrition/PatientTabs';
import PlanBreadcrumb from '../../components/nutrition/PlanBreadcrumb';
import PlanHero from '../../components/nutrition/PlanHero';
import SegmentedChoice from '../../components/nutrition/SegmentedChoice';
import SummaryMeal from '../../components/nutrition/SummaryMeal';
import TrainerCard from '../../components/nutrition/TrainerCard';
import { dayTotals } from '../../utils/nutritionCalc';
import { countLabel, formatInteger, personName } from '../../utils/nutritionFormat';
import { pickNextMeal, shortName } from '../../utils/nutritionSummary';
import { buildDayGoals, withDraftQuantities } from '../../utils/planView';

const MESSAGE_LIMIT = 500;
const TABS = [
  { id: 'plan', label: 'Plano alimentar' },
  { id: 'anamnesis', label: 'Anamnese' },
  { id: 'followup', label: 'Acompanhamento' },
  { id: 'evolution', label: 'Evolução' },
];
const VIEWS = [
  { id: 'simple', label: 'Prescrição simples' },
  { id: 'detailed', label: 'Prescrição detalhada' },
];

// Loads the plan and the overview of the patient together.
const loadSummaryData = async (patientId) => {
  const [plan, overview] = await Promise.all([getPlan(patientId), getOverview(patientId)]);
  return { plan, overview };
};

// Plan state shown next to the actions: Rascunho or the pending-changes warning (nothing when published and clean).
const planStateText = (plan) => {
  if (plan.status !== 'published') return 'Rascunho';
  return plan.hasUnpublishedChanges ? 'Alterações não publicadas' : '';
};

// Error line of an autosave with the retry action (nothing while it has no error).
const AutosaveError = ({ autosave }) => {
  if (autosave.status !== AUTOSAVE_STATUS.ERROR) return null;
  return (
    <p className="nutri-card__error" role="alert">
      {autosave.statusText}
      {' '}
      <button type="button" className="nutri-link-btn" onClick={autosave.retry}>Tentar novamente</button>
    </p>
  );
};

AutosaveError.propTypes = { autosave: PropTypes.object.isRequired };

// Free-text message the patient reads in the app, saved automatically.
const PatientMessage = ({ firstName, value, onChange, autosave }) => (
  <section className="nutri-card" aria-label="Recado">
    <label className="nutri-card__title" htmlFor="patient-message">Recado pra paciente</label>
    <p className="nutri-card__subtitle">{firstName ? `Aparece na tela de nutrição de ${firstName}.` : 'Aparece na tela de nutrição do paciente.'}</p>
    <textarea
      id="patient-message"
      className="input nutri-card__textarea"
      rows={4}
      maxLength={MESSAGE_LIMIT}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    <span className="nutri-card__counter">{value.length}/{MESSAGE_LIMIT}</span>
    <AutosaveError autosave={autosave} />
  </section>
);

PatientMessage.propTypes = {
  firstName: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autosave: PropTypes.object.isRequired,
};

// Meals column: title with totals, the Editor / Prescrição switch, the accordion and the add-meal action.
const MealsColumn = ({ meals, totalKcal, patientId, handlers, quantityTexts, quantityAutosave, onAddMeal }) => {
  const navigate = useNavigate();
  const handleView = (view) => {
    if (view === 'detailed') navigate(`/nutritionist/patients/${patientId}/plan/menu`);
  };

  return (
    <section className="nutri-meals" aria-label="Refeições do plano">
      <div className="nutri-meals__header">
        <div className="nutri-meals__heading">
          <h2 className="nutri-meals__title">Refeições</h2>
          <p className="nutri-meals__totals">{`${countLabel(meals.length, 'refeição', 'refeições')} · ${formatInteger(totalKcal)} kcal no dia`}</p>
        </div>
        <SegmentedChoice ariaLabel="Visualização do plano" items={VIEWS} value="simple" onChange={handleView} />
      </div>
      {meals.length === 0 && <p className="nutri-meals__empty">Nenhuma refeição no plano. Adicione a primeira refeição.</p>}
      {meals.length > 0 && (
        <ul className="nutri-meals__list">
          {meals.map((meal) => <SummaryMeal key={meal.id} meal={meal} patientId={patientId} handlers={handlers} quantityTexts={quantityTexts} />)}
        </ul>
      )}
      <AutosaveError autosave={quantityAutosave} />
      <button type="button" className="nutri-add-meal" onClick={onAddMeal}>
        + Adicionar refeição
      </button>
    </section>
  );
};

MealsColumn.propTypes = {
  meals: PropTypes.arrayOf(PropTypes.object).isRequired,
  totalKcal: PropTypes.number.isRequired,
  patientId: PropTypes.string.isRequired,
  handlers: PropTypes.object.isRequired,
  quantityTexts: PropTypes.objectOf(PropTypes.string).isRequired,
  quantityAutosave: PropTypes.object.isRequired,
  onAddMeal: PropTypes.func.isRequired,
};

// Placeholder for the tabs that are not built yet.
const ComingSoon = ({ label }) => (
  <section className="nutri-card nutri-soon" aria-label={label}>
    <h2 className="nutri-card__title">{label}</h2>
    <p className="nutri-card__subtitle">Esta seção chega em breve.</p>
  </section>
);

ComingSoon.propTypes = { label: PropTypes.string.isRequired };

// Mutations of the summary (swaps, foods, meals) bound to the plan state.
const useSummaryActions = ({ plan, setPlan, requestConfirm }) => {
  const runMutation = usePlanMutation(setPlan);
  const quantities = useQuantityDrafts(plan, runMutation);
  const [savingMeal, setSavingMeal] = useState(false);

  const handlers = {
    onQuantityChange: quantities.setQuantity,
    onChangeBasis: (item, swapBasis) => runMutation(() => patchItem(item.id, { swapBasis })),
    onRemove: (substitute) => runMutation(() => deleteSubstitute(substitute.id)),
    onAdd: async (item, food) => Boolean(await runMutation(() => addSubstitute(item.id, food.id))),
    onAddItem: async (option, food) => Boolean(await runMutation(() => addItem(option.id, { foodId: food.id }))),
    onRemoveItem: (item) => requestConfirm({
      message: `Remover "${shortName(item.name)}" da refeição?`,
      confirmLabel: 'Remover',
      busyLabel: 'Removendo…',
      onConfirm: async () => {
        await runMutation.applyLatest(() => deleteItem(item.id));
        quantities.dropDraft(item.id);
      },
    }),
  };

  const addNewMeal = async (body) => {
    setSavingMeal(true);
    const added = await runMutation(() => addMeal(plan.id, body));
    setSavingMeal(false);
    return Boolean(added);
  };

  return { runMutation, handlers, addNewMeal, savingMeal, quantities };
};

// Save-draft and publish actions: both flush the pending autosaves first and publish only when it succeeded.
const usePlanActions = ({ flushAll, runMutation, plan, savedKey }) => {
  const { showToast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [savedMessage, setSavedMessage] = useState(null);

  const saveDraft = async () => {
    if (await flushAll()) setSavedMessage(savedKey);
  };

  const publish = async () => {
    setPublishing(true);
    try {
      if (!(await flushAll())) return;
      await runMutation.applyLatest(() => publishPlan(plan.id));
      showToast('Plano publicado.', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPublishing(false);
    }
  };

  return { publishing, saveDraft, publish, justSaved: savedMessage === savedKey };
};

// Summary of the plan: hero with KPIs and tabs, meals with swaps, day vs goals, app preview, message and publish.
const SummaryContent = ({ patientId, initialPlan, overview }) => {
  const [plan, setPlan] = useState(initialPlan);
  const [tab, setTab] = useState('plan');
  const [message, setMessage] = useState(initialPlan.guidance.patientMessage ?? '');
  const [waterTargetMl, setWaterTargetMl] = useState(initialPlan.guidance.waterTargetMl ?? null);
  const [addingMeal, setAddingMeal] = useState(false);
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const { runMutation, handlers, addNewMeal, savingMeal, quantities } = useSummaryActions({ plan, setPlan, requestConfirm });
  const guidance = { patientMessage: message, waterTargetMl };
  const autosave = usePlanAutosave({ value: guidance, save: (payload) => runMutation.applyLatest(() => patchGuidance(plan.id, payload)) });
  const flushAll = async () => (await quantities.autosave.flush()) && (await autosave.flush());
  const actions = usePlanActions({ flushAll, runMutation, plan, savedKey: JSON.stringify([guidance, quantities.drafts]) });
  const { patient } = overview;
  const hasDrafts = Object.keys(quantities.drafts).length > 0;
  const meals = withDraftQuantities([...plan.meals].sort((a, b) => a.order - b.order), quantities.drafts);
  const totals = (!hasDrafts && plan.computed?.dayTotals) || dayTotals(meals);
  const savedText = [autosave, quantities.autosave].filter((item) => item.status !== AUTOSAVE_STATUS.ERROR).map((item) => item.statusText).find(Boolean) ?? '';
  const statusLines = [planStateText(plan), savedText || (actions.justSaved ? 'Salvo' : '')].filter(Boolean);

  const handleAddMeal = async (body) => {
    if (await addNewMeal(body)) setAddingMeal(false);
  };

  return (
    <div className="nutri-page">
      <PlanBreadcrumb patientName={personName(patient)} />
      <PlanHero patient={patient} plan={plan} statusLines={statusLines} publishing={actions.publishing} onSaveDraft={actions.saveDraft} onPublish={actions.publish}>
        <div className="nutri-kpis">
          <AdherenceKpis adherence={overview.adherence7d} />
          <TrainerCard trainer={overview.trainer} />
        </div>
        <PatientTabs ariaLabel="Seções do paciente" tabs={TABS} value={tab} onChange={setTab} />
      </PlanHero>
      {tab !== 'plan' ? (
        <ComingSoon label={TABS.find((item) => item.id === tab).label} />
      ) : (
        <div className="nutri-columns">
          <MealsColumn meals={meals} totalKcal={totals.kcal} patientId={patientId} handlers={handlers} quantityTexts={quantities.drafts} quantityAutosave={quantities.autosave} onAddMeal={() => setAddingMeal(true)} />
          <aside className="nutri-aside" aria-label="Resumo do plano">
            <DayVsGoals totals={totals} goals={buildDayGoals(plan)} weightKg={patient.weightKg ?? undefined} />
            <WaterSection waterTargetMl={waterTargetMl} weightKg={patient.weightKg ?? undefined} onChange={setWaterTargetMl} />
            <AppPreview firstName={patient.firstName} meal={pickNextMeal(meals)} />
            <PatientMessage firstName={patient.firstName} value={message} onChange={setMessage} autosave={autosave} />
          </aside>
        </div>
      )}
      {addingMeal && <AddMealModal submitting={savingMeal} onClose={() => setAddingMeal(false)} onSubmit={handleAddMeal} />}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

SummaryContent.propTypes = {
  patientId: PropTypes.string.isRequired,
  initialPlan: PropTypes.object.isRequired,
  overview: PropTypes.object.isRequired,
};

/** Resumo do plano (tela A): the patient's plan, adherence, swaps and publish. */
const PlanSummary = () => {
  const { patientId } = useParams();
  const resource = useLoadResource(() => loadSummaryData(patientId), patientId);
  const { data } = resource;

  return (
    <LoadState loading={resource.loading} error={resource.error} onRetry={resource.reload}>
      {data && <SummaryContent patientId={patientId} initialPlan={data.plan} overview={data.overview} />}
    </LoadState>
  );
};

export default PlanSummary;

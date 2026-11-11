import { useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { getOverview, getPlan, getSheet, patchGoals, saveSheet } from '../../api/nutrition';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import usePlanAutosave from '../../hooks/usePlanAutosave';
import useLoadResource from '../../hooks/useLoadResource';
import EditSheetModal from '../../components/nutrition/EditSheetModal';
import EnergyCard from '../../components/nutrition/EnergyCard';
import LoadState from '../../components/nutrition/LoadState';
import MacroTargetsCard from '../../components/nutrition/MacroTargetsCard';
import PrescriptionLayout from '../../components/nutrition/PrescriptionLayout';
import { buildEnergyPanel, isSheetComplete } from '../../utils/energyPanel';
import { macroTargets } from '../../utils/nutritionCalc';

// Loads plan, sheet and overview of the patient together.
const loadGoalsData = async (patientId) => {
  const [plan, sheet, overview] = await Promise.all([getPlan(patientId), getSheet(patientId), getOverview(patientId)]);
  return { plan, sheet, overview };
};

// Macro targets from the goals and the patient weight, null while the target or weight is missing.
const computeMacros = (goals, weightKg) => {
  if (goals.kcalTarget == null || !weightKg) return null;
  return macroTargets({ ...goals, kcal: goals.kcalTarget }, weightKg);
};

// Editor of the goals: energy card (sheet, protocol, routine, activities, objective) and macro targets card.
const GoalsEditor = ({ patient, plan, initialSheet, trainerName }) => {
  const { showToast } = useToast();
  const [goals, setGoals] = useState(plan.goals);
  const [sheet, setSheet] = useState(initialSheet);
  const [editingSheet, setEditingSheet] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const autosave = usePlanAutosave({ value: goals, save: (value) => patchGoals(plan.id, value) });
  const panel = buildEnergyPanel(goals, sheet);
  const macros = computeMacros(goals, sheet.weightKg);
  const setGoal = (key) => (value) => setGoals((prev) => ({ ...prev, [key]: value }));

  const handleSaveSheet = async (body) => {
    setSavingSheet(true);
    try {
      setSheet(await saveSheet(patient.id, body));
      setEditingSheet(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSavingSheet(false);
    }
  };

  return (
    <PrescriptionLayout
      step="goals"
      patient={{ ...patient, weightKg: sheet.weightKg ?? patient.weightKg }}
      plan={plan}
      title="Metas e gasto energético"
      subtitle="O GET sugere a meta calórica. Os macros em g/kg viram gramas e kcal na hora."
      saveStatusText={autosave.statusText}
      saveStatus={autosave.status}
      onRetrySave={autosave.retry}
      onBeforeNavigate={autosave.flush}
    >
      <div className="goals-board">
        <EnergyCard
          goals={goals}
          sheet={sheet}
          panel={panel}
          sheetComplete={isSheetComplete(sheet)}
          trainerName={trainerName}
          onGoalChange={setGoal}
          onEditSheet={() => setEditingSheet(true)}
        />
        <MacroTargetsCard goals={goals} macros={macros} weightKg={sheet.weightKg} suggestion={panel?.suggestion} onChange={setGoals} />
      </div>
      {editingSheet && (
        <EditSheetModal sheet={sheet} submitting={savingSheet} onClose={() => setEditingSheet(false)} onSubmit={handleSaveSheet} />
      )}
    </PrescriptionLayout>
  );
};

GoalsEditor.propTypes = {
  patient: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  initialSheet: PropTypes.object.isRequired,
  trainerName: PropTypes.string,
};

/** Prescrição 1 · Metas e gasto energético, with live calculation and autosave. */
const PrescriptionGoals = () => {
  const { patientId } = useParams();
  const resource = useLoadResource(() => loadGoalsData(patientId), patientId);
  const { data } = resource;

  return (
    <LoadState loading={resource.loading} error={resource.error} onRetry={resource.reload}>
      {data && (
        <GoalsEditor
          patient={data.overview.patient}
          plan={data.plan}
          initialSheet={data.sheet}
          trainerName={data.overview.trainer?.firstName}
        />
      )}
    </LoadState>
  );
};

export default PrescriptionGoals;

import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getOverview, getPlan } from '../../api/nutrition';
import useLoadResource from '../../hooks/useLoadResource';
import useMenuEditor, { sortByOrder } from '../../hooks/useMenuEditor';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import AddMealModal from '../../components/nutrition/AddMealModal';
import DayGoalTiles from '../../components/nutrition/DayGoalTiles';
import DaySummaryTable from '../../components/nutrition/DaySummaryTable';
import LoadState from '../../components/nutrition/LoadState';
import MealSection from '../../components/nutrition/MealSection';
import PrescriptionLayout from '../../components/nutrition/PrescriptionLayout';
import VetDistribution from '../../components/nutrition/VetDistribution';
import { dayTotals } from '../../utils/nutritionCalc';
import { buildDayGoals, withDraftQuantities } from '../../utils/planView';

const SUBTITLE = 'Muda a quantidade de qualquer item e os totais se ajustam na hora.';

// Loads the plan and the patient overview together; a missing overview only drops the patient details.
const loadMenuData = async (patientId) => {
  const [plan, overview] = await Promise.all([getPlan(patientId), getOverview(patientId).catch(() => null)]);
  return { plan, overview };
};

// Picks the option shown for a meal: the chosen one if it still exists, else option 1.
const resolveOption = (meal, activeOptions) =>
  meal.options.find((option) => option.id === activeOptions[meal.id]) ?? meal.options[0];

// Body weight for g/kg figures: the patient's, else the weight the protein target was computed from.
const resolveWeightKg = (plan, patient) => {
  if (patient?.weightKg > 0) return patient.weightKg;
  const perKg = plan.goals.proteinPerKg;
  const grams = plan.computed?.macros?.protein?.grams;
  return perKg > 0 && grams > 0 ? grams / perKg : null;
};

// Whether a click is a plain left click (modified clicks keep the browser behaviour).
const isPlainClick = (event) => event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

// Top card: day totals against the goals, the VET distribution and the way back to the goals.
const SummaryCard = ({ goalsPath, onBeforeNavigate, totals, goals, macros, weightKg }) => {
  const navigate = useNavigate();

  // why: leaving the step must wait for the pending autosave, and stay on the page when it fails.
  const handleEditGoals = async (event) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
    event.preventDefault();
    if (await onBeforeNavigate()) navigate(goalsPath);
  };

  return (
    <section className="menu-summary" aria-label="Resumo contra as metas">
      <header className="menu-summary__header">
        <div>
          <h2 className="menu-summary__title">Total do dia contra as metas</h2>
          <p className="menu-summary__subtitle">Metas da etapa 1 · tolerância de 5% · considera a opção 1 de cada refeição</p>
        </div>
        <Link to={goalsPath} className="btn btn--secondary menu-caps" onClick={handleEditGoals}>Editar metas</Link>
      </header>
      <DayGoalTiles totals={totals} goals={goals} weightKg={weightKg} />
      <VetDistribution totals={totals} macros={macros} />
    </section>
  );
};

SummaryCard.propTypes = {
  goalsPath: PropTypes.string.isRequired,
  onBeforeNavigate: PropTypes.func.isRequired,
  totals: PropTypes.object.isRequired,
  goals: PropTypes.object.isRequired,
  macros: PropTypes.object,
  weightKg: PropTypes.number,
};

// Column header of the one table that holds every meal.
const MenuTableHead = () => (
  <thead>
    <tr>
      <th scope="col" className="menu-table__col-food">Alimento</th>
      <th scope="col" className="menu-table__col-qty">Quantidade</th>
      <th scope="col" className="menu-table__col-num">Energia{' '}<span>kcal</span></th>
      <th scope="col" className="menu-table__col-num">PTN{' '}<span>g</span></th>
      <th scope="col" className="menu-table__col-num">CHO{' '}<span>g</span></th>
      <th scope="col" className="menu-table__col-num">LIP{' '}<span>g</span></th>
      <th scope="col" className="menu-table__col-num">Fibras{' '}<span>g</span></th>
      <th scope="col" className="menu-table__col-remove"><span className="visually-hidden">Ações</span></th>
    </tr>
  </thead>
);

// Editor of the menu: day summary, one table with every meal and its options, inline search and quantity autosave.
const MenuEditor = ({ patientId, initialPlan, patient }) => {
  const { plan, drafts, autosave, activeOptions, handlers, dialogProps, mealActions } = useMenuEditor(initialPlan);
  const meals = withDraftQuantities(sortByOrder(plan.meals), drafts);
  const totals = dayTotals(meals);
  const goals = buildDayGoals(plan);
  const planPath = `/nutritionist/patients/${patientId}/plan`;

  return (
    <PrescriptionLayout
      step="menu"
      patient={{ id: patientId, ...patient }}
      plan={plan}
      title="Cardápio"
      subtitle={SUBTITLE}
      saveStatusText={autosave.statusText}
      onBeforeNavigate={autosave.flush}
    >
      <SummaryCard
        goalsPath={`${planPath}/goals`}
        onBeforeNavigate={autosave.flush}
        totals={totals}
        goals={goals}
        macros={plan.computed?.macros}
        weightKg={resolveWeightKg(plan, patient)}
      />
      {autosave.status === 'error' && (
        <div className="menu-save-error" role="alert">
          <button type="button" className="btn btn--secondary menu-caps" onClick={autosave.retry}>Tentar novamente</button>
        </div>
      )}
      {meals.length === 0 ? (
        <p className="type-body menu-empty">Nenhuma refeição no plano ainda. Use “Adicionar refeição” para começar.</p>
      ) : (
        <section className="menu-table-card" aria-label="Tabela por refeição">
          <div className="menu-table-card__scroll">
            <table className="menu-table">
              <MenuTableHead />
              {meals.map((meal, index) => (
                <MealSection
                  key={meal.id}
                  meal={meal}
                  option={resolveOption(meal, activeOptions)}
                  dayKcal={totals.kcal}
                  position={{ isFirst: index === 0, isLast: index === meals.length - 1 }}
                  quantityTexts={drafts}
                  handlers={handlers}
                />
              ))}
              <DaySummaryTable totals={totals} goals={goals} />
            </table>
          </div>
        </section>
      )}
      <button type="button" className="menu-add-meal" onClick={handlers.onAddMeal}>
        <Plus size={18} strokeWidth={2} aria-hidden="true" />
        Adicionar refeição
      </button>
      <p className="menu-footnote">
        Composição por 100 g da TACO (4ª ed., NEPA/Unicamp) ou da TBCA (FoRC/USP), conforme a fonte marcada em cada item, ajustada pela quantidade. Meus alimentos usam a composição cadastrada pela nutri.
      </p>
      {mealActions.editingMeal && (
        <AddMealModal
          meal={mealActions.editingMeal}
          submitting={mealActions.savingMeal}
          onClose={() => mealActions.setEditingMeal(null)}
          onSubmit={mealActions.saveMeal}
        />
      )}
      {mealActions.addingMeal && (
        <AddMealModal
          submitting={mealActions.savingMeal}
          onClose={() => mealActions.setAddingMeal(false)}
          onSubmit={mealActions.createMeal}
        />
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </PrescriptionLayout>
  );
};

MenuEditor.propTypes = {
  patientId: PropTypes.string.isRequired,
  initialPlan: PropTypes.object.isRequired,
  patient: PropTypes.object,
};

/** Prescrição 2 · Cardápio: meals, options, items and live totals against the goals. */
const PrescriptionMenu = () => {
  const { patientId } = useParams();
  const resource = useLoadResource(() => loadMenuData(patientId), patientId);

  return (
    <LoadState loading={resource.loading} error={resource.error} onRetry={resource.reload}>
      {resource.data && <MenuEditor patientId={patientId} initialPlan={resource.data.plan} patient={resource.data.overview?.patient} />}
    </LoadState>
  );
};

export default PrescriptionMenu;

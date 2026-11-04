import { useEffect, useRef, useState } from 'react';
import {
  addItem,
  addMeal,
  addOption,
  deleteItem,
  deleteMeal,
  deleteOption,
  patchItem,
  patchMeal,
  reorderMeals,
} from '../api/nutrition';
import { quantityMap } from '../utils/planView';
import useConfirmDialog from './useConfirmDialog';
import usePlanAutosave from './usePlanAutosave';
import usePlanMutation from './usePlanMutation';

const INVALID_QUANTITY_MESSAGE = 'Corrija as quantidades destacadas (maiores que zero).';

// Ids of every item in the plan.
const itemIdsOf = (plan) => new Set(Object.keys(quantityMap(plan)));

// Typed quantities of known items as numbers ('' counts as 0, so invalid ones stay visible to the autosave).
const toTypedQuantities = (drafts, knownIds) => Object.fromEntries(
  Object.entries(drafts)
    .filter(([itemId]) => knownIds.has(itemId))
    .map(([itemId, raw]) => [itemId, raw === '' ? 0 : Number(raw)]),
);

// Meals in plan order.
export const sortByOrder = (meals) => [...meals].sort((a, b) => a.order - b.order);

// Draft quantities of the menu plus their autosave; invalid quantities make the save fail instead of reporting "Salvo".
const useQuantityDrafts = (plan, runMutation) => {
  const [drafts, setDrafts] = useState({});
  const savedQuantities = useRef(quantityMap(plan));
  const knownIds = useRef(itemIdsOf(plan));

  useEffect(() => {
    knownIds.current = itemIdsOf(plan);
  });

  const saveQuantities = async (values) => {
    const entries = Object.entries(values).filter(([itemId]) => knownIds.current.has(itemId));
    if (entries.some(([, quantity]) => !(quantity > 0))) throw Object.assign(new Error('invalid quantity'), { userMessage: INVALID_QUANTITY_MESSAGE });
    for (const [itemId, quantity] of entries) {
      if (savedQuantities.current[itemId] === quantity) continue;
      await runMutation.applyLatest(() => patchItem(itemId, { quantity }));
      savedQuantities.current[itemId] = quantity;
    }
  };

  const autosave = usePlanAutosave({ value: toTypedQuantities(drafts, itemIdsOf(plan)), save: saveQuantities });
  const setQuantity = (itemId, raw) => setDrafts((prev) => ({ ...prev, [itemId]: raw }));
  const dropDraft = (itemId) => setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== itemId)));

  return { drafts, autosave, setQuantity, dropDraft };
};

// Meal-level actions: create, edit, delete (confirmed), reorder and option removal (confirmed).
const useMealActions = (plan, runMutation, requestConfirm) => {
  const [editingMeal, setEditingMeal] = useState(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  const saveMeal = async (body) => {
    setSavingMeal(true);
    const updated = await runMutation(() => patchMeal(editingMeal.id, body));
    setSavingMeal(false);
    if (updated) setEditingMeal(null);
  };

  const createMeal = async (body) => {
    setSavingMeal(true);
    const updated = await runMutation(() => addMeal(plan.id, body));
    setSavingMeal(false);
    if (updated) setAddingMeal(false);
  };

  const confirmDeleteMeal = (meal) => requestConfirm({
    message: `Excluir a refeição "${meal.name}"? Os alimentos dela saem do plano.`,
    confirmLabel: 'Excluir refeição',
    onConfirm: () => runMutation.applyLatest(() => deleteMeal(meal.id)),
  });

  const confirmRemoveOption = (option) => requestConfirm({
    message: `Remover a opção ${option.position}? Os alimentos dela saem do plano.`,
    confirmLabel: 'Remover opção',
    busyLabel: 'Removendo…',
    onConfirm: () => runMutation.applyLatest(() => deleteOption(option.id)),
  });

  const moveMeal = (meal, direction) => {
    const ids = sortByOrder(plan.meals).map((item) => item.id);
    const from = ids.indexOf(meal.id);
    ids.splice(from, 1);
    ids.splice(from + direction, 0, meal.id);
    return runMutation(() => reorderMeals(plan.id, ids));
  };

  return { editingMeal, addingMeal, savingMeal, setEditingMeal, setAddingMeal, saveMeal, createMeal, confirmDeleteMeal, confirmRemoveOption, moveMeal };
};

// State and handlers of the menu step: plan, drafts, autosave, active options and meal actions.
const useMenuEditor = (initialPlan) => {
  const [plan, setPlan] = useState(initialPlan);
  const [activeOptions, setActiveOptions] = useState({});
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const runMutation = usePlanMutation(setPlan);
  const quantities = useQuantityDrafts(plan, runMutation);
  const mealActions = useMealActions(plan, runMutation, requestConfirm);

  const addOptionTo = async (meal) => {
    const knownOptionIds = new Set(meal.options.map((option) => option.id));
    const updated = await runMutation(() => addOption(meal.id));
    const newest = updated?.meals.find((item) => item.id === meal.id)?.options.find((option) => !knownOptionIds.has(option.id));
    if (newest) setActiveOptions((prev) => ({ ...prev, [meal.id]: newest.id }));
  };

  const removeItem = async (item) => {
    if (await runMutation(() => deleteItem(item.id))) quantities.dropDraft(item.id);
  };

  const handlers = {
    onAddFood: async (option, food) => Boolean(await runMutation(() => addItem(option.id, { foodId: food.id }))),
    onSelectOption: (mealId, optionId) => setActiveOptions((prev) => ({ ...prev, [mealId]: optionId })),
    onQuantityChange: quantities.setQuantity,
    onRemoveItem: removeItem,
    onAddOption: addOptionTo,
    onAddMeal: () => mealActions.setAddingMeal(true),
    onRemoveOption: mealActions.confirmRemoveOption,
    onEditMeal: mealActions.setEditingMeal,
    onDeleteMeal: mealActions.confirmDeleteMeal,
    onMoveMeal: mealActions.moveMeal,
  };

  return { plan, drafts: quantities.drafts, autosave: quantities.autosave, activeOptions, handlers, dialogProps, mealActions };
};

export default useMenuEditor;

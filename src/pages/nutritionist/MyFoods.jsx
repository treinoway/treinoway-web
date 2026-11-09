import PropTypes from 'prop-types';
import { useState } from 'react';
import { Plus, Salad } from 'lucide-react';
import { createMyFood, deleteMyFood, listFoodGroups, listMyFoods, updateMyFood } from '../../api/nutrition';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLoadResource from '../../hooks/useLoadResource';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import RowMenu from '../../components/RowMenu';
import LoadState from '../../components/nutrition/LoadState';
import MyFoodModal from '../../components/nutrition/MyFoodModal';
import { formatDecimal, formatInteger } from '../../utils/nutritionFormat';

// Loads the nutritionist foods and the food groups for the form.
const loadFoodsAndGroups = async () => {
  const [foods, groups] = await Promise.all([listMyFoods(), listFoodGroups()]);
  return { foods: foods.items, groups: groups.items };
};

// One own food: identity, per-100 g values and the row menu.
const FoodRow = ({ food, onEdit, onDelete }) => (
  <tr>
    <td>
      <div className="patient-row__text">
        <span className="patient-row__name type-h4">{food.name}</span>
        <span className="patient-row__meta type-caption">
          <span>{food.groupName}</span>
          {food.portion && <span>{food.portion.label} ({food.portion.grams} g)</span>}
        </span>
      </div>
    </td>
    <td data-label="kcal">{formatInteger(food.per100g.kcal)}</td>
    <td data-label="PTN">{formatDecimal(food.per100g.protein)}</td>
    <td data-label="CHO">{formatDecimal(food.per100g.carbs)}</td>
    <td data-label="LIP">{formatDecimal(food.per100g.fat)}</td>
    <td data-label="Fibras">{formatDecimal(food.per100g.fiber)}</td>
    <td>
      <RowMenu ariaLabel={`Ações de ${food.name}`} onEdit={() => onEdit(food)} onDelete={() => onDelete(food)} />
    </td>
  </tr>
);

FoodRow.propTypes = {
  food: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/** Meus alimentos: the nutritionist own foods, searchable next to TACO and TBCA in the menu. */
const MyFoods = () => {
  const { showToast } = useToast();
  const resource = useLoadResource(loadFoodsAndGroups, 'foods');
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const foods = resource.data?.foods ?? [];
  const groups = resource.data?.groups ?? [];
  const isEmpty = !resource.loading && !resource.error && foods.length === 0;

  const handleSave = async (body) => {
    setSaving(true);
    try {
      await (editing.id ? updateMyFood(editing.id, body) : createMyFood(body));
      setEditing(null);
      await resource.reload({ silent: true });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (food) => requestConfirm({
    message: `Excluir "${food.name}"? Esta ação não pode ser desfeita.`,
    onConfirm: async () => {
      await deleteMyFood(food.id);
      await resource.reload({ silent: true });
    },
  });

  const openCreate = () => setEditing({});

  const table = (
    <section className="nutri-card nutri-card--table">
      <table className="data-table data-table--nutrition nutri-table">
        <thead>
          <tr>
            <th>Alimento</th>
            <th>kcal</th>
            <th>PTN</th>
            <th>CHO</th>
            <th>LIP</th>
            <th>Fibras</th>
            <th><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>{foods.map((food) => <FoodRow key={food.id} food={food} onEdit={setEditing} onDelete={handleDelete} />)}</tbody>
      </table>
    </section>
  );

  return (
    <div className="nutri-page">
      <LibraryPageHeader
        icon={Salad}
        title="Meus alimentos"
        actions={!isEmpty && (
          <button type="button" className="btn btn--primary nutri-caps" onClick={openCreate}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Cadastrar alimento
          </button>
        )}
      />
      <p className="type-body my-foods__hint">Valores por 100 g. Eles aparecem na busca do cardápio como Meus alimentos.</p>
      <LoadState loading={resource.loading} error={resource.error} onRetry={resource.reload}>
        {isEmpty
          ? <EmptyBlock icon={Salad} title="Nenhum alimento cadastrado" description="Cadastre os alimentos que não estão na TACO ou na TBCA." actionLabel="Cadastrar alimento" onAction={openCreate} />
          : table}
      </LoadState>
      {editing && (
        <MyFoodModal
          food={editing.id ? editing : null}
          groups={groups}
          submitting={saving}
          onClose={() => setEditing(null)}
          onSubmit={handleSave}
        />
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default MyFoods;

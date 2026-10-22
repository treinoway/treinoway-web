import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Loader, Search } from 'lucide-react';
import useExerciseTemplateSearch from '../../hooks/useExerciseTemplateSearch';
import { getExerciseTypeLabel } from '../../constants/exerciseTypes';

const isSameId = (a, b) => String(a) === String(b);

const getTypeLabel = (exercise) =>
  exercise.typeLabel || (exercise.type ? getExerciseTypeLabel(exercise.type) : null);

/**
 * Searchable combobox over the trainer's exercise library. Empty query lists
 * `initialExercises`; typing runs the debounced server search (full library).
 * Selecting an option calls `onSelect(exercise)`; already-added ones are disabled.
 */
const ExerciseTemplateSearchPicker = ({ initialExercises, addedIds = [], disabled = false, onSelect }) => {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const { results, staleResults, searching, showSpinner, query, setQuery } = useExerciseTemplateSearch(initialExercises);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const hasQuery = query.trim().length > 0;
  const options = hasQuery ? (searching ? (staleResults ?? results ?? []) : (results ?? [])) : initialExercises;
  const isAdded = (exercise) => addedIds.some((id) => isSameId(id, exercise.id));
  const optionId = (exercise) => `${baseId}-option-${exercise.id}`;
  const activeOption = open && activeIndex >= 0 ? options[activeIndex] : null;
  const emptyMessage = hasQuery ? 'Nenhum exercício encontrado' : 'Biblioteca vazia';

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleSelect = (exercise) => {
    if (isAdded(exercise)) return;
    onSelect(exercise);
    setQuery('');
    close();
  };

  const handleChange = (event) => {
    setQuery(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const moveActive = (step) => {
    if (options.length === 0) return;
    setOpen(true);
    setActiveIndex((prev) => (prev < 0 && step < 0 ? options.length - 1 : (prev + step + options.length) % options.length));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter' && activeOption) {
      event.preventDefault();
      handleSelect(activeOption);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  return (
    <div className="field exercise-search-picker" onBlur={handleBlur}>
      <label className="field-label type-caption-strong" htmlFor={`${baseId}-input`}>
        Adicionar exercício
      </label>
      <div className="input--search-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          id={`${baseId}-input`}
          className="input input--search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
          autoComplete="off"
          placeholder="Buscar exercício na biblioteca…"
          value={query}
          disabled={disabled}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {showSpinner && (
          <Loader size={16} strokeWidth={2} aria-hidden="true" className="library-refetch-spinner" />
        )}
      </div>

      <div className="exercise-search-picker__popover" hidden={!open}>
        <ul id={listboxId} role="listbox" aria-label="Exercícios da biblioteca" className="exercise-search-picker__list">
          {options.map((exercise, index) => {
            const added = isAdded(exercise);
            const typeLabel = getTypeLabel(exercise);
            const classes = ['library-item', 'exercise-search-picker__option'];
            if (index === activeIndex) classes.push('exercise-search-picker__option--active');
            return (
              <li
                key={exercise.id}
                id={optionId(exercise)}
                role="option"
                aria-selected={index === activeIndex}
                aria-disabled={added || undefined}
                className={classes.join(' ')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(exercise)}
              >
                <span className="library-item-body">
                  <span className="library-item-name type-body-strong">{exercise.name}</span>
                  {typeLabel && <span className="library-item-meta type-caption">{typeLabel}</span>}
                </span>
                {added && (
                  <span className="exercise-search-picker__added type-caption">
                    <Check size={12} strokeWidth={2} aria-hidden="true" />
                    Adicionado
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {options.length === 0 && (
          <div className="library-empty type-body" role="status">
            {showSpinner ? 'Buscando…' : emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

ExerciseTemplateSearchPicker.propTypes = {
  initialExercises: PropTypes.arrayOf(PropTypes.object).isRequired,
  addedIds: PropTypes.array,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

export default ExerciseTemplateSearchPicker;

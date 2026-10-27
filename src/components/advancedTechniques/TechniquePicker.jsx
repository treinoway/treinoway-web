import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Loader, Search } from 'lucide-react';
import useAdvancedTechniqueSearch from '../../hooks/useAdvancedTechniqueSearch';

// Message under the options while loading, failed or empty (null when there are options).
const getStatusMessage = ({ status, error, count }) => {
  if (status === 'error') return error;
  if (status === 'loading' && count === 0) return 'Buscando…';
  if (status === 'ready' && count === 0) return 'Nenhuma técnica encontrada.';
  return null;
};

// One selectable technique (name + description), disabled once already in the list.
const TechniqueOption = ({ id, technique, active, added, onPick }) => (
  <li
    id={id}
    role="option"
    aria-selected={active}
    aria-disabled={added || undefined}
    className={`library-item exercise-search-picker__option${active ? ' exercise-search-picker__option--active' : ''}`}
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => onPick(technique)}
  >
    <span className="library-item-body">
      <span className="library-item-name type-body-strong">{technique.name}</span>
      <span className="technique-option__description type-caption">{technique.description}</span>
    </span>
    {added && (
      <span className="exercise-search-picker__added type-caption">
        <Check size={12} strokeWidth={2} aria-hidden="true" />
        Adicionado
      </span>
    )}
  </li>
);

TechniqueOption.propTypes = {
  id: PropTypes.string.isRequired,
  technique: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  added: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

// Searchable technique combobox (lazy fetch on first focus); `addedIds` are shown as unavailable.
const TechniquePicker = ({ addedIds, disabled = false, onSelect }) => {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const { query, setQuery, activate, status, results, error } = useAdvancedTechniqueSearch();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const activeOption = open && activeIndex >= 0 ? results[activeIndex] : null;
  const statusMessage = getStatusMessage({ status, error, count: results.length });

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleOpen = () => {
    activate();
    setOpen(true);
  };

  const handleSelect = (technique) => {
    if (addedIds.includes(technique.id)) return;
    onSelect(technique);
    setQuery('');
    close();
  };

  const handleChange = (event) => {
    setQuery(event.target.value);
    setActiveIndex(-1);
    handleOpen();
  };

  const moveActive = (step) => {
    if (results.length === 0) return;
    handleOpen();
    setActiveIndex((prev) => (prev < 0 && step < 0 ? results.length - 1 : (prev + step + results.length) % results.length));
  };

  const handleKeyDown = (event) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step) {
      event.preventDefault();
      moveActive(step);
    } else if (event.key === 'Enter') {
      // why: the picker sits inside the host <form>; Enter must never submit it
      event.preventDefault();
      if (activeOption) handleSelect(activeOption);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
    }
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  return (
    <div className="exercise-search-picker" onBlur={handleBlur}>
      <div className="input--search-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          className="input input--search"
          type="text"
          role="combobox"
          aria-label="Buscar técnica avançada"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${baseId}-option-${activeOption.id}` : undefined}
          autoComplete="off"
          placeholder="Buscar técnica avançada…"
          value={query}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleOpen}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
        />
        {status === 'loading' && results.length > 0 && (
          <Loader size={16} strokeWidth={2} aria-hidden="true" className="library-refetch-spinner" />
        )}
      </div>

      <div className="exercise-search-picker__popover" hidden={!open}>
        <ul id={listboxId} role="listbox" aria-label="Técnicas avançadas" className="exercise-search-picker__list">
          {results.map((technique, index) => (
            <TechniqueOption
              key={technique.id}
              id={`${baseId}-option-${technique.id}`}
              technique={technique}
              active={index === activeIndex}
              added={addedIds.includes(technique.id)}
              onPick={handleSelect}
            />
          ))}
        </ul>
        {statusMessage && <div className="library-empty type-body" role="status">{statusMessage}</div>}
      </div>
    </div>
  );
};

TechniquePicker.propTypes = {
  addedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

export default TechniquePicker;

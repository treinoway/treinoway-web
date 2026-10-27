import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { getExerciseTypeLabel } from '../../constants/exerciseTypes';
import useExerciseTemplateSearch from '../../hooks/useExerciseTemplateSearch';

// Lowercases and strips accents so "elevacao" matches "Elevação".
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Instant client-side matches first, then server-only matches (deduped by id).
const mergeResults = (templates, serverResults, query) => {
  const needle = normalize(query.trim());
  const local = templates.filter((template) => normalize(template.name || '').includes(needle));
  const localIds = new Set(local.map((template) => template.id));
  return [...local, ...(serverResults ?? []).filter((template) => !localIds.has(template.id))];
};

// Next active index for an arrow key, wrapping around the list.
const stepIndex = (current, step, length) => (current + step + length) % length;

// One selectable library option (name + type).
const TemplateOption = ({ id, template, active, onPick }) => (
  <li
    id={id}
    role="option"
    aria-selected={active}
    className={`template-combobox__option${active ? ' template-combobox__option--active' : ''}`}
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => onPick(template)}
  >
    <span className="template-combobox__name type-body-strong">{template.name}</span>
    {template.type && <span className="template-combobox__type type-caption">{getExerciseTypeLabel(template.type)}</span>}
  </li>
);

TemplateOption.propTypes = {
  id: PropTypes.string.isRequired,
  template: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

// Searchable library combobox (WAI-ARIA): filters templates client-side and reports the picked one.
const TemplateSearchCombobox = ({ templates, onPick }) => {
  const baseId = useId();
  const inputRef = useRef(null);
  const listId = `${baseId}-list`;
  const { query, setQuery, results: serverResults, searching } = useExerciseTemplateSearch(templates);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = useMemo(
    () => mergeResults(templates, serverResults, query),
    [templates, serverResults, query]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeId = open && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  const handleChange = (event) => {
    setQuery(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      onPick(results[activeIndex]);
      return;
    }
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step || results.length === 0) return;
    event.preventDefault();
    setOpen(true);
    setActiveIndex((current) => (current < 0 && step < 0 ? results.length - 1 : stepIndex(current, step, results.length)));
  };

  return (
    <div className="template-combobox">
      <div className="input--search-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          ref={inputRef}
          className="input input--search"
          type="text"
          role="combobox"
          aria-label="Buscar na biblioteca"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeId}
          placeholder="Buscar exercício na biblioteca…"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <p
        className={`type-body${open && results.length === 0 ? ' template-combobox__empty' : ''}`}
        role="status"
        aria-live="polite"
      >
        {open && results.length === 0 && (searching ? 'Buscando…' : 'Nenhum exercício encontrado.')}
      </p>
      <ul id={listId} role="listbox" aria-label="Exercícios da biblioteca" className="template-combobox__list" hidden={!open || results.length === 0}>
        {open && results.map((template, index) => (
          <TemplateOption
            key={template.id}
            id={`${baseId}-opt-${index}`}
            template={template}
            active={index === activeIndex}
            onPick={onPick}
          />
        ))}
      </ul>
    </div>
  );
};

TemplateSearchCombobox.propTypes = {
  templates: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPick: PropTypes.func.isRequired,
};

export default TemplateSearchCombobox;

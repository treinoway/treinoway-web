import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { listFoodGroups, searchFoods } from '../../api/nutrition';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useLoadResource from '../../hooks/useLoadResource';
import FoodSearchCombobox from '../ds/FoodSearchCombobox';

const SEARCH_DEBOUNCE_MS = 250;

// Link shown when the search finds nothing: the nutritionist can register the food.
const MyFoodsLink = () => (
  <Link to="/nutritionist/foods" className="btn btn--ghost">Meus alimentos</Link>
);

// Owns the search state (text, group, requests) around the DS food combobox.
const FoodSearchPanel = ({ onPick, onClose, heading }) => {
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState(null);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const groups = useLoadResource(listFoodGroups, 'groups');
  const results = useLoadResource(
    () => searchFoods({ q: debouncedQuery.trim(), groupId }),
    `${debouncedQuery}|${groupId}`,
  );

  return (
    <FoodSearchCombobox
      foods={results.data?.items ?? []}
      groups={groups.data?.items ?? []}
      loading={results.loading}
      query={query}
      onQueryChange={setQuery}
      groupId={groupId}
      onGroupChange={setGroupId}
      onPick={onPick}
      onClose={onClose}
      emptyAction={<MyFoodsLink />}
      heading={heading}
    />
  );
};

FoodSearchPanel.propTypes = {
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  heading: PropTypes.string,
};

export default FoodSearchPanel;

import PropTypes from 'prop-types';
import { ClipboardList, Dumbbell, ListPlus, SlidersHorizontal, TrendingUp, UserPlus } from 'lucide-react';
import Badge from '../ds/Badge';
import { t } from '../../i18n';

const GROUPS = [
  {
    key: 'create',
    cards: [
      { key: 'routine', Icon: ClipboardList },
      { key: 'workout', Icon: Dumbbell },
      { key: 'exercise', Icon: ListPlus },
    ],
  },
  {
    key: 'track',
    cards: [
      { key: 'apply', Icon: UserPlus },
      { key: 'adjust', Icon: SlidersHorizontal },
      { key: 'analyze', Icon: TrendingUp },
    ],
  },
];

// One starter card: the title is the button that fills the composer with the card prompt.
const CreateCard = ({ groupKey, cardKey, Icon, onSelect }) => {
  const copy = t(`iArnold.create.${groupKey}.${cardKey}`);
  return (
    <li className="ai-create-card">
      <span className="ai-create-card__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <Badge tone="neutral" variant="tag">{copy.eyebrow}</Badge>
      <h3 className="type-h4">
        <button type="button" className="ai-create-card__action" onClick={() => onSelect(copy.prompt)}>
          {copy.title}
        </button>
      </h3>
      <p className="type-body ai-create-card__description">{copy.description}</p>
      <span className="type-caption ai-create-card__hint">{copy.hint}</span>
    </li>
  );
};

CreateCard.propTypes = {
  groupKey: PropTypes.string.isRequired,
  cardKey: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
  onSelect: PropTypes.func.isRequired,
};

// One titled group of starter cards.
const CreateGroup = ({ group, onSelect }) => (
  <section className="ai-create__group" aria-labelledby={`ai-create-${group.key}`}>
    <div className="ai-create__header">
      <h2 id={`ai-create-${group.key}`} className="type-h3">{t(`iArnold.chat.groups.${group.key}.title`)}</h2>
      <span className="type-caption ai-create__subtitle">{t(`iArnold.chat.groups.${group.key}.subtitle`)}</span>
    </div>
    <ul className="ai-create__grid">
      {group.cards.map(({ key, Icon }) => (
        <CreateCard key={key} groupKey={group.key} cardKey={key} Icon={Icon} onSelect={onSelect} />
      ))}
    </ul>
  </section>
);

CreateGroup.propTypes = {
  group: PropTypes.shape({
    key: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired, Icon: PropTypes.elementType.isRequired })).isRequired,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
};

// Starter cards of the empty chat, in two sections; selecting one hands its prompt to onSelect.
const CreateCards = ({ onSelect }) => (
  <div className="ai-create">
    {GROUPS.map((group) => (
      <CreateGroup key={group.key} group={group} onSelect={onSelect} />
    ))}
  </div>
);

CreateCards.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default CreateCards;

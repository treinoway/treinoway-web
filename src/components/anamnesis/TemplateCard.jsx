import { useId } from 'react';
import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { formatQuestionCount, getTemplateCategoryLabel } from '../../utils/anamnesisTemplates';

/**
 * One anamnesis template in the "Usar um modelo" gallery: title, category tag,
 * description and question count, with "Pré-visualizar" and "Usar este modelo".
 * The time estimate lives in the preview, the only place with the questions.
 */
const TemplateCard = ({ template, onPreview, onUse, using = false, disabled = false }) => {
  const titleId = useId();
  const categoryLabel = getTemplateCategoryLabel(template);
  const questionCountLabel = formatQuestionCount(template.questionCount);
  const actionsDisabled = using || disabled;

  return (
    <article className="anamnesis-template-card" aria-labelledby={titleId}>
      <div className="anamnesis-template-card__header">
        <h3 id={titleId} className="anamnesis-template-card__title type-h4">{template.title}</h3>
        {categoryLabel && <Badge variant="tag">{categoryLabel}</Badge>}
      </div>
      {template.description && (
        <p className="anamnesis-template-card__description type-body">{template.description}</p>
      )}
      {questionCountLabel && (
        <p className="anamnesis-template-card__meta type-caption">{questionCountLabel}</p>
      )}
      <div className="anamnesis-template-card__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onPreview(template)}
          disabled={actionsDisabled}
        >
          Pré-visualizar
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onUse(template)}
          disabled={actionsDisabled}
        >
          {using ? 'Carregando...' : 'Usar este modelo'}
        </button>
      </div>
    </article>
  );
};

TemplateCard.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    category: PropTypes.string,
    categoryLabel: PropTypes.string,
    questionCount: PropTypes.number,
  }).isRequired,
  onPreview: PropTypes.func.isRequired,
  onUse: PropTypes.func.isRequired,
  using: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default TemplateCard;

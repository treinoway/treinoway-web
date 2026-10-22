import PropTypes from 'prop-types';
import { Eye } from 'lucide-react';
import Badge from '../ds/Badge';

const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

const countQuestions = (anamnesis) =>
  (anamnesis.sections ?? []).reduce((total, section) => total + (section.questions ?? []).length, 0);

/** Summary of the anamnesis being sent, with a preview action. */
const AssignTemplateCard = ({ anamnesis, onPreview }) => {
  const sectionCount = (anamnesis.sections ?? []).length;
  return (
    <div className="assign-template">
      <p className="type-overline assign-template__eyebrow">Anamnese selecionada</p>
      <h2 className="type-h3 assign-template__title">{anamnesis.title}</h2>
      <div className="assign-template__meta">
        <Badge tone="neutral" variant="tag">v{anamnesis.version ?? 1}</Badge>
        <span className="type-caption assign-template__counts">
          {pluralize(sectionCount, 'seção', 'seções')} · {pluralize(countQuestions(anamnesis), 'pergunta', 'perguntas')}
        </span>
      </div>
      <button type="button" className="btn btn--secondary" onClick={onPreview}>
        <Eye size={16} strokeWidth={2} aria-hidden="true" />
        Pré-visualizar
      </button>
    </div>
  );
};

AssignTemplateCard.propTypes = {
  anamnesis: PropTypes.shape({
    title: PropTypes.string,
    version: PropTypes.number,
    sections: PropTypes.array,
  }).isRequired,
  onPreview: PropTypes.func.isRequired,
};

export default AssignTemplateCard;

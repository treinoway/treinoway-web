import PropTypes from 'prop-types';
import { getQuestionTypeLabel } from '../../constants/anamnesis';
import { sortByOrder } from '../../utils/anamnesisAnswers';
import { formatQuestionCount } from '../../utils/anamnesisTemplates';

const describeQuestion = (question) =>
  [
    getQuestionTypeLabel(question.type),
    question.required && 'Obrigatória',
    question.parentQuestionId && 'Condicional',
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Read-only outline of an anamnesis: numbered sections, each with its question
 * count and the question texts (type, required and conditional flags).
 */
const AnamnesisOutline = ({ sections }) => {
  const orderedSections = sortByOrder(sections);

  if (orderedSections.length === 0) {
    return <p className="anamnesis-outline__empty type-body">Esta anamnese não possui seções.</p>;
  }

  return (
    <ol className="anamnesis-outline">
      {orderedSections.map((section, index) => {
        const questions = sortByOrder(section.questions);
        return (
          <li key={section.id} className="anamnesis-outline__section">
            <div className="anamnesis-outline__header">
              <span className="accordion-index type-caption-strong" aria-hidden="true">{index + 1}</span>
              <div className="accordion-heading">
                <h3 className="accordion-title type-body-lg-strong">{section.title}</h3>
                <span className="accordion-meta type-caption">{formatQuestionCount(questions.length)}</span>
              </div>
            </div>
            {questions.length > 0 && (
              <ul className="anamnesis-outline__questions">
                {questions.map((question) => (
                  <li key={question.id} className="anamnesis-outline__question">
                    <span className="anamnesis-outline__question-text type-body">{question.text}</span>
                    <span className="anamnesis-outline__question-meta type-caption">{describeQuestion(question)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
};

AnamnesisOutline.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    order: PropTypes.number,
    questions: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string,
      type: PropTypes.string,
      required: PropTypes.bool,
      order: PropTypes.number,
      parentQuestionId: PropTypes.string,
    })),
  })),
};

export default AnamnesisOutline;

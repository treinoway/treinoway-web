import { useState } from 'react';
import PropTypes from 'prop-types';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import OutlineQuestionRow from './OutlineQuestionRow';
import OutlineSectionEditForm from './OutlineSectionEditForm';

const SectionActions = ({ section, onEdit, onDelete }) => (
  <span className="outline-inline-actions" onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      className="outline-inline-action"
      aria-label={`Editar seção ${section.title}`}
      onClick={onEdit}
    >
      <Pencil size={16} strokeWidth={2} aria-hidden="true" />
    </button>
    <button
      type="button"
      className="outline-inline-action outline-inline-action--danger"
      aria-label={`Excluir seção ${section.title}`}
      onClick={() => onDelete(section)}
    >
      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  </span>
);

SectionActions.propTypes = {
  section: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const OutlineSectionItem = ({
  section,
  isActive,
  isGeneral,
  isDragOver,
  isDragging,
  selectedQuestionId,
  gripProps,
  rowProps,
  onSelectSection,
  onSelectQuestion,
  onDeleteSection,
  onEditSection,
  onDeleteQuestion,
}) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <OutlineSectionEditForm
        section={section}
        onSubmit={onEditSection}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const handleKeyDown = (event) => {
    if (!isGeneral) rowProps?.onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onSelectSection(section.id);
  };
  const buttonClasses = [
    'outline-section-btn',
    isActive && 'outline-section-btn--active',
    isDragOver && 'outline-section-btn--drag-over',
    isDragging && 'outline-section-btn--dragging',
  ].filter(Boolean).join(' ');

  return (
    <div className="outline-section-row">
      <div
        role="button"
        tabIndex={0}
        className={buttonClasses}
        onClick={() => onSelectSection(section.id)}
        aria-expanded={isActive}
        {...(isGeneral ? {} : rowProps)}
        onKeyDown={handleKeyDown}
      >
        <span
          className={isGeneral ? 'outline-grip--inert' : 'outline-grip'}
          aria-hidden="true"
          {...(isGeneral ? {} : gripProps)}
        >
          <GripVertical size={16} strokeWidth={2} />
        </span>
        <span className="outline-label type-body-strong">{section.title}</span>
        <span className="outline-count type-caption-strong">{section.questions?.length ?? 0}</span>
        {!isGeneral && (
          <SectionActions section={section} onEdit={() => setEditing(true)} onDelete={onDeleteSection} />
        )}
      </div>
      {isActive && (
        <div className="outline-questions">
          {(section.questions ?? []).map((question) => (
            <OutlineQuestionRow
              key={question.id}
              question={question}
              active={selectedQuestionId === question.id}
              readOnly={isGeneral}
              onSelect={() => onSelectQuestion(question.id, section.id)}
              onDelete={() => onDeleteQuestion(section, question)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

OutlineSectionItem.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    questions: PropTypes.array,
  }).isRequired,
  isActive: PropTypes.bool,
  isGeneral: PropTypes.bool,
  isDragOver: PropTypes.bool,
  isDragging: PropTypes.bool,
  selectedQuestionId: PropTypes.string,
  gripProps: PropTypes.object,
  rowProps: PropTypes.object,
  onSelectSection: PropTypes.func.isRequired,
  onSelectQuestion: PropTypes.func.isRequired,
  onDeleteSection: PropTypes.func.isRequired,
  onEditSection: PropTypes.func.isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
};

export default OutlineSectionItem;

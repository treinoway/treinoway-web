import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import OutlineSectionItem from './editor/OutlineSectionItem';

const NewSectionForm = ({ sectionsEditor }) => {
  const { sectionForm, savingSection, changeSectionTitle, handleAddSection, closeSectionForm } = sectionsEditor;
  return (
    <form onSubmit={handleAddSection} className="outline-section-edit">
      <input
        type="text"
        className="input"
        placeholder="Título da nova seção"
        value={sectionForm.title}
        onChange={(e) => changeSectionTitle(e.target.value)}
        aria-label="Título da seção"
        required
        disabled={savingSection}
      />
      <div className="ds-actions">
        <button type="submit" className="btn btn--primary" disabled={savingSection}>
          {savingSection ? 'Salvando...' : 'Adicionar'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={closeSectionForm} disabled={savingSection}>
          Cancelar
        </button>
      </div>
    </form>
  );
};

NewSectionForm.propTypes = { sectionsEditor: PropTypes.object.isRequired };

const OutlineFooter = ({ sectionsEditor }) => (
  <div className="outline-footer">
    {sectionsEditor.showSectionForm ? (
      <NewSectionForm sectionsEditor={sectionsEditor} />
    ) : (
      <button type="button" className="btn btn--secondary btn--block" onClick={sectionsEditor.openSectionForm}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nova seção
      </button>
    )}
  </div>
);

OutlineFooter.propTypes = { sectionsEditor: PropTypes.object.isRequired };

/** Left panel: sections (draggable) with their questions, plus the "Nova seção" form. */
const AnamnesisOutlinePanel = ({
  sections,
  isGeneral,
  selection,
  sectionsEditor,
  reorder,
  onDeleteQuestion,
}) => (
  <div className="editor-outline">
    <p className="library-section-title type-overline">Seções</p>
    {sections.map((section) => (
      <OutlineSectionItem
        key={section.id}
        section={section}
        isActive={selection.selectedSectionId === section.id}
        isGeneral={isGeneral}
        isDragOver={reorder.dragOverId === section.id}
        selectedQuestionId={selection.selectedQuestionId}
        dragHandlers={reorder.getDragHandlers(section.id)}
        onSelectSection={selection.handleSelectSection}
        onSelectQuestion={selection.handleSelectQuestion}
        onDeleteSection={sectionsEditor.handleDeleteSection}
        onEditSection={sectionsEditor.handleEditSection}
        onDeleteQuestion={onDeleteQuestion}
      />
    ))}
    {!isGeneral && <OutlineFooter sectionsEditor={sectionsEditor} />}
  </div>
);

AnamnesisOutlinePanel.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.object).isRequired,
  isGeneral: PropTypes.bool,
  selection: PropTypes.object.isRequired,
  sectionsEditor: PropTypes.object.isRequired,
  reorder: PropTypes.shape({
    dragOverId: PropTypes.string,
    getDragHandlers: PropTypes.func.isRequired,
  }).isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
};

export default AnamnesisOutlinePanel;

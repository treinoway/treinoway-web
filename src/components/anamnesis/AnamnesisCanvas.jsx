import PropTypes from 'prop-types';
import CanvasQuestionCard from './editor/CanvasQuestionCard';
import CanvasEmptyBoard from './editor/CanvasEmptyBoard';

const QuestionStepper = ({ index, total, onStep }) => (
  <div className="canvas-nav">
    <button type="button" className="btn btn--ghost" onClick={() => onStep(-1)} disabled={index <= 0}>
      ← Anterior
    </button>
    <span className="canvas-nav-counter type-caption" aria-live="polite">
      {index + 1} de {total}
    </span>
    <button type="button" className="btn btn--ghost" onClick={() => onStep(1)} disabled={index >= total - 1}>
      Próxima →
    </button>
  </div>
);

QuestionStepper.propTypes = {
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onStep: PropTypes.func.isRequired,
};

const CanvasEmpty = ({ view, isGeneral, hasSections, sectionsEditor, onAddQuestion }) => {
  if (isGeneral) return <CanvasEmptyBoard variant="read-only" />;
  if (!hasSections) {
    return (
      <CanvasEmptyBoard
        variant="no-section"
        sectionTitle={sectionsEditor.sectionForm.title}
        saving={sectionsEditor.savingSection}
        onTitleChange={sectionsEditor.changeSectionTitle}
        onSubmit={sectionsEditor.handleAddSection}
      />
    );
  }
  if (view.activeSectionHasQuestions) return null;
  return (
    <CanvasEmptyBoard
      variant="no-question"
      section={view.activeSection}
      onAddQuestion={(payload) => onAddQuestion(view.activeSectionId, payload)}
    />
  );
};

CanvasEmpty.propTypes = {
  view: PropTypes.object.isRequired,
  isGeneral: PropTypes.bool,
  hasSections: PropTypes.bool.isRequired,
  sectionsEditor: PropTypes.object.isRequired,
  onAddQuestion: PropTypes.func.isRequired,
};

/**
 * Center panel: the selected question (with prev/next) or the matching empty board.
 * `view` comes from `deriveEditorView`; `questions` bundles the question hook outputs.
 */
const AnamnesisCanvas = ({
  anamnesisId,
  isGeneral,
  hasSections,
  view,
  questions,
  sectionsEditor,
  onStepQuestion,
  onDeleteQuestion,
}) => {
  const { selectedQuestion, activeSection, activeSectionId } = view;
  if (!selectedQuestion) {
    return (
      <div className="editor-canvas">
        <CanvasEmpty
          view={view}
          isGeneral={isGeneral}
          hasSections={hasSections}
          sectionsEditor={sectionsEditor}
          onAddQuestion={questions.handleAddQuestion}
        />
      </div>
    );
  }
  return (
    <div className="editor-canvas">
      <CanvasQuestionCard
        key={selectedQuestion.id}
        question={selectedQuestion}
        sectionId={activeSectionId}
        anamnesisId={anamnesisId}
        isGeneral={isGeneral}
        autoFocus={questions.justCreatedQuestionId === selectedQuestion.id}
        onAutoFocusConsumed={questions.clearJustCreated}
        onUpdated={questions.handleQuestionUpdated}
        onDeleteQuestion={() => onDeleteQuestion(activeSection, selectedQuestion)}
        sectionQuestions={activeSection?.questions ?? []}
      />
      <QuestionStepper index={view.selectedQuestionIndex} total={view.allQuestions.length} onStep={onStepQuestion} />
    </div>
  );
};

AnamnesisCanvas.propTypes = {
  anamnesisId: PropTypes.string.isRequired,
  isGeneral: PropTypes.bool,
  hasSections: PropTypes.bool.isRequired,
  view: PropTypes.object.isRequired,
  questions: PropTypes.object.isRequired,
  sectionsEditor: PropTypes.object.isRequired,
  onStepQuestion: PropTypes.func.isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
};

export default AnamnesisCanvas;

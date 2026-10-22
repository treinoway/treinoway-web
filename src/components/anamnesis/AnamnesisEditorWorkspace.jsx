import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../ds/ConfirmDialog';
import Segmented from '../ds/Segmented';
import AnamnesisPreviewModal from '../AnamnesisPreviewModal';
import AnamnesisEditorHeader from './AnamnesisEditorHeader';
import AnamnesisOutlinePanel from './AnamnesisOutlinePanel';
import AnamnesisCanvas from './AnamnesisCanvas';
import AnamnesisLibraryPanel from './AnamnesisLibraryPanel';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useAnamnesisSelection from '../../hooks/useAnamnesisSelection';
import useAnamnesisSections from '../../hooks/useAnamnesisSections';
import useAnamnesisQuestions from '../../hooks/useAnamnesisQuestions';
import useAnamnesisVersions from '../../hooks/useAnamnesisVersions';
import useAnamnesisMutationError from '../../hooks/useAnamnesisMutationError';
import useSectionReorder from '../../hooks/useSectionReorder';
import { EDITOR_TABS } from '../../constants/anamnesisEditor';
import { sortSections, deriveEditorView } from '../../utils/anamnesisEditor';

const TAB_ITEMS = [
  { id: EDITOR_TABS.OUTLINE, label: 'Seções' },
  { id: EDITOR_TABS.CANVAS, label: 'Pergunta' },
  { id: EDITOR_TABS.LIBRARY, label: 'Tipos' },
].map((tab) => ({ ...tab, domId: `anamnesis-tab-${tab.id}`, controls: `anamnesis-panel-${tab.id}` }));

const TabPanel = ({ id, activeTab, children }) => (
  <div
    id={`anamnesis-panel-${id}`}
    role="tabpanel"
    aria-labelledby={`anamnesis-tab-${id}`}
    className={`editor-panel${activeTab === id ? ' editor-panel--active' : ''}`}
  >
    {children}
  </div>
);

TabPanel.propTypes = {
  id: PropTypes.string.isRequired,
  activeTab: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const useEditorState = ({ anamnesis, setAnamnesis, refetch, setActiveTab }) => {
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [forkConflictOpen, setForkConflictOpen] = useState(false);
  const onConflict = useCallback(() => setForkConflictOpen(true), []);
  const reportError = useAnamnesisMutationError(onConflict);
  const selection = useAnamnesisSelection(anamnesis, {
    onQuestionOpened: () => setActiveTab(EDITOR_TABS.CANVAS),
  });
  const shared = { anamnesisId: anamnesis.id, refetch, reportError, requestConfirm, selection };
  return {
    dialogProps,
    forkConflictOpen,
    closeForkConflict: () => setForkConflictOpen(false),
    selection,
    sectionsEditor: useAnamnesisSections(shared),
    questions: useAnamnesisQuestions({
      ...shared,
      onConflict,
      onQuestionCreated: () => setActiveTab(EDITOR_TABS.CANVAS),
    }),
    versions: useAnamnesisVersions(anamnesis.id),
    reorder: useSectionReorder({ anamnesisId: anamnesis.id, anamnesis, setAnamnesis, refetch }),
  };
};

/** Three-panel editor (outline / canvas / question types) of a loaded anamnesis. */
const AnamnesisEditorWorkspace = ({ anamnesis, setAnamnesis, refetch }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(EDITOR_TABS.OUTLINE);
  const [showPreview, setShowPreview] = useState(false);
  const state = useEditorState({ anamnesis, setAnamnesis, refetch, setActiveTab });
  const { selection, sectionsEditor, questions, versions } = state;

  const sections = sortSections(anamnesis.sections);
  const isGeneral = Boolean(anamnesis.isGeneral);
  const view = deriveEditorView(sections, selection.selectedSectionId, selection.selectedQuestionId);

  return (
    <>
      <AnamnesisEditorHeader
        anamnesis={anamnesis}
        hasSections={sections.length > 0}
        forking={versions.forking}
        copying={versions.copying}
        onPreview={() => setShowPreview(true)}
        onAssign={() => navigate(`/trainer/anamneses/${anamnesis.id}/assign`, {
          state: { from: `/trainer/anamneses/${anamnesis.id}` },
        })}
        onFork={versions.handleFork}
        onCopy={versions.handleCopy}
      />

      <div className="anamnesis-editor__tabs">
        <Segmented ariaLabel="Painéis do editor" items={TAB_ITEMS} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="editor-shell">
        <TabPanel id={EDITOR_TABS.OUTLINE} activeTab={activeTab}>
          <AnamnesisOutlinePanel
            sections={sections}
            isGeneral={isGeneral}
            selection={selection}
            sectionsEditor={sectionsEditor}
            reorder={state.reorder}
            onDeleteQuestion={questions.handleDeleteQuestion}
          />
        </TabPanel>
        <TabPanel id={EDITOR_TABS.CANVAS} activeTab={activeTab}>
          <AnamnesisCanvas
            anamnesisId={anamnesis.id}
            isGeneral={isGeneral}
            hasSections={sections.length > 0}
            view={view}
            questions={questions}
            sectionsEditor={sectionsEditor}
            onStepQuestion={selection.handleStepQuestion}
            onDeleteQuestion={questions.handleDeleteQuestion}
          />
        </TabPanel>
        <TabPanel id={EDITOR_TABS.LIBRARY} activeTab={activeTab}>
          <AnamnesisLibraryPanel
            disabled={isGeneral || questions.addingQuestion || !view.activeSectionId}
            onAddQuestion={(payload) => questions.handleAddQuestion(view.activeSectionId, payload)}
          />
        </TabPanel>
      </div>

      {state.dialogProps && <ConfirmDialog {...state.dialogProps} />}
      {state.forkConflictOpen && (
        <ConfirmDialog
          message="Esta anamnese está vinculada a alunos e não pode ser editada diretamente. Deseja criar uma nova versão para editar?"
          confirmLabel="Criar nova versão"
          busyLabel="Criando..."
          confirmTone="primary"
          busy={versions.forking}
          onConfirm={versions.handleFork}
          onCancel={state.closeForkConflict}
        />
      )}
      {showPreview && (
        <AnamnesisPreviewModal anamnesis={anamnesis} open={showPreview} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
};

AnamnesisEditorWorkspace.propTypes = {
  anamnesis: PropTypes.shape({
    id: PropTypes.string.isRequired,
    isGeneral: PropTypes.bool,
    sections: PropTypes.array,
  }).isRequired,
  setAnamnesis: PropTypes.func.isRequired,
  refetch: PropTypes.func.isRequired,
};

export default AnamnesisEditorWorkspace;

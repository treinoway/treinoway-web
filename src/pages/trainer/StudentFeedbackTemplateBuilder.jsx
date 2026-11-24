import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import Badge from '../../components/ds/Badge';
import Banner from '../../components/ds/Banner';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import TemplateQuestionEditor from '../../components/studentFeedback/TemplateQuestionEditor';
import TemplateQuestionList from '../../components/studentFeedback/TemplateQuestionList';
import TemplateQuestionPreview from '../../components/studentFeedback/TemplateQuestionPreview';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useStudentFeedbackTemplateEditor from '../../hooks/useStudentFeedbackTemplateEditor';
import { useDuplicateStudentFeedbackTemplate } from '../../hooks/useStudentFeedbackTemplates';
import useUnsavedChangesGuard from '../../hooks/useUnsavedChangesGuard';
import { FEEDBACK_TEMPLATE_FIRST_SHOWN_VERSION, FEEDBACK_TEMPLATE_LIMITS, STUDENT_FEEDBACK_SETTINGS_PATH, STUDENT_FEEDBACK_TEMPLATES_PATH, studentFeedbackTemplatePath } from '../../constants/studentFeedback';
import { translateError, t, tf } from '../../i18n';

// Text of the builder under the `studentFeedback.builder` namespace
const tb = (key) => t(`studentFeedback.builder.${key}`);

// Button back to the template list
const BackButton = ({ onBack }) => (
  <button type="button" className="icon-button" aria-label={t('studentFeedback.back')} onClick={onBack}>
    <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
  </button>
);

BackButton.propTypes = { onBack: PropTypes.func.isRequired };

// The one primary action of the page: save an own template, duplicate the general one
const PrimaryAction = ({ editor, duplicating, onSave, onDuplicate }) => {
  if (editor.template.isGeneral) {
    return (
      <button type="button" className="btn btn--primary" disabled={duplicating} onClick={onDuplicate}>
        <Copy size={16} strokeWidth={2} aria-hidden="true" />
        {duplicating ? t('studentFeedback.loading') : tb('duplicate')}
      </button>
    );
  }
  return (
    <button type="button" className="btn btn--primary" disabled={!editor.canSave} onClick={onSave}>
      <Check size={16} strokeWidth={2} aria-hidden="true" />
      {editor.saving ? t('studentFeedback.loading') : tb('save')}
    </button>
  );
};

PrimaryAction.propTypes = {
  editor: PropTypes.object.isRequired,
  duplicating: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
};

// Back, the title (the name itself on the read-only general template) and the primary action
const BuilderHeader = ({ editor, onBack, ...actions }) => (
  <header className="ds-page-header">
    <div className="settings-header__heading">
      <BackButton onBack={onBack} />
      <h1 className="ds-page-header__title type-h1">{editor.template.isGeneral ? editor.template.name : tb('title')}</h1>
    </div>
    <div className="ds-page-header__actions">
      <PrimaryAction editor={editor} {...actions} />
    </div>
  </header>
);

BuilderHeader.propTypes = {
  editor: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

// Version of the template (2 onwards) and the milestones that send it; an own template no milestone uses offers the way to the settings that assign it
const TemplateUsage = ({ template, disabled, onUseInSends }) => {
  const unused = template.milestones.length === 0;
  return (
    <div className="feedback-builder__usage type-caption">
      {template.version >= FEEDBACK_TEMPLATE_FIRST_SHOWN_VERSION && <Badge variant="tag">{tf('studentFeedback.templates.version', { version: template.version })}</Badge>}
      {unused && <span>{tb('notInUse')}</span>}
      {unused && !template.isGeneral && (
        <button type="button" className="btn btn--secondary" disabled={disabled} onClick={onUseInSends}>{tb('useInSends')}</button>
      )}
      {!unused && <span>{tb('usedBy')}</span>}
      {template.milestones.map((milestone) => <Badge key={milestone} variant="tag" tone="brand">{t(`studentFeedback.milestone.${milestone}`)}</Badge>)}
    </div>
  );
};

TemplateUsage.propTypes = {
  template: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onUseInSends: PropTypes.func.isRequired,
};

// Name field of an own template (the general one shows its name as the title), version and milestones in use
const TemplateMeta = ({ editor, onUseInSends }) => (
  <section className="section-card feedback-builder__meta">
    {!editor.template.isGeneral && (
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="feedback-template-name">{tb('nameLabel')}</label>
        <input
          id="feedback-template-name"
          type="text"
          className="input"
          value={editor.draft.name}
          maxLength={FEEDBACK_TEMPLATE_LIMITS.name}
          disabled={editor.saving}
          onChange={(event) => editor.setName(event.target.value)}
        />
      </div>
    )}
    <TemplateUsage template={editor.template} disabled={editor.saving} onUseInSends={onUseInSends} />
  </section>
);

TemplateMeta.propTypes = {
  editor: PropTypes.object.isRequired,
  onUseInSends: PropTypes.func.isRequired,
};

// Why the template cannot be edited, or that a save only changes the next sends; nothing for a template never sent
const TemplateNotice = ({ template }) => {
  if (template.isGeneral) return <Banner>{tb('generalNotice')}</Banner>;
  if (!template.hasRequests) return null;
  return <Banner>{tb('versionNotice')}</Banner>;
};

TemplateNotice.propTypes = { template: PropTypes.object.isRequired };

// Why "Salvar" is blocked when every question depends on the meal plan; nothing otherwise
const UnconditionalQuestionNotice = ({ editor }) => {
  if (!editor.lacksUnconditionalQuestion) return null;
  return <Banner tone="warning">{tb('noUnconditionalQuestion')}</Banner>;
};

UnconditionalQuestionNotice.propTypes = { editor: PropTypes.object.isRequired };

// Question list on the left; editor of the selected question (own templates only) and its student preview on the right
const BuilderBody = ({ editor, onRemove }) => {
  const { draft, selected } = editor;
  const readOnly = editor.template.isGeneral;
  const position = draft.questions.indexOf(selected) + 1;
  return (
    <div className="feedback-builder">
      <TemplateQuestionList
        questions={draft.questions}
        selectedKey={selected?.key}
        readOnly={readOnly}
        disabled={editor.saving}
        onSelect={editor.selectQuestion}
        onMove={editor.moveQuestion}
        onAdd={editor.addQuestion}
      />
      {selected && (
        <div className="feedback-builder__side">
          {!readOnly && (
            <TemplateQuestionEditor
              question={selected}
              position={position}
              canRemove={draft.questions.length > 1}
              disabled={editor.saving}
              onChange={(changes) => editor.changeQuestion(selected.key, changes)}
              onRemove={() => onRemove(selected.key)}
            />
          )}
          <TemplateQuestionPreview question={selected} />
        </div>
      )}
    </div>
  );
};

BuilderBody.propTypes = {
  editor: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// Builder of one feedback template: name, ordered questions, editor and student preview; the general template is read-only and can only be duplicated
const StudentFeedbackTemplateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const editor = useStudentFeedbackTemplateEditor(id);
  const { duplicate, duplicating } = useDuplicateStudentFeedbackTemplate();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const leaveTo = useUnsavedChangesGuard(editor.isDirty, requestConfirm);
  const handleBack = () => leaveTo(STUDENT_FEEDBACK_TEMPLATES_PATH);

  const handleSave = async () => {
    try {
      const saved = await editor.save();
      const isNewVersion = saved.id !== id;
      showToast(isNewVersion ? tb('savedVersion') : tb('saved'), 'success');
      if (isNewVersion) navigate(studentFeedbackTemplatePath(saved.id), { replace: true });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleRemove = (key) => requestConfirm({
    message: tb('confirmRemove'),
    confirmLabel: tb('confirmRemoveLabel'),
    busyLabel: tb('removing'),
    onConfirm: () => editor.removeQuestion(key),
  });

  if (editor.loading) return <div className="loading-screen"><span className="loading-text">{t('studentFeedback.loading')}</span></div>;
  if (editor.error) {
    const retry = <button type="button" className="btn btn--secondary" onClick={editor.retry}>{t('studentFeedback.retry')}</button>;
    return (
      <div className="student-feedback-page">
        <BackButton onBack={handleBack} />
        <Banner tone="error" action={retry}>{editor.error}</Banner>
      </div>
    );
  }

  return (
    <div className="student-feedback-page">
      <BuilderHeader editor={editor} duplicating={duplicating} onBack={handleBack} onSave={handleSave} onDuplicate={() => duplicate(id)} />
      <TemplateNotice template={editor.template} />
      <TemplateMeta editor={editor} onUseInSends={() => leaveTo(STUDENT_FEEDBACK_SETTINGS_PATH)} />
      <UnconditionalQuestionNotice editor={editor} />
      <BuilderBody editor={editor} onRemove={handleRemove} />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default StudentFeedbackTemplateBuilder;

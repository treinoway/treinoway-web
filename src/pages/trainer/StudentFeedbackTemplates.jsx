import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import { LibraryListRow } from '../../components/LibraryList';
import CreateTemplateDialog from '../../components/studentFeedback/CreateTemplateDialog';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useStudentFeedbackTemplates, { useCreateStudentFeedbackTemplate, useDuplicateStudentFeedbackTemplate } from '../../hooks/useStudentFeedbackTemplates';
import { FEEDBACK_TEMPLATE_FIRST_SHOWN_VERSION, STUDENT_FEEDBACK_PATH, studentFeedbackTemplatePath } from '../../constants/studentFeedback';
import { t, tCount, tf } from '../../i18n';

// Text of the template list under the `studentFeedback.templates` namespace
const tt = (key) => t(`studentFeedback.templates.${key}`);

// Badges of a template: "Geral" on the general one, its version once it was edited after being sent (2 onwards) and the milestones that send it
const badgesOf = (template) => [
  ...(template.isGeneral ? [{ label: tt('general'), tone: 'neutral', variant: 'tag' }] : []),
  ...(template.version >= FEEDBACK_TEMPLATE_FIRST_SHOWN_VERSION ? [{ label: tf('studentFeedback.templates.version', { version: template.version }), tone: 'neutral', variant: 'tag' }] : []),
  ...template.milestones.map((milestone) => ({ label: t(`studentFeedback.milestone.${milestone}`), tone: 'brand', variant: 'tag' })),
];

// Question count and how many milestones send the template
const subtitleOf = (template) => {
  const questions = tCount('studentFeedback.templates.questions', template.questionCount);
  const usage = template.milestones.length > 0 ? tCount('studentFeedback.templates.inUse', template.milestones.length) : tt('notInUse');
  return `${questions} · ${usage}`;
};

// Back to the inbox, the title and, once the list is loaded, "Criar modelo"
const TemplatesHeader = ({ onBack, onCreate }) => (
  <header className="ds-page-header">
    <div className="settings-header__heading">
      <button type="button" className="icon-button" aria-label={t('studentFeedback.back')} onClick={onBack}>
        <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      <h1 className="ds-page-header__title type-h1">{tt('title')}</h1>
    </div>
    {onCreate && (
      <div className="ds-page-header__actions">
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {tt('create.action')}
        </button>
      </div>
    )}
  </header>
);

TemplatesHeader.propTypes = {
  onBack: PropTypes.func.isRequired,
  onCreate: PropTypes.func,
};

// One template: opens the builder from its name; the menu duplicates it and, for an own template, deletes it
const TemplateRow = ({ template, busy, onOpen, onDuplicate, onDelete }) => (
  <LibraryListRow
    title={template.name}
    ariaLabel={tf('studentFeedback.templates.open', { name: template.name })}
    subtitle={subtitleOf(template)}
    badges={badgesOf(template)}
    onOpen={() => onOpen(template)}
    rowMenuProps={{
      ariaLabel: tf('studentFeedback.templates.options', { name: template.name }),
      triggerDisabled: busy,
      extraItems: [{ label: tt('duplicate'), onClick: () => onDuplicate(template) }],
      onDelete: template.isGeneral ? undefined : () => onDelete(template),
    }}
  />
);

TemplateRow.propTypes = {
  template: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// What a template is, above the templates with their row actions
const TemplateList = ({ templates, busy, onOpen, onDuplicate, onDelete }) => (
  <>
    <p className="type-body student-feedback-section__note">{tt('intro')}</p>
    <div className="library-list" role="list" aria-label={tt('listAria')}>
      {templates.map((template) => (
        <div key={template.id} role="listitem">
          <TemplateRow template={template} busy={busy} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      ))}
    </div>
  </>
);

TemplateList.propTypes = {
  templates: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Feedback templates of the trainer: the general one and their own, each with version, questions and milestones in use; "Criar modelo" starts a new one
const StudentFeedbackTemplates = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const list = useStudentFeedbackTemplates();
  const { duplicate, duplicating } = useDuplicateStudentFeedbackTemplate();
  const { create, creating } = useCreateStudentFeedbackTemplate();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [creatingOpen, setCreatingOpen] = useState(false);

  const deleteTemplate = async (template) => {
    await list.remove(template.id);
    showToast(tt('deleted'), 'success');
  };
  const handleDelete = (template) => requestConfirm({
    message: tf('studentFeedback.templates.confirmDelete', { name: template.name }),
    onConfirm: () => deleteTemplate(template),
  });

  if (list.loading) return <div className="loading-screen"><span className="loading-text">{t('studentFeedback.loading')}</span></div>;
  const generalTemplateId = list.templates.find((template) => template.isGeneral)?.id;

  return (
    <div className="student-feedback-page">
      <TemplatesHeader onBack={() => navigate(STUDENT_FEEDBACK_PATH)} onCreate={list.error ? undefined : () => setCreatingOpen(true)} />
      {list.error && (
        <EmptyBlock icon={CircleAlert} title={tt('loadErrorTitle')} description={list.error} actionLabel={t('studentFeedback.retry')} onAction={() => list.reload()} />
      )}
      {!list.error && (
        <TemplateList templates={list.templates} busy={duplicating} onOpen={(item) => navigate(studentFeedbackTemplatePath(item.id))} onDuplicate={(item) => duplicate(item.id)} onDelete={handleDelete} />
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
      {creatingOpen && <CreateTemplateDialog generalTemplateId={generalTemplateId} busy={creating} onCreate={create} onCancel={() => setCreatingOpen(false)} />}
    </div>
  );
};

export default StudentFeedbackTemplates;

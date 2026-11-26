import { useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, Check } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError, t, tf } from '../../i18n';
import Banner from '../../components/ds/Banner';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import ToggleField from '../../components/studentFeedback/ToggleField';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useStudentFeedbackConfig from '../../hooks/useStudentFeedbackConfig';
import useStudentFeedbackMilestoneTemplates from '../../hooks/useStudentFeedbackMilestoneTemplates';
import useUnsavedChangesGuard from '../../hooks/useUnsavedChangesGuard';
import {
  FEEDBACK_CONFIG_MILESTONE_FIELDS,
  FEEDBACK_REMINDER_MIN_WINDOW_DAYS,
  FEEDBACK_RESPONSE_WINDOW_OPTIONS,
  STUDENT_FEEDBACK_PATH,
} from '../../constants/studentFeedback';
import { formatDayCount } from '../../utils/studentFeedback';

const RESPONSE_WINDOW_ID = 'student-feedback-setting-responseWindowDays';

// Text of the settings under the `studentFeedback.settings` namespace
const ts = (key) => t(`studentFeedback.settings.${key}`);

// Send rules in display order; a window too short for the 24h reminder says there is none
const ruleKeysFor = (responseWindowDays) =>
  ['sendTime', 'responseWindow', responseWindowDays < FEEDBACK_REMINDER_MIN_WINDOW_DAYS ? 'noReminder' : 'reminder', 'channel'];

// Back arrow, title and the save action
const SettingsHeader = ({ canSave, saving, onBack, onSave }) => (
  <header className="ds-page-header">
    <div className="settings-header__heading">
      <button type="button" className="icon-button" aria-label={t('studentFeedback.back')} onClick={onBack}>
        <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      <h1 className="ds-page-header__title type-h1">{ts('title')}</h1>
    </div>
    <div className="ds-page-header__actions">
      <button type="button" className="btn btn--primary" disabled={!canSave} onClick={onSave}>
        <Check size={16} strokeWidth={2} aria-hidden="true" />
        {saving ? t('studentFeedback.loading') : ts('save')}
      </button>
    </div>
  </header>
);

SettingsHeader.propTypes = {
  canSave: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

// Card of the page under its own title
const SettingsSection = ({ title, children }) => (
  <section className="settings-section" aria-label={title}>
    <h2 className="type-h3 student-feedback-section__title">{title}</h2>
    <div className="section-card settings-card">{children}</div>
  </section>
);

SettingsSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Picker of the template a milestone sends: the general one first, then the trainer's own
const MilestoneTemplateSelect = ({ field, milestoneLabel, milestoneTemplates, disabled }) => (
  <select
    className="input student-feedback-setting__select"
    aria-label={tf('studentFeedback.settings.templateFor', { milestone: milestoneLabel })}
    value={milestoneTemplates.valueOf(field)}
    disabled={disabled}
    onChange={(event) => milestoneTemplates.pick(field, event.target.value)}
  >
    {milestoneTemplates.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
  </select>
);

MilestoneTemplateSelect.propTypes = {
  field: PropTypes.string.isRequired,
  milestoneLabel: PropTypes.string.isRequired,
  milestoneTemplates: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// Picker of how many days the student has to answer the feedbacks sent from now on; `disabled` locks it
const ResponseWindowField = ({ value, disabled, onChange }) => (
  <div className="student-feedback-setting student-feedback-setting--with-field">
    <div className="student-feedback-setting__text">
      <label className="type-body-strong student-feedback-setting__label" htmlFor={RESPONSE_WINDOW_ID}>{ts('responseWindow')}</label>
      <span id={`${RESPONSE_WINDOW_ID}-help`} className="type-caption student-feedback-setting__description">{ts('responseWindowHelp')}</span>
    </div>
    <select
      id={RESPONSE_WINDOW_ID}
      className="input"
      aria-describedby={`${RESPONSE_WINDOW_ID}-help`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {FEEDBACK_RESPONSE_WINDOW_OPTIONS.map((days) => <option key={days} value={days}>{formatDayCount(days)}</option>)}
    </select>
  </div>
);

ResponseWindowField.propTypes = {
  value: PropTypes.number.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Send rules as the draft stands: the window and the reminder rules follow the window picked, saved or not
const SendRules = ({ responseWindowDays }) => (
  <SettingsSection title={ts('rulesSection')}>
    <ul className="student-feedback-rules type-body">
      {ruleKeysFor(responseWindowDays).map((key) => (
        <li key={key}>{tf(`studentFeedback.settings.rules.${key}`, { window: formatDayCount(responseWindowDays) })}</li>
      ))}
    </ul>
  </SettingsSection>
);

SendRules.propTypes = { responseWindowDays: PropTypes.number.isRequired };

// One switch per milestone and, once the templates are loaded, the template each milestone sends; `disabled` locks them all
const MilestonesSection = ({ settings, milestoneTemplates, disabled }) => (
  <SettingsSection title={ts('milestonesSection')}>
    <p className="type-caption settings-card__help">
      {milestoneTemplates.available ? `${ts('milestonesHelp')} ${ts('templatesHelp')}` : ts('milestonesHelp')}
    </p>
    {FEEDBACK_CONFIG_MILESTONE_FIELDS.map((field) => {
      const label = t(`studentFeedback.milestone.${field.toUpperCase()}`);
      return (
        <ToggleField
          key={field}
          id={`student-feedback-setting-${field}`}
          label={label}
          description={ts(`milestoneDescription.${field}`)}
          checked={settings.config[field]}
          disabled={disabled}
          onChange={(next) => settings.setField(field, next)}
        >
          {milestoneTemplates.available && <MilestoneTemplateSelect field={field} milestoneLabel={label} milestoneTemplates={milestoneTemplates} disabled={disabled} />}
        </ToggleField>
      );
    })}
  </SettingsSection>
);

MilestonesSection.propTypes = {
  settings: PropTypes.object.isRequired,
  milestoneTemplates: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// Loaded page under the header: auto-send switch and response window, milestones with their templates and the send rules; `disabled` locks every control
const SettingsContent = ({ settings, milestoneTemplates, disabled }) => (
  <>
    <SettingsSection title={ts('autoSendSection')}>
      <ToggleField
        id="student-feedback-setting-autoSendEnabled"
        label={ts('autoSend')}
        description={ts('autoSendDescription')}
        checked={settings.config.autoSendEnabled}
        disabled={disabled}
        onChange={(next) => settings.setField('autoSendEnabled', next)}
      />
      <ResponseWindowField
        value={settings.responseWindowDays}
        disabled={disabled}
        onChange={(next) => settings.setField('responseWindowDays', next)}
      />
    </SettingsSection>
    <MilestonesSection settings={settings} milestoneTemplates={milestoneTemplates} disabled={disabled} />
    <SendRules responseWindowDays={settings.responseWindowDays} />
  </>
);

SettingsContent.propTypes = {
  settings: PropTypes.object.isRequired,
  milestoneTemplates: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// Configuration of the automatic student feedback: auto-send, response window, milestones with the template of each, and the send rules
const StudentFeedbackSettings = () => {
  const { showToast } = useToast();
  const settings = useStudentFeedbackConfig();
  const milestoneTemplates = useStudentFeedbackMilestoneTemplates();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const isDirty = settings.isDirty || milestoneTemplates.isDirty;
  const [saving, setSaving] = useState(false);
  const leaveTo = useUnsavedChangesGuard(isDirty, requestConfirm);

  const handleSave = async () => {
    // why: one flag for the whole save, so the controls stay locked between the two requests instead of unlocking when the first one ends
    setSaving(true);
    try {
      if (settings.isDirty) await settings.save();
      if (milestoneTemplates.isDirty) await milestoneTemplates.save();
      showToast(ts('saved'), 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (settings.loading) return <div className="loading-screen"><span className="loading-text">{t('studentFeedback.loading')}</span></div>;
  if (settings.error) {
    const retry = <button type="button" className="btn btn--secondary" onClick={() => settings.reload()}>{t('studentFeedback.retry')}</button>;
    return <Banner tone="error" action={retry}>{settings.error}</Banner>;
  }

  return (
    <div className="student-feedback-page">
      <SettingsHeader canSave={isDirty && !saving} saving={saving} onBack={() => leaveTo(STUDENT_FEEDBACK_PATH)} onSave={handleSave} />
      <SettingsContent settings={settings} milestoneTemplates={milestoneTemplates} disabled={saving} />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default StudentFeedbackSettings;

import { useCallback, useEffect, useRef, useState } from 'react';
import { getStudentFeedbackTemplate, saveStudentFeedbackTemplate } from '../api/studentFeedback';
import {
  buildNewQuestion,
  buildTemplatePayload,
  hasOnlyConditionalQuestions,
  isTemplateDraftComplete,
  moveQuestion,
  neighbourKeyOf,
  toTemplateDraft,
  updateQuestion,
} from '../utils/studentFeedbackTemplate';
import { translateError } from '../i18n';

const NOTHING_LOADED = { id: null, template: null, baseline: '', error: '' };
const EMPTY_DRAFT = { name: '', questions: [] };

// Comparable form of a draft: what a save would send for it
const snapshotOf = (draft) => JSON.stringify(buildTemplatePayload(draft));

// Template loaded for a route id, its editable draft with the baseline of the last load or save, and the selected question
const useTemplateDraft = () => {
  const [loaded, setLoaded] = useState(NOTHING_LOADED);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [selectedKey, setSelectedKey] = useState(null);

  const adopt = useCallback((id, template, selectedIndex = 0) => {
    const next = toTemplateDraft(template);
    const position = Math.min(selectedIndex, next.questions.length - 1);
    setLoaded({ id, template, baseline: snapshotOf(next), error: '' });
    setDraft(next);
    setSelectedKey(next.questions[position]?.key ?? null);
  }, []);

  return { loaded, setLoaded, draft, setDraft, selectedKey, setSelectedKey, adopt };
};

// Builder state of one feedback template: load by id, draft against the last saved baseline, question operations and a save that resolves to the saved template (under a new id when it created a version)
const useStudentFeedbackTemplateEditor = (templateId) => {
  const { loaded, setLoaded, draft, setDraft, selectedKey, setSelectedKey, adopt } = useTemplateDraft();
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const savedIdRef = useRef(null);
  const newQuestionCountRef = useRef(0);

  useEffect(() => {
    // why: a save that created a version already holds the template of the id the route moves to, so that one arrival is not fetched; the mark is spent here so any later arrival at the id fetches
    const heldBySave = savedIdRef.current === templateId;
    savedIdRef.current = null;
    if (heldBySave) return undefined;
    let cancelled = false;
    getStudentFeedbackTemplate(templateId)
      .then((template) => !cancelled && adopt(templateId, template))
      .catch((error) => !cancelled && setLoaded({ ...NOTHING_LOADED, id: templateId, error: error.userMessage || translateError(error) }));
    return () => {
      cancelled = true;
    };
  }, [templateId, reloadKey, adopt, setLoaded]);

  const retry = () => {
    savedIdRef.current = null;
    setLoaded(NOTHING_LOADED);
    setReloadKey((key) => key + 1);
  };

  const setQuestions = (change) => setDraft((current) => ({ ...current, questions: change(current.questions) }));

  const addQuestion = () => {
    newQuestionCountRef.current += 1;
    const question = buildNewQuestion(`new-${newQuestionCountRef.current}`);
    setQuestions((questions) => [...questions, question]);
    setSelectedKey(question.key);
  };

  const removeQuestion = (key) => {
    setSelectedKey(neighbourKeyOf(draft.questions, key));
    setQuestions((questions) => questions.filter((question) => question.key !== key));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveStudentFeedbackTemplate(templateId, buildTemplatePayload(draft));
      savedIdRef.current = saved.id === templateId ? null : saved.id;
      // why: the template stays loaded for the current route id until the page moves to the id of the new version, so nothing reloads in between
      adopt(templateId, saved, draft.questions.findIndex((question) => question.key === selectedKey));
      return saved;
    } finally {
      setSaving(false);
    }
  };

  const isSettled = loaded.id === templateId || loaded.template?.id === templateId;
  const isReady = isSettled && Boolean(loaded.template);
  const isDirty = isReady && !loaded.template.isGeneral && snapshotOf(draft) !== loaded.baseline;

  return {
    loading: !isSettled,
    error: loaded.error,
    retry,
    template: isReady ? loaded.template : null,
    draft,
    selected: draft.questions.find((question) => question.key === selectedKey) ?? draft.questions[0] ?? null,
    isDirty,
    saving,
    canSave: isDirty && !saving && isTemplateDraftComplete(draft),
    lacksUnconditionalQuestion: isReady && !loaded.template.isGeneral && hasOnlyConditionalQuestions(draft),
    setName: (name) => setDraft((current) => ({ ...current, name })),
    selectQuestion: setSelectedKey,
    changeQuestion: (key, changes) => setQuestions((questions) => updateQuestion(questions, key, changes)),
    moveQuestion: (index, offset) => setQuestions((questions) => moveQuestion(questions, index, offset)),
    addQuestion,
    removeQuestion,
    save,
  };
};

export default useStudentFeedbackTemplateEditor;

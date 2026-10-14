import { useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';

const selectableEmails = (students) =>
  (students || []).filter((s) => !s.duplicateEmail && s.email).map((s) => s.email);

/** State + handlers for the PrimeCoaching import modal (platform → upload → preview). */
const useStudentImport = (showToast) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('platform');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [file, setFile] = useState(null);
  const [selectedEmails, setSelectedEmails] = useState(new Set());

  const open = () => setIsOpen(true);

  const close = () => {
    setIsOpen(false);
    setStep('platform');
    setLoading(false);
    setData(null);
    setFile(null);
    setSelectedEmails(new Set());
  };

  const goBack = () => setStep(step === 'preview' ? 'upload' : 'platform');

  const submitPreview = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/trainer/import/primecoaching/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setData(response.data);
      setSelectedEmails(new Set(selectableEmails(response.data.students)));
      setStep('preview');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (email) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleAll = () => {
    const all = selectableEmails(data?.students);
    const anySelected = all.some((email) => selectedEmails.has(email));
    setSelectedEmails(anySelected ? new Set() : new Set(all));
  };

  const sendInvites = () => {
    const count = selectedEmails.size;
    showToast(`${count} convite${count !== 1 ? 's' : ''} enviado${count !== 1 ? 's' : ''}.`, 'success');
    close();
  };

  return {
    isOpen,
    step,
    loading,
    data,
    file,
    selectedEmails,
    open,
    close,
    goBack,
    selectStep: setStep,
    selectFile: setFile,
    submitPreview,
    toggleStudent,
    toggleAll,
    sendInvites,
  };
};

export default useStudentImport;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

/** "Nova versão" (fork) and "Copiar para minha coleção" (copy) of an anamnesis. */
const useAnamnesisVersions = (anamnesisId) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [forking, setForking] = useState(false);
  const [copying, setCopying] = useState(false);

  const createVersion = async (action, setBusy, successMessage) => {
    setBusy(true);
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesisId}/${action}`);
      showToast(successMessage, 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return {
    forking,
    copying,
    handleFork: () => createVersion('fork', setForking, 'Nova versão criada com sucesso!'),
    handleCopy: () => createVersion('copy', setCopying, 'Anamnese copiada com sucesso!'),
  };
};

export default useAnamnesisVersions;

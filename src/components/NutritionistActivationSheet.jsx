import { useState } from 'react';
import PropTypes from 'prop-types';
import { Salad, X } from 'lucide-react';
import api from '../api/axios';
import { translateError } from '../i18n';

const NutritionistActivationSheet = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.patch('/become-nutritionist');
      onSuccess(response.data);
    } catch (err) {
      setError(err.userMessage || translateError(err) || 'Não foi possível ativar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutritionist-activation-title"
      >
        <div className="bottom-sheet-header">
          <h3 className="bottom-sheet-title" id="nutritionist-activation-title">
            Ativar perfil de nutricionista?
          </h3>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
            disabled={loading}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="bottom-sheet-body">
          <div className="nutritionist-activation-icon" aria-hidden="true">
            <Salad size={40} strokeWidth={1.6} />
          </div>

          <p className="nutritionist-activation-body">
            Ao ativar, você poderá preencher seus dados profissionais e atender clientes como nutricionista na plataforma.
          </p>

          {error && (
            <p className="form-error" role="alert">{error}</p>
          )}

          <div className="btn-group">
            <button
              type="button"
              className="btn-primary"
              onClick={handleActivate}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Ativando...' : 'Ativar perfil'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

NutritionistActivationSheet.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default NutritionistActivationSheet;

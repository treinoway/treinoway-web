import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';

const STEPS = ['Dados pessoais', 'Endereço', 'Dados profissionais'];

const NutritionistOnboardingPage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      countryCode: '',
      stateCode: '',
      neighborhood: '',
    },
    professionalDocument: '',
    clinicName: '',
    serviceMode: 'online',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        birthDate: user.birthDate?.split('T')[0] || '',
        gender: user.gender || '',
        address: {
          line1: user.address?.line1 || '',
          line2: user.address?.line2 || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          postalCode: user.address?.postalCode || '',
          country: user.address?.country || '',
          countryCode: user.address?.countryCode || '',
          stateCode: user.address?.stateCode || '',
          neighborhood: user.address?.neighborhood || '',
        },
      }));
    }
  }, [user]);

  const handleCepLookup = async (cep) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setLoadingCep(true);
    setCepError('');

    try {
      const response = await api.get(`/postal-code?code=${clean}`);
      const data = response.data;
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          line1: data.logradouro || data.street || data.line1 || '',
          neighborhood: data.bairro || data.neighborhood || '',
          city: data.localidade || data.city || '',
          state: data.estado || data.state || '',
          stateCode: data.uf || data.stateCode || '',
          country: 'Brazil',
          countryCode: 'BR',
          postalCode: clean,
        },
      }));
    } catch (err) {
      setCepError(err.userMessage || translateError(err) || 'Erro ao buscar CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  const isRequiredFilled = () => {
    const { firstName, lastName, professionalDocument, serviceMode } = formData;
    return firstName.trim() && lastName.trim() && professionalDocument.trim() && serviceMode;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRequiredFilled()) return;

    setLoading(true);
    const errors = [];

    const profilePayload = {};
    if (formData.firstName.trim()) profilePayload.firstName = formData.firstName.trim();
    if (formData.lastName.trim()) profilePayload.lastName = formData.lastName.trim();
    if (formData.birthDate) profilePayload.birthDate = formData.birthDate;
    if (formData.gender) profilePayload.gender = formData.gender;

    const addrPayload = {};
    for (const [key, val] of Object.entries(formData.address)) {
      if (val && val.trim()) addrPayload[key] = val.trim();
    }

    const nutritionistPayload = {
      professionalDocument: formData.professionalDocument.trim(),
      serviceMode: formData.serviceMode,
    };
    if (formData.clinicName.trim()) nutritionistPayload.clinicName = formData.clinicName.trim();
    if (formData.notes.trim()) nutritionistPayload.notes = formData.notes.trim();

    const requests = [];

    if (Object.keys(profilePayload).length > 0) {
      const patchBody = { ...profilePayload };
      if (Object.keys(addrPayload).length > 0) patchBody.address = addrPayload;
      requests.push(
        api.patch('/me/profile', patchBody).then((r) => r.data).catch((err) => {
          errors.push(err.userMessage || translateError(err));
          return null;
        })
      );
    } else if (Object.keys(addrPayload).length > 0) {
      requests.push(
        api.patch('/me/profile', { address: addrPayload }).then((r) => r.data).catch((err) => {
          errors.push(err.userMessage || translateError(err));
          return null;
        })
      );
    }

    requests.push(
      api.patch('/nutritionist', { nutritionist: nutritionistPayload }).then((r) => r.data).catch((err) => {
        errors.push(err.userMessage || translateError(err));
        return null;
      })
    );

    try {
      await Promise.all(requests);

      if (errors.length > 0) {
        showToast(errors[0], 'error');
        setLoading(false);
        return;
      }

      await refreshUser();
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const setAddress = (field, value) =>
    setFormData((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));

  return (
    <div>
      <h1 className="page-title">Cadastro de nutricionista</h1>

      <nav className="onboarding-steps" aria-label="Etapas do cadastro">
        {STEPS.map((step, i) => (
          <span key={step} className="onboarding-step-pill">
            <span className="onboarding-step-number">{i + 1}</span>
            {step}
          </span>
        ))}
      </nav>

      <form onSubmit={handleSubmit} className="form">
        {/* Section: Dados pessoais */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="card-header">
            <h2 className="card-title">Dados pessoais</h2>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">Nome</label>
              <input
                id="firstName"
                type="text"
                className="form-input"
                value={formData.firstName}
                onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Sobrenome</label>
              <input
                id="lastName"
                type="text"
                className="form-input"
                value={formData.lastName}
                onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="birthDate">Data de nascimento</label>
            <input
              id="birthDate"
              type="date"
              className="form-input"
              value={formData.birthDate}
              onChange={(e) => setFormData((p) => ({ ...p, birthDate: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gender">Gênero</label>
            <Select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
            >
              <option value="">Selecione</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
            </Select>
          </div>
        </div>

        {/* Section: Endereço */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="card-header">
            <h2 className="card-title">Endereço</h2>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="postalCode">CEP</label>
            <input
              id="postalCode"
              type="text"
              className="form-input"
              value={formData.address.postalCode}
              onChange={(e) => {
                setAddress('postalCode', e.target.value);
                handleCepLookup(e.target.value);
              }}
              placeholder="00000-000"
            />
            {loadingCep && <p className="form-hint">Buscando CEP...</p>}
            {cepError && <p className="form-error">{cepError}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="line1">Endereço</label>
            <input
              id="line1"
              type="text"
              className="form-input"
              value={formData.address.line1}
              onChange={(e) => setAddress('line1', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="line2">Complemento <span className="form-optional">(opcional)</span></label>
            <input
              id="line2"
              type="text"
              className="form-input"
              value={formData.address.line2}
              onChange={(e) => setAddress('line2', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="city">Cidade</label>
              <input
                id="city"
                type="text"
                className="form-input"
                value={formData.address.city}
                onChange={(e) => setAddress('city', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="state">Estado</label>
              <input
                id="state"
                type="text"
                className="form-input"
                value={formData.address.state}
                onChange={(e) => setAddress('state', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="country">País</label>
            <input
              id="country"
              type="text"
              className="form-input"
              value={formData.address.country}
              onChange={(e) => setAddress('country', e.target.value)}
            />
          </div>
        </div>

        {/* Section: Dados profissionais */}
        <div className="card" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div className="card-header">
            <h2 className="card-title">Dados profissionais</h2>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="professionalDocument">CRN</label>
            <input
              id="professionalDocument"
              type="text"
              className="form-input"
              value={formData.professionalDocument}
              onChange={(e) => setFormData((p) => ({ ...p, professionalDocument: e.target.value }))}
              placeholder="Ex: CRN-3 12345"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="clinicName">Local de atendimento</label>
            <input
              id="clinicName"
              type="text"
              className="form-input"
              value={formData.clinicName}
              onChange={(e) => setFormData((p) => ({ ...p, clinicName: e.target.value }))}
              placeholder="Ex: Clínica Saúde Plena"
            />
            <p className="form-hint">Nome do consultório, clínica ou &quot;Atendimento domiciliar / online&quot;</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="serviceMode">Modo de atendimento</label>
            <Select
              id="serviceMode"
              value={formData.serviceMode}
              onChange={(e) => setFormData((p) => ({ ...p, serviceMode: e.target.value }))}
            >
              <option value="online">Online</option>
              <option value="in_person">Presencial</option>
              <option value="hybrid">Híbrido</option>
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notes">Especialidades</label>
            <textarea
              id="notes"
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ex: Emagrecimento, nutrição esportiva, vegetarianismo"
              maxLength={500}
              rows={4}
            />
          </div>
        </div>

        <div className="btn-group profile-form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !isRequiredFilled()}
          >
            {loading ? 'Salvando...' : 'Concluir cadastro'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NutritionistOnboardingPage;

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { translateError, t } from '../i18n';
import api from '../api/axios';
import DateInput from '../components/DateInput';
import TrainerProfileSection from '../components/TrainerProfileSection';
import NutritionistProfileSection from '../components/NutritionistProfileSection';
import ProfileAvatarField, { ProfileAvatar } from '../components/ProfileAvatarField';
import Select from '../components/Select';
import { computeMissingProfileFields } from '../utils/onboardingProfile';
import { markOnboardingStepOptimistic } from '../hooks/useOnboardingStatus';

// Helper function to format date without timezone conversion
const formatDateForDisplay = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

const formatGender = (gender) => {
  if (gender === 'male') return 'Masculino';
  if (gender === 'female') return 'Feminino';
  if (gender === 'other') return 'Outro';
  return null;
};

// Tweak 10: Format address compactly
const formatCompactAddress = (address) => {
  if (!address) return null;

  const { line1, line2, neighborhood, city, stateCode, postalCode } = address;
  const hasAny = line1 || line2 || neighborhood || city || stateCode || postalCode;
  if (!hasAny) return null;

  const parts1 = [line1, line2].filter(Boolean);
  const line1Text = parts1.join(' - ');

  const cityState = [city, stateCode].filter(Boolean).join('/');
  const parts2 = [neighborhood, cityState, postalCode].filter(Boolean);
  const line2Text = parts2.join(' - ');

  return { line1: line1Text, line2: line2Text };
};

// Tweak 6: Count empty fields for a section
const countEmptyFields = (fields) => {
  return fields.filter((val) => !val).length;
};

// Tweak 6: Section header with completeness indicator
const SectionHeader = ({ title, emptyCount }) => (
  <div className="profile-section-header">
    <h3 className="profile-section-title">{title}</h3>
    {emptyCount === 0 ? (
      <Check size={16} className="section-complete-icon" aria-label="Seção completa" />
    ) : (
      <span className="section-incomplete-text">Incompleto</span>
    )}
  </div>
);

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  emptyCount: PropTypes.number.isRequired,
};

// Maps the stored user to the editable form shape.
const buildFormData = (user) => ({
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  gender: user?.gender || '',
  birthDate: user?.birthDate?.split('T')[0] || '',
  address: {
    line1: user?.address?.line1 || '',
    line2: user?.address?.line2 || '',
    neighborhood: user?.address?.neighborhood || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    stateCode: user?.address?.stateCode || '',
    country: user?.address?.country || '',
    countryCode: user?.address?.countryCode || '',
    postalCode: user?.address?.postalCode || '',
  },
  socials: {
    instagram: user?.socials?.instagram || '',
    whatsapp: user?.socials?.whatsapp || '',
    linkedin: user?.socials?.linkedin || '',
  },
});

// Builds the multipart body expected by POST /me/avatar.
const buildAvatarFormData = (file) => {
  const body = new FormData();
  body.append('file', file);
  return body;
};

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Returns the i18n key of the first avatar-file problem, or null when the file is acceptable.
const getAvatarFileError = (file) => {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) return 'profile.avatar.invalidType';
  if (file.size > AVATAR_MAX_BYTES) return 'profile.avatar.tooLarge';
  return null;
};

const Profile = () => {
  const { user, updateUser, refreshUser, hasRole, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(() => searchParams.get('edit') === '1');
  const highlightMissing = searchParams.get('focus') === 'missing';
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [formData, setFormData] = useState(() => buildFormData(user));

useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && !editing) setFormData(buildFormData(user));
  }, [user, editing]);

  const handleCepLookup = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    setCepError('');

    try {
      const response = await api.get(`/postal-code?code=${cleanCep}`);
      const data = response.data;

      const newAddress = {
        line1: data.logradouro || data.street || data.line1 || '',
        line2: formData.address.line2,
        neighborhood: data.bairro || data.neighborhood || '',
        city: data.localidade || data.city || '',
        state: data.estado || data.state || '',
        stateCode: data.uf || data.stateCode || '',
        country: 'Brazil',
        countryCode: 'BR',
        postalCode: cleanCep,
      };

      setFormData(prev => ({
        ...prev,
        address: newAddress,
      }));

    } catch (error) {
      setCepError(error.userMessage || translateError(error) || 'Erro ao buscar CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  const getOriginalData = () => buildFormData(user);

  const buildPatchPayload = () => {
    const payload = {};
    const original = getOriginalData();
    const trimmed = (val) => (typeof val === 'string' ? val.trim() : val);

    // Top-level fields: only include if changed
    // firstName/lastName have minLength:1 on backend, so skip if empty
    if (trimmed(formData.firstName) !== trimmed(original.firstName)) {
      if (trimmed(formData.firstName)) payload.firstName = trimmed(formData.firstName);
    }
    if (trimmed(formData.lastName) !== trimmed(original.lastName)) {
      if (trimmed(formData.lastName)) payload.lastName = trimmed(formData.lastName);
    }
    if (formData.gender !== original.gender && formData.gender) {
      payload.gender = formData.gender;
    }
    if (formData.birthDate !== original.birthDate && formData.birthDate) {
      payload.birthDate = formData.birthDate;
    }

    // Address: include only changed fields
    const addr = formData.address;
    const origAddr = original.address;
    const patchAddr = {};
    for (const key of Object.keys(addr)) {
      const val = trimmed(addr[key]);
      const origVal = trimmed(origAddr[key]);
      if (val !== origVal) {
        if (val) {
          patchAddr[key] = val;
        }
        // If field had value and now empty, we omit (backend doesn't accept empty strings for address fields)
      }
    }
    if (Object.keys(patchAddr).length > 0) payload.address = patchAddr;

    // Socials: include only changed fields
    const soc = formData.socials;
    const origSoc = original.socials;
    const patchSoc = {};
    for (const key of Object.keys(soc)) {
      const val = trimmed(soc[key]);
      const origVal = trimmed(origSoc[key]);
      if (val !== origVal) {
        if (val) {
          patchSoc[key] = val;
        }
        // If field had value and now empty, omit (backend doesn't support nullable on /me/profile socials)
      }
    }
    if (Object.keys(patchSoc).length > 0) payload.socials = patchSoc;

    return payload;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    const payload = buildPatchPayload();
    if (Object.keys(payload).length === 0) {
      showToast('Preencha ao menos um campo para salvar.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.patch('/me/profile', payload);
      updateUser(response.data);
      showToast('Perfil atualizado com sucesso!', 'success');
      setEditing(false);
      dropEditParams();

      const wasIncomplete = computeMissingProfileFields(user).length > 0;
      const isNowComplete = computeMissingProfileFields(response.data).length === 0;
      if (hasRole('TRAINER') && wasIncomplete && isNowComplete) {
        markOnboardingStepOptimistic('profileCompleted');
        navigate('/', { state: { justCompleted: 'profile' } });
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const dropEditParams = () => {
    if (!searchParams.has('edit') && !searchParams.has('focus')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    next.delete('focus');
    setSearchParams(next, { replace: true });
  };

  const handleCancel = () => {
    if (user) setFormData(buildFormData(user));
    setEditing(false);
  };

  const handleAvatarSelect = async (file) => {
    const fileErrorKey = getAvatarFileError(file);
    if (fileErrorKey) {
      showToast(t(fileErrorKey), 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      const response = await api.post('/me/avatar', buildAvatarFormData(file), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const merged = { ...user, avatarUrl: response.data.avatarUrl };
      updateUser(merged);
      showToast(t('profile.avatar.success'), 'success');
      if (hasRole('TRAINER') && computeMissingProfileFields(merged).length === 0) {
        markOnboardingStepOptimistic('profileCompleted');
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarInitials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  const flagFirstName = highlightMissing && !formData.firstName.trim();
  const flagLastName = highlightMissing && !formData.lastName.trim();
  const flagAvatar = highlightMissing && !user?.avatarUrl;

  // Tweak 2 & 6: Compute empty field counts for each section
  const fullName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null;
  const genderDisplay = formatGender(user?.gender);
  const birthDateDisplay = formatDateForDisplay(user?.birthDate);

  const personalFields = [fullName, genderDisplay, birthDateDisplay];
  const personalEmptyCount = countEmptyFields(personalFields);

  const addressData = formatCompactAddress(user?.address);
  const addressFields = [
    user?.address?.line1,
    user?.address?.neighborhood,
    user?.address?.city,
    user?.address?.postalCode,
  ];
  const addressEmptyCount = addressData ? countEmptyFields(addressFields) : addressFields.length;

  const socialsFields = [
    user?.socials?.instagram,
    user?.socials?.whatsapp,
    user?.socials?.linkedin,
  ];
  const socialsEmptyCount = countEmptyFields(socialsFields);

  return (
    <div>
      <div className="card card--mb">
        <div className="card-header">
          <h2 className="card-title">Informações do Perfil</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-primary">
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleProfileUpdate} className="form fade-in">
            <div className="profile-section">
              <h3 className="profile-section-title">Dados Pessoais</h3>

              <ProfileAvatarField
                avatarUrl={user?.avatarUrl}
                uploading={uploadingAvatar}
                invalid={flagAvatar}
                onSelect={handleAvatarSelect}
              />

              <div className="grid-responsive-2col">
                <div>
                  <label className="form-label" htmlFor="profile-first-name">Nome</label>
                  <input
                    id="profile-first-name"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`form-input${flagFirstName ? ' form-input--error' : ''}`}
                    aria-invalid={flagFirstName ? 'true' : undefined}
                    aria-describedby={flagFirstName ? 'profile-first-name-error' : undefined}
                    disabled={loading}
                  />
                  {flagFirstName && <span id="profile-first-name-error" className="form-error">{t('profile.firstName.required')}</span>}
                </div>

                <div>
                  <label className="form-label" htmlFor="profile-last-name">Sobrenome</label>
                  <input
                    id="profile-last-name"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`form-input${flagLastName ? ' form-input--error' : ''}`}
                    aria-invalid={flagLastName ? 'true' : undefined}
                    aria-describedby={flagLastName ? 'profile-last-name-error' : undefined}
                    disabled={loading}
                  />
                  {flagLastName && <span id="profile-last-name-error" className="form-error">{t('profile.lastName.required')}</span>}
                </div>
              </div>

              <div className="grid-responsive-2col">
                <div>
                  <label className="form-label">Gênero</label>
                  <Select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">Selecione...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </Select>
                </div>

                <div>
                  <label className="form-label">Data de Nascimento</label>
                  <DateInput
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="form-input"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="profile-section-title">Endereço</h3>

              <div>
                <label className="form-label">CEP</label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCepError('');
                    setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, postalCode: value }
                    }));
                    if (value.replace(/\D/g, '').length === 8) {
                      handleCepLookup(value);
                    }
                  }}
                  className={`form-input${cepError ? ' form-input--error' : ''}`}
                  placeholder="00000-000"
                  disabled={loading || loadingCep}
                />
                {loadingCep && <p className="text-sm text-muted">Buscando CEP...</p>}
                {cepError && <span className="form-error">{cepError}</span>}
              </div>

              <div>
                <label className="form-label">Logradouro</label>
                <input
                  type="text"
                  value={formData.address.line1}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, line1: e.target.value }
                  }))}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="form-label">Complemento</label>
                <input
                  type="text"
                  value={formData.address.line2}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, line2: e.target.value }
                  }))}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="form-label">Bairro</label>
                <input
                  type="text"
                  value={formData.address.neighborhood}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, neighborhood: e.target.value }
                  }))}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              {/* Tweak 5: City + UF on same line */}
              <div className="grid-city-uf">
                <div>
                  <label className="form-label">Cidade</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="form-input"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="form-label">UF</label>
                  <input
                    type="text"
                    value={formData.address.stateCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, stateCode: e.target.value.toUpperCase() }
                    }))}
                    className="form-input"
                    maxLength="2"
                    disabled={loading}
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>

            {!hasRole('TRAINER') && (
              <div className="profile-section">
                <h3 className="profile-section-title">Redes Sociais</h3>

                <div>
                  <label className="form-label">Instagram</label>
                  <input
                    type="text"
                    value={formData.socials.instagram}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socials: { ...prev.socials, instagram: e.target.value }
                    }))}
                    className="form-input"
                    placeholder="@usuario"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="form-label">WhatsApp</label>
                  <input
                    type="text"
                    value={formData.socials.whatsapp}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socials: { ...prev.socials, whatsapp: e.target.value }
                    }))}
                    className="form-input"
                    placeholder="+55 11 99999-9999"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="form-label">LinkedIn</label>
                  <input
                    type="text"
                    value={formData.socials.linkedin}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socials: { ...prev.socials, linkedin: e.target.value }
                    }))}
                    className="form-input"
                    placeholder="https://linkedin.com/in/usuario"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="btn-group profile-form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={handleCancel} disabled={loading} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-display fade-in">
            <div className="profile-avatar-row">
              <ProfileAvatar avatarUrl={user?.avatarUrl} initials={avatarInitials} />
              <div className="profile-avatar-info">
                <span className="profile-avatar-name">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}</span>
                <span className="profile-avatar-email">{user?.email}</span>
              </div>
            </div>

            <div className="profile-section">
              <SectionHeader title="Dados Pessoais" emptyCount={personalEmptyCount} />
              <div className="info-stacked">
                <div>
                  <span className="info-label">E-mail</span>
                  <span className="info-value">{user?.email}</span>
                </div>
                {fullName && (
                  <div>
                    <span className="info-label">Nome</span>
                    <span className="info-value">{fullName}</span>
                  </div>
                )}
                {genderDisplay && (
                  <div>
                    <span className="info-label">Gênero</span>
                    <span className="info-value">{genderDisplay}</span>
                  </div>
                )}
                {birthDateDisplay && (
                  <div>
                    <span className="info-label">Data de Nascimento</span>
                    <span className="info-value">{birthDateDisplay}</span>
                  </div>
                )}
              </div>
              {personalEmptyCount > 0 && (
                <p className="info-empty-summary">
                  {personalEmptyCount} {personalEmptyCount === 1 ? 'campo não preenchido' : 'campos não preenchidos'}
                </p>
              )}
            </div>

            <div className="profile-section">
              <SectionHeader title="Endereço" emptyCount={addressEmptyCount} />
              {addressData ? (
                <div className="address-compact">
                  {addressData.line1 && <span>{addressData.line1}</span>}
                  {addressData.line2 && <span>{addressData.line2}</span>}
                </div>
              ) : (
                <p className="text-muted">Endereço não informado</p>
              )}
              {addressData && addressEmptyCount > 0 && (
                <p className="info-empty-summary">
                  {addressEmptyCount} {addressEmptyCount === 1 ? 'campo não preenchido' : 'campos não preenchidos'}
                </p>
              )}
            </div>

            {!hasRole('TRAINER') && (
              <div className="profile-section">
                <SectionHeader title="Redes Sociais" emptyCount={socialsEmptyCount} />
                {socialsEmptyCount === socialsFields.length ? (
                  <p className="info-empty-summary">
                    {socialsEmptyCount} campos não preenchidos
                  </p>
                ) : (
                  <div className="info-stacked">
                    {user?.socials?.instagram && (
                      <div>
                        <span className="info-label">Instagram</span>
                        <span className="info-value">{user.socials.instagram}</span>
                      </div>
                    )}
                    {user?.socials?.whatsapp && (
                      <div>
                        <span className="info-label">WhatsApp</span>
                        <span className="info-value">{user.socials.whatsapp}</span>
                      </div>
                    )}
                    {user?.socials?.linkedin && (
                      <div>
                        <span className="info-label">LinkedIn</span>
                        <span className="info-value">{user.socials.linkedin}</span>
                      </div>
                    )}
                  </div>
                )}
                {socialsEmptyCount > 0 && socialsEmptyCount < socialsFields.length && (
                  <p className="info-empty-summary">
                    {socialsEmptyCount} {socialsEmptyCount === 1 ? 'campo não preenchido' : 'campos não preenchidos'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {hasRole('TRAINER') && <TrainerProfileSection />}
      {hasRole('NUTRITIONIST') && <NutritionistProfileSection />}

      <div className="card card--account">
        <div className="card-header">
          <h2 className="card-title">Conta</h2>
        </div>
        <button onClick={handleLogout} className="account-action-row">
          <LogOut size={18} strokeWidth={1.6} className="account-action-row__icon" />
          Sair da conta
        </button>
      </div>

    </div>
  );
};

export default Profile;

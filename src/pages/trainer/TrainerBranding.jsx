import { useState, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const MAX_WELCOME_LENGTH = 200;

const validateFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Tipo de arquivo inválido. Apenas JPEG, PNG e WebP são permitidos.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Arquivo muito grande. O tamanho máximo é 5MB.';
  }
  return null;
};

const uploadFile = async (endpoint, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

const TrainerBranding = () => {
  const { showToast } = useToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [branding, setBranding] = useState(null);
  const [primaryColor, setPrimaryColor] = useState('#6D28D9');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [primaryColorError, setPrimaryColorError] = useState('');
  const [secondaryColorError, setSecondaryColorError] = useState('');

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    fetchBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBranding = async () => {
    setPageLoading(true);
    try {
      const response = await api.get('/trainer/branding');
      const data = response.data;
      setBranding(data);
      if (data) {
        setPrimaryColor(data.primaryColor || '#6D28D9');
        setSecondaryColor(data.secondaryColor || '');
        setWelcomeMessage(data.welcomeMessage || '');
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPageLoading(false);
    }
  };

  const handlePrimaryColorChange = (value) => {
    setPrimaryColor(value);
    if (value && !HEX_COLOR_REGEX.test(value)) {
      setPrimaryColorError('Formato inválido. Use #RRGGBB (ex: #FF5733)');
    } else {
      setPrimaryColorError('');
    }
  };

  const handleSecondaryColorChange = (value) => {
    setSecondaryColor(value);
    if (value && !HEX_COLOR_REGEX.test(value)) {
      setSecondaryColorError('Formato inválido. Use #RRGGBB (ex: #33A1FF)');
    } else {
      setSecondaryColorError('');
    }
  };

  const handleFileSelect = (file, type) => {
    const error = validateFile(file);
    if (error) {
      showToast(error, 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === 'logo') {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(file);
      setCoverPreview(previewUrl);
    }
  };

  const handleRemoveFile = (type) => {
    if (type === 'logo') {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(null);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(null);
      setCoverPreview(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!HEX_COLOR_REGEX.test(primaryColor)) {
      setPrimaryColorError('Formato inválido. Use #RRGGBB (ex: #FF5733)');
      return;
    }

    if (secondaryColor && !HEX_COLOR_REGEX.test(secondaryColor)) {
      setSecondaryColorError('Formato inválido. Use #RRGGBB (ex: #33A1FF)');
      return;
    }

    setSaving(true);
    try {
      const payload = { primaryColor };
      payload.secondaryColor = secondaryColor && HEX_COLOR_REGEX.test(secondaryColor) ? secondaryColor : null;
      if (welcomeMessage.trim()) {
        payload.welcomeMessage = welcomeMessage.trim();
      } else {
        payload.welcomeMessage = null;
      }

      const response = await api.put('/trainer/branding', payload);
      setBranding(response.data);
      showToast('Personalização salva com sucesso!', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const data = await uploadFile('/trainer/branding/logo', logoFile);
      setBranding(data);
      setLogoFile(null);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      showToast('Logo enviado com sucesso!', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadCover = async () => {
    if (!coverFile) return;
    setUploadingCover(true);
    try {
      const data = await uploadFile('/trainer/branding/cover', coverFile);
      setBranding(data);
      setCoverFile(null);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
      showToast('Capa enviada com sucesso!', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const isBusy = saving || uploadingLogo || uploadingCover;
  const hasColorErrors = !!primaryColorError || !!secondaryColorError;
  const logoSrc = logoPreview || branding?.logoUrl;
  const coverSrc = coverPreview || branding?.coverImageUrl;
  const welcomeLength = welcomeMessage.length;

  if (pageLoading) {
    return (
      <div>
        <h1 className="page-title">Personalização</h1>
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Personalização</h1>

      {/* Color and Message section */}
      <div className="card card--mb">
        <div className="card-header">
          <h2 className="card-title">Cor e Mensagem</h2>
        </div>

        <form onSubmit={handleSave} className="form">
          <div className="form-group">
            <label className="form-label" htmlFor="primaryColor">Cor primária</label>
            <div className="branding-color-row">
              <input
                id="primaryColor"
                type="text"
                value={primaryColor}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                className={`form-input branding-color-input${primaryColorError ? ' form-input--error' : ''}`}
                placeholder="#6D28D9"
                maxLength={7}
                disabled={isBusy}
              />
              <input
                type="color"
                className="branding-color-swatch"
                value={HEX_COLOR_REGEX.test(primaryColor) ? primaryColor : '#6D28D9'}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                aria-label="Pré-visualização da cor primária"
                disabled={isBusy}
              />
            </div>
            {primaryColorError && <span className="form-error">{primaryColorError}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="secondaryColor">Cor secundária</label>
            <div className="branding-color-row">
              <input
                id="secondaryColor"
                type="text"
                value={secondaryColor}
                onChange={(e) => handleSecondaryColorChange(e.target.value)}
                className={`form-input branding-color-input${secondaryColorError ? ' form-input--error' : ''}`}
                placeholder="#33A1FF"
                maxLength={7}
                disabled={isBusy}
              />
              <input
                type="color"
                className="branding-color-swatch"
                value={HEX_COLOR_REGEX.test(secondaryColor) ? secondaryColor : '#33A1FF'}
                onChange={(e) => handleSecondaryColorChange(e.target.value)}
                aria-label="Pré-visualização da cor secundária"
                disabled={isBusy}
              />
            </div>
            {secondaryColorError && <span className="form-error">{secondaryColorError}</span>}
            <span className="text-sm text-muted">Opcional. Usada como cor de destaque.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="welcomeMessage">Mensagem de boas-vindas</label>
            <textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value.slice(0, MAX_WELCOME_LENGTH))}
              className="form-textarea"
              placeholder="Bem-vindo(a) ao meu espaço de treinos!"
              rows={3}
              maxLength={MAX_WELCOME_LENGTH}
              disabled={isBusy}
            />
            <span className="branding-char-count">
              {welcomeLength}/{MAX_WELCOME_LENGTH}
            </span>
          </div>

          <div className="btn-group">
            <button type="submit" disabled={isBusy || hasColorErrors} className="btn-primary">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      {/* Logo section */}
      <div className="card card--mb">
        <div className="card-header">
          <h2 className="card-title">Logo</h2>
        </div>

        <div className="branding-upload-section">
          {logoSrc && (
            <div className="branding-image-preview">
              <img src={logoSrc} alt="Logo atual" className="branding-logo-img" />
              {logoFile && (
                <button
                  type="button"
                  className="branding-remove-btn"
                  onClick={() => handleRemoveFile('logo')}
                  aria-label="Remover logo selecionado"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          <div className="branding-upload-controls">
            <label className="btn-secondary branding-file-label" htmlFor="logoInput">
              <Upload size={16} />
              Selecionar logo
            </label>
            <input
              id="logoInput"
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="branding-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'logo');
              }}
              disabled={isBusy}
            />
            {logoFile && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleUploadLogo}
                disabled={isBusy}
              >
                {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
              </button>
            )}
          </div>
          <p className="text-sm text-muted">JPEG, PNG ou WebP. Máximo 5MB.</p>
        </div>
      </div>

      {/* Cover section */}
      <div className="card card--mb">
        <div className="card-header">
          <h2 className="card-title">Imagem de capa</h2>
        </div>

        <div className="branding-upload-section">
          {coverSrc && (
            <div className="branding-image-preview">
              <img src={coverSrc} alt="Capa atual" className="branding-cover-img" />
              {coverFile && (
                <button
                  type="button"
                  className="branding-remove-btn"
                  onClick={() => handleRemoveFile('cover')}
                  aria-label="Remover capa selecionada"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          <div className="branding-upload-controls">
            <label className="btn-secondary branding-file-label" htmlFor="coverInput">
              <Upload size={16} />
              Selecionar capa
            </label>
            <input
              id="coverInput"
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="branding-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, 'cover');
              }}
              disabled={isBusy}
            />
            {coverFile && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleUploadCover}
                disabled={isBusy}
              >
                {uploadingCover ? 'Enviando...' : 'Enviar capa'}
              </button>
            )}
          </div>
          <p className="text-sm text-muted">JPEG, PNG ou WebP. Máximo 5MB.</p>
        </div>
      </div>
    </div>
  );
};

export default TrainerBranding;

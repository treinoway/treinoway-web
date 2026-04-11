import { useState, useEffect } from 'react';
import { Palette, Info, X, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { hasLowContrast } from '../../utils/colorContrast';
import BrandingDismissibleBanner from './BrandingDismissibleBanner';
import BrandingPreview from './BrandingPreview';
import BrandingColorPicker from './BrandingColorPicker';
import BrandingAssetUpload from './BrandingAssetUpload';

const MAX_WELCOME_LENGTH = 200;
const DEFAULT_PRIMARY_COLOR = '#1565C0';
const BANNER_DISMISSED_KEY = 'branding_banner_dismissed';

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
  const [isBusy, setIsBusy] = useState(false);

  const [initialBranding, setInitialBranding] = useState(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [secondaryColor, setSecondaryColor] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
  );
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    fetchBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBranding = async () => {
    setPageLoading(true);
    try {
      const response = await api.get('/trainer/branding');
      const data = response.data;
      applyBrandingData(data);
      setInitialBranding(data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPageLoading(false);
    }
  };

  const applyBrandingData = (data) => {
    if (data) {
      setPrimaryColor(data.primaryColor || DEFAULT_PRIMARY_COLOR);
      setSecondaryColor(data.secondaryColor || '');
      setWelcomeMessage(data.welcomeMessage || '');
      setLogoUrl(data.logoUrl || null);
      setCoverUrl(data.coverImageUrl || null);
    } else {
      setPrimaryColor(DEFAULT_PRIMARY_COLOR);
      setSecondaryColor('');
      setWelcomeMessage('');
      setLogoUrl(null);
      setCoverUrl(null);
    }
  };

  const handleLogoSelect = (file, error) => {
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleCoverSelect = (file, error) => {
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleDiscard = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    applyBrandingData(initialBranding);
  };

  const handleSave = async () => {
    setIsBusy(true);
    try {
      const results = await Promise.allSettled([
        api.put('/trainer/branding', {
          primaryColor,
          secondaryColor: secondaryColor || null,
          welcomeMessage: welcomeMessage.trim() || null,
        }),
        logoFile ? uploadFile('/trainer/branding/logo', logoFile) : Promise.resolve(null),
        coverFile ? uploadFile('/trainer/branding/cover', coverFile) : Promise.resolve(null),
      ]);

      const failures = results.filter((r) => r.status === 'rejected');

      if (failures.length === 0) {
        showToast('Marca salva com sucesso!', 'success');
        const putResult = results[0].value;
        const newBranding = putResult?.data ?? initialBranding;
        const logoResult = results[1].value?.data;
        const coverResult = results[2].value?.data;
        const merged = {
          ...newBranding,
          ...(logoResult ? { logoUrl: logoResult.logoUrl } : {}),
          ...(coverResult ? { coverImageUrl: coverResult.coverImageUrl } : {}),
        };
        setInitialBranding(merged);
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setLogoFile(null);
        setLogoPreview(null);
        setCoverFile(null);
        setCoverPreview(null);
        applyBrandingData(merged);
      } else if (failures.length < results.length) {
        showToast('Algumas alterações falharam ao salvar. Tente novamente.', 'warning');
      } else {
        const firstError = failures[0].reason;
        showToast(firstError?.userMessage || translateError(firstError), 'error');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleDismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setBannerDismissed(true);
  };

  const isDirty = (() => {
    const initial = initialBranding;
    if (logoFile || coverFile) return true;
    if (!initial) {
      return (
        primaryColor !== DEFAULT_PRIMARY_COLOR ||
        secondaryColor !== '' ||
        welcomeMessage !== ''
      );
    }
    return (
      primaryColor !== (initial.primaryColor || DEFAULT_PRIMARY_COLOR) ||
      secondaryColor !== (initial.secondaryColor || '') ||
      welcomeMessage !== (initial.welcomeMessage || '')
    );
  })();

  const isBrandingConfigured =
    !!logoUrl && primaryColor !== DEFAULT_PRIMARY_COLOR;

  const showBanner =
    !bannerDismissed &&
    !logoUrl &&
    !coverUrl &&
    primaryColor === DEFAULT_PRIMARY_COLOR &&
    !welcomeMessage;

  const displayLogoUrl = logoPreview || logoUrl;
  const displayCoverUrl = coverPreview || coverUrl;
  const primaryContrastWarning = hasLowContrast(primaryColor);

  if (pageLoading) {
    return (
      <div>
        <div className="page-header-title-row">
          <Palette size={24} className="page-header-title-icon" />
          <h1>Sua Marca</h1>
        </div>
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      </div>
    );
  }

  const formCard = (
    <div className="card card--mb">
      {/* Logo */}
      <div className="branding-section">
        <h2 className="branding-section-title">Logo</h2>
        <BrandingAssetUpload
          label="Logo"
          description="Aparece no topo do app de todos os seus alunos."
          currentUrl={displayLogoUrl}
          onFileSelect={handleLogoSelect}
          aspect="square"
          isUploading={isBusy}
        />
      </div>

      {/* Colors */}
      <div className="branding-section">
        <h2 className="branding-section-title">Cores</h2>
        <p className="branding-section-desc">Definem botões e destaques no app do aluno.</p>
        <BrandingColorPicker
          label="Cor principal"
          value={primaryColor}
          onChange={setPrimaryColor}
          contrastWarning={primaryContrastWarning}
        />
        <BrandingColorPicker
          label="Cor de destaque"
          value={secondaryColor}
          onChange={setSecondaryColor}
          optional
        />
      </div>

      {/* Cover */}
      <div className="branding-section">
        <h2 className="branding-section-title">Imagem de capa</h2>
        <BrandingAssetUpload
          label="Imagem de capa"
          description="Banner exibido na tela inicial do aluno."
          currentUrl={displayCoverUrl}
          onFileSelect={handleCoverSelect}
          aspect="cover"
          isUploading={isBusy}
        />
      </div>

      {/* Welcome message */}
      <div className="branding-section">
        <h2 className="branding-section-title">Mensagem de boas-vindas</h2>
        <p className="branding-section-desc">Texto exibido para o aluno ao abrir o app.</p>
        <div className="form-group">
          <textarea
            id="welcomeMessage"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value.slice(0, MAX_WELCOME_LENGTH))}
            className="form-textarea"
            placeholder="Ex: Foco e consistência. Vamos treinar hoje!"
            rows={3}
            maxLength={MAX_WELCOME_LENGTH}
            disabled={isBusy}
            aria-label="Mensagem de boas-vindas"
          />
          <span className="branding-char-count">
            {welcomeMessage.length}/{MAX_WELCOME_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );

  const footerButtons = (
    <div className="branding-sticky-footer">
      <button
        type="button"
        className="btn-secondary"
        onClick={handleDiscard}
        disabled={isBusy}
      >
        Descartar
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={handleSave}
        disabled={!isDirty || isBusy}
      >
        {isBusy ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div className="page-header-title-row">
        <Palette size={24} className="page-header-title-icon" />
        <h1>Sua Marca</h1>
        {isBrandingConfigured && (
          <span className="branding-configured-badge">
            <CheckCircle size={12} /> Marca configurada
          </span>
        )}
        <button
          type="button"
          className="branding-info-btn"
          onClick={() => setShowBottomSheet(true)}
          aria-label="Informações sobre personalização"
        >
          <Info size={16} />
        </button>
      </div>

      {/* Onboarding banner */}
      {showBanner && (
        <BrandingDismissibleBanner
          onHowItWorks={() => setShowBottomSheet(true)}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* Mobile: preview toggle */}
      <div className="branding-split-layout">
        <div className="branding-split-form">
          <button
            type="button"
            className="branding-preview-toggle"
            onClick={() => setPreviewExpanded((prev) => !prev)}
          >
            {previewExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
            {previewExpanded ? 'Ocultar prévia' : 'Ver prévia aproximada'}
          </button>

          {previewExpanded && (
            <BrandingPreview
              logoUrl={displayLogoUrl}
              coverUrl={displayCoverUrl}
              primaryColor={primaryColor}
              welcomeMessage={welcomeMessage}
            />
          )}

          {formCard}
          {footerButtons}
        </div>

        <div className="branding-split-preview">
          <BrandingPreview
            logoUrl={displayLogoUrl}
            coverUrl={displayCoverUrl}
            primaryColor={primaryColor}
            welcomeMessage={welcomeMessage}
          />
        </div>
      </div>

      {/* Info bottom sheet */}
      {showBottomSheet && (
        <div className="overlay" onClick={() => setShowBottomSheet(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">O que você pode personalizar</h2>
              <button
                className="bottom-sheet-close"
                onClick={() => setShowBottomSheet(false)}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <div className="branding-section">
                <h3 className="branding-section-title">Logo</h3>
                <p className="branding-section-desc">
                  Aparece no canto superior do app do aluno, identificando sua marca a cada acesso.
                </p>
              </div>
              <div className="branding-section">
                <h3 className="branding-section-title">Cores</h3>
                <p className="branding-section-desc">
                  A cor principal define botões, títulos e destaques. A de destaque é opcional.
                </p>
              </div>
              <div className="branding-section">
                <h3 className="branding-section-title">Imagem de capa</h3>
                <p className="branding-section-desc">
                  Banner que aparece na tela principal do aluno. Use uma foto do seu espaço ou logomarca.
                </p>
              </div>
              <div className="branding-section">
                <h3 className="branding-section-title">Mensagem de boas-vindas</h3>
                <p className="branding-section-desc">
                  Texto motivacional que saúda o aluno ao entrar. Máximo 200 caracteres.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerBranding;

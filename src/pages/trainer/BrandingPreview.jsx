import { Eye, Image, Info } from 'lucide-react';

const BrandingPreview = ({ logoUrl, coverUrl, primaryColor, welcomeMessage }) => {
  const headerBg = primaryColor || '#1565C0';

  return (
    <div className="branding-preview-card">
      <div className="branding-preview-card-header">
        <span className="branding-preview-card-title">
          <Eye size={14} /> Prévia aproximada
        </span>
      </div>
      <div className="app-mock">
        <div className="app-mock-header" style={{ background: headerBg }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="app-mock-logo-img" />
            : (
              <div className="app-mock-logo-placeholder">
                <Image size={14} />
              </div>
            )
          }
          <span className="app-mock-trainer-name">Meu Studio</span>
        </div>
        <div className="app-mock-body">
          {coverUrl
            ? <img src={coverUrl} alt="Capa" className="app-mock-cover-img" />
            : <div className="app-mock-cover-placeholder" />
          }
          {welcomeMessage && (
            <p className="app-mock-welcome">{welcomeMessage}</p>
          )}
          <div className="app-mock-card">
            <div>
              <div className="app-mock-card-title">Treino A — Peito</div>
              <div className="app-mock-card-subtitle">6 exercícios · 45 min</div>
            </div>
            <div className="app-mock-pill" style={{ background: headerBg }}>Ver</div>
          </div>
        </div>
      </div>
      <div className="branding-preview-disclaimer">
        <Info size={12} />
        A aparência final pode variar conforme o dispositivo do aluno.
      </div>
    </div>
  );
};

export default BrandingPreview;

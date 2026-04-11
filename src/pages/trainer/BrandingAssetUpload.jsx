import { useRef } from 'react';
import { Upload } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const BrandingAssetUpload = ({
  label,
  description,
  currentUrl,
  onFileSelect,
  aspect,
  isUploading,
}) => {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      onFileSelect(null, 'Tipo de arquivo inválido. Apenas JPEG, PNG e WebP são permitidos.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onFileSelect(null, 'Arquivo muito grande. O tamanho máximo é 5MB.');
      return;
    }

    onFileSelect(file, null);
  };

  return (
    <div>
      {description && (
        <p className="branding-section-desc">{description}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="branding-file-input"
        onChange={handleFileChange}
        disabled={isUploading}
        aria-label={`Selecionar ${label}`}
      />
      {currentUrl
        ? (
          <div className={`branding-asset-preview branding-asset-preview--${aspect}`}>
            <img src={currentUrl} alt={label} />
            <button
              type="button"
              className="branding-asset-change-btn"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload size={12} /> Trocar
            </button>
          </div>
        )
        : (
          <div
            className="branding-upload-area"
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
          >
            <div className="branding-upload-area-icon">
              <Upload size={20} />
            </div>
            <span className="branding-upload-area-label">Enviar {label.toLowerCase()}</span>
            <span className="branding-upload-area-hint">JPEG, PNG ou WebP · Máx. 5MB</span>
          </div>
        )
      }
    </div>
  );
};

export default BrandingAssetUpload;

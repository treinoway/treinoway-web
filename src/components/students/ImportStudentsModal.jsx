import PropTypes from 'prop-types';
import { Users, Zap, Info, ChevronRight } from 'lucide-react';
import Modal from '../ds/Modal';
import ImportPreviewTable from './ImportPreviewTable';

const IMPORT_MODAL_TITLES = {
  platform: 'Importar alunos',
  upload: 'Importar do PrimeCoaching',
  preview: 'Alunos do PrimeCoaching',
};

const STEPS = [
  { id: 'platform', label: '01 Plataforma' },
  { id: 'upload', label: '02 Arquivo' },
  { id: 'preview', label: '03 Revisar' },
];

const StepIndicator = ({ step }) => (
  <ol className="import-steps type-caption-strong" aria-label="Progresso de importação">
    {STEPS.map((item) => (
      <li
        key={item.id}
        className={`import-steps__item${item.id === step ? ' import-steps__item--active' : ''}`}
        aria-current={item.id === step ? 'step' : undefined}
      >
        {item.label}
      </li>
    ))}
  </ol>
);

StepIndicator.propTypes = {
  step: PropTypes.oneOf(['platform', 'upload', 'preview']).isRequired,
};

const PlatformStep = ({ onSelectPlatform }) => (
  <>
    <p className="field-hint type-body">Selecione a plataforma de origem.</p>
    <button type="button" className="import-platform" onClick={onSelectPlatform}>
      <span className="import-platform__icon" aria-hidden="true">
        <Zap size={20} strokeWidth={2} />
      </span>
      <span className="import-platform__text">
        <span className="type-body-strong">PrimeCoaching</span>
        <span className="type-caption">Importar alunos da sua conta PrimeCoaching</span>
      </span>
      <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  </>
);

PlatformStep.propTypes = { onSelectPlatform: PropTypes.func.isRequired };

const UploadStep = ({ formId, onSubmitPreview, onFileChange, importLoading }) => (
  <form id={formId} onSubmit={onSubmitPreview}>
    <div className="ds-banner">
      <span className="ds-banner__icon" aria-hidden="true">
        <Info size={20} strokeWidth={2} />
      </span>
      <span className="ds-banner__text type-body">
        Acesse o PrimeCoaching, exporte a lista de alunos em formato XLSX e faça o upload do arquivo abaixo.
      </span>
    </div>
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="import-file">
        Arquivo XLSX do PrimeCoaching
      </label>
      <input
        id="import-file"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={onFileChange}
        className="input"
        required
        disabled={importLoading}
      />
    </div>
  </form>
);

UploadStep.propTypes = {
  formId: PropTypes.string.isRequired,
  onSubmitPreview: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  importLoading: PropTypes.bool.isRequired,
};

const PreviewSummary = ({ summary, selectedCount }) => (
  <div className="import-summary type-body" role="status">
    <Users size={16} strokeWidth={2} aria-hidden="true" />
    <span>
      <strong>{summary.total}</strong> {summary.total === 1 ? 'aluno encontrado' : 'alunos encontrados'}
    </span>
    <span className="import-summary__muted">
      · <strong>{summary.duplicateEmails}</strong> {summary.duplicateEmails === 1 ? 'duplicado' : 'duplicados'}
    </span>
    <span className="import-summary__right">
      <strong>{selectedCount}</strong> selecionados
    </span>
  </div>
);

PreviewSummary.propTypes = {
  summary: PropTypes.shape({ total: PropTypes.number, duplicateEmails: PropTypes.number }).isRequired,
  selectedCount: PropTypes.number.isRequired,
};

const UPLOAD_FORM_ID = 'import-upload-form';

const buildFooter = ({ importStep, importFile, importLoading, selectedEmails, onGoBack, onSendInvites }) => {
  if (importStep === 'platform') return null;
  const back = (
    <button type="button" className="btn btn--secondary" onClick={onGoBack} disabled={importLoading}>
      Voltar
    </button>
  );
  if (importStep === 'upload') {
    return (
      <>
        {back}
        <button type="submit" form={UPLOAD_FORM_ID} className="btn btn--primary" disabled={importLoading || !importFile}>
          {importLoading ? 'Processando…' : 'Continuar'}
        </button>
      </>
    );
  }
  const count = selectedEmails.size;
  return (
    <>
      {back}
      <button type="button" className="btn btn--primary" disabled={count === 0} onClick={onSendInvites}>
        Enviar {count} convite{count !== 1 ? 's' : ''}
      </button>
    </>
  );
};

const ImportStudentsModal = (props) => {
  const { onClose, importStep, onSelectPlatform, onFileChange, importLoading, onSubmitPreview, importData } = props;
  const { selectedEmails, onToggleStudent, onToggleAll } = props;

  return (
    <Modal
      title={IMPORT_MODAL_TITLES[importStep]}
      onClose={onClose}
      wide={importStep === 'preview'}
      footer={buildFooter(props)}
    >
      <StepIndicator step={importStep} />
      {importStep === 'platform' && <PlatformStep onSelectPlatform={onSelectPlatform} />}
      {importStep === 'upload' && (
        <UploadStep
          formId={UPLOAD_FORM_ID}
          onSubmitPreview={onSubmitPreview}
          onFileChange={onFileChange}
          importLoading={importLoading}
        />
      )}
      {importStep === 'preview' && importData && (
        <>
          <PreviewSummary summary={importData.summary} selectedCount={selectedEmails.size} />
          <ImportPreviewTable
            students={importData.students}
            selectedEmails={selectedEmails}
            onToggleStudent={onToggleStudent}
            onToggleAll={onToggleAll}
          />
        </>
      )}
    </Modal>
  );
};

ImportStudentsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  importStep: PropTypes.oneOf(['platform', 'upload', 'preview']).isRequired,
  onSelectPlatform: PropTypes.func.isRequired,
  onGoBack: PropTypes.func.isRequired,
  importFile: PropTypes.object,
  onFileChange: PropTypes.func.isRequired,
  importLoading: PropTypes.bool.isRequired,
  onSubmitPreview: PropTypes.func.isRequired,
  importData: PropTypes.shape({
    students: PropTypes.array.isRequired,
    summary: PropTypes.shape({
      total: PropTypes.number.isRequired,
      duplicateEmails: PropTypes.number.isRequired,
    }).isRequired,
  }),
  selectedEmails: PropTypes.instanceOf(Set).isRequired,
  onToggleStudent: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  onSendInvites: PropTypes.func.isRequired,
};

export default ImportStudentsModal;

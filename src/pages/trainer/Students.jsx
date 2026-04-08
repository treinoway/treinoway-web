import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { X, MoreVertical, Upload, FileSpreadsheet, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const StudentRowMenu = ({ student, onUnlink }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="row-menu" ref={menuRef}>
      <button
        className="row-menu-trigger"
        aria-label="Ações do aluno"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical size={18} strokeWidth={1.6} />
      </button>
      {open && (
        <div className="row-menu-dropdown">
          <Link
            to={`/trainer/students/${student.id}`}
            state={{ student }}
            className="row-menu-item"
            onClick={() => setOpen(false)}
          >
            Ver Perfil
          </Link>
          <Link
            to={`/trainer/protocols/new?studentId=${student.id}`}
            className="row-menu-item"
            onClick={() => setOpen(false)}
          >
            Criar Rotina
          </Link>
          <button
            className="row-menu-item row-menu-item--danger"
            onClick={() => {
              setOpen(false);
              onUnlink(student);
            }}
          >
            Desvincular
          </button>
        </div>
      )}
    </div>
  );
};

StudentRowMenu.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  onUnlink: PropTypes.func.isRequired,
};

const ImportPreviewTable = ({ students, selectedEmails, onToggleStudent, onToggleAll }) => {
  const allSelected = students.length > 0 && students.every((s) => s.email && selectedEmails.has(s.email));

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type="checkbox"
                aria-label="Selecionar todos"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>
            <th>Nome</th>
            <th className="table-col-desktop-only">E-mail</th>
            <th className="table-col-desktop-only">Plano</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <tr key={student.email || index}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${student.fullName || student.email}`}
                  checked={!!student.email && selectedEmails.has(student.email)}
                  onChange={() => onToggleStudent(student.email)}
                  disabled={!student.email}
                />
              </td>
              <td>
                <span>{student.fullName}</span>
                <span className="table-col-mobile-only text-sm text-muted">
                  {student.email || '—'}
                </span>
              </td>
              <td className="table-col-desktop-only">{student.email || '—'}</td>
              <td className="table-col-desktop-only">{student.plan || '—'}</td>
              <td>
                {student.duplicateEmail ? (
                  <span className="badge badge-red">Duplicado</span>
                ) : (
                  <span className="badge badge-green">{student.status || '—'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ImportPreviewTable.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      fullName: PropTypes.string,
      email: PropTypes.string,
      plan: PropTypes.string,
      status: PropTypes.string,
      duplicateEmail: PropTypes.bool,
    })
  ).isRequired,
  selectedEmails: PropTypes.instanceOf(Set).isRequired,
  onToggleStudent: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
};

const ImportSummaryBar = ({ summary }) => {
  return (
    <div className="import-summary" role="status">
      <span className="font-medium">
        {summary.total} {summary.total === 1 ? 'aluno encontrado' : 'alunos encontrados'}
      </span>
      <span className="text-muted"> · </span>
      <span className="text-muted">
        {summary.duplicateEmails} {summary.duplicateEmails === 1 ? 'duplicado' : 'duplicados'}
      </span>
    </div>
  );
};

ImportSummaryBar.propTypes = {
  summary: PropTypes.shape({
    total: PropTypes.number.isRequired,
    withEmail: PropTypes.number.isRequired,
    withoutEmail: PropTypes.number.isRequired,
    duplicateEmails: PropTypes.number.isRequired,
  }).isRequired,
};

const Students = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [email, setEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('platform');
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [selectedEmails, setSelectedEmails] = useState(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/trainer/students');
      setStudents(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    setLinking(true);
    try {
      const response = await api.post('/trainer/students', { email });
      setStudents((prev) => [...prev, response.data]);
      showToast('Aluno vinculado com sucesso!', 'success');
      handleCloseForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkStudent = (student) => {
    const name = getStudentName(student) ?? student.email;
    setConfirmDialog({
      message: `Desvincular ${name}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/students/${student.id}`);
          setStudents((prev) => prev.filter((s) => s.id !== student.id));
          showToast('Aluno desvinculado com sucesso!', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleCloseForm = () => {
    setShowLinkForm(false);
    setEmail('');
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportStep('platform');
    setImportLoading(false);
    setImportData(null);
    setImportFile(null);
    setSelectedEmails(new Set());
  };

  const handleImportPreview = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await api.post('/trainer/import/primecoaching/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportData(response.data);
      setSelectedEmails(
        new Set(response.data.students.filter((s) => !s.duplicateEmail).map((s) => s.email))
      );
      setImportStep('preview');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleToggleStudent = (email) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleToggleAll = () => {
    const all = importData.students.map((s) => s.email).filter(Boolean);
    const anySelected = all.some((e) => selectedEmails.has(e));
    setSelectedEmails(anySelected ? new Set() : new Set(all));
  };

  const handleImportLink = () => {
    showToast(
      `Convite${selectedEmails.size !== 1 ? 's' : ''} enviado${selectedEmails.size !== 1 ? 's' : ''} com sucesso!`,
      'success'
    );
    handleCloseImportModal();
  };

  const getAvatarInitial = (student) => {
    if (student.firstName) return student.firstName.charAt(0).toUpperCase();
    return student.email.charAt(0).toUpperCase();
  };

  const getStudentName = (student) => {
    if (student.firstName || student.lastName) {
      return [student.firstName, student.lastName].filter(Boolean).join(' ');
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredStudents = normalizedQuery
    ? students.filter((s) => {
        const name = getStudentName(s) || '';
        const emailStr = s.email || '';
        return name.toLowerCase().includes(normalizedQuery) || emailStr.toLowerCase().includes(normalizedQuery);
      })
    : students;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Meus Alunos</h1>
        <div className="page-header-actions">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            <Upload size={16} strokeWidth={1.6} />
            Importar Alunos
          </button>
          {students.length > 0 && (
            <button onClick={() => setShowLinkForm(true)} className="btn-primary">
              + Vincular Aluno
            </button>
          )}
        </div>
      </div>

      {students.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            placeholder="Buscar por nome ou e-mail..."
            aria-label="Buscar alunos"
          />
        </div>
      )}

      {students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={48} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhum aluno vinculado ainda</p>
          <p>Vincule seu primeiro aluno para começar a gerenciar treinos</p>
          <button className="btn-primary" onClick={() => setShowLinkForm(true)}>
            + Vincular Aluno
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum resultado para &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th className="table-col-desktop-only">E-mail</th>
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <Link
                      to={`/trainer/students/${student.id}`}
                      state={{ student }}
                      className="student-card-link"
                    >
                      <div className="student-card-info" style={{ marginBottom: 0 }}>
                        <div className="student-avatar">{getAvatarInitial(student)}</div>
                        <div className="student-card-details">
                          <span className="student-card-name">
                            {getStudentName(student) ?? '—'}
                          </span>
                          <span className="student-card-email table-col-mobile-only">
                            {student.email}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="student-card-email table-col-desktop-only">{student.email}</td>
                  <td>
                    <StudentRowMenu student={student} onUnlink={handleUnlinkStudent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Desvincular
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkForm && (
        <div className="overlay">
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Vincular Aluno</h2>
              <button
                onClick={handleCloseForm}
                className="bottom-sheet-close"
                aria-label="Fechar"
              >
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleLinkStudent} className="form">
                <div>
                  <label className="form-label" htmlFor="student-email">
                    E-mail do aluno
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="aluno@email.com"
                    required
                    autoFocus
                    disabled={linking}
                  />
                </div>
                <div className="btn-group">
                  <button
                    type="submit"
                    disabled={linking}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    {linking ? 'Vinculando...' : 'Vincular'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="overlay">
          <div
            className={`bottom-sheet${importStep === 'preview' ? ' bottom-sheet--large' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">
                {importStep === 'platform' && 'Importar Alunos'}
                {importStep === 'upload' && 'Importar do PrimeCoaching'}
                {importStep === 'preview' && 'Alunos do PrimeCoaching'}
              </h2>
              <button
                onClick={handleCloseImportModal}
                className="bottom-sheet-close"
                aria-label="Fechar"
              >
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              {importStep === 'platform' && (
                <div className="form">
                  <p className="text-muted">Selecione a plataforma de origem</p>
                  <button
                    className="import-platform-card"
                    onClick={() => setImportStep('upload')}
                  >
                    <span className="import-platform-card__name">PrimeCoaching</span>
                    <span className="import-platform-card__description text-sm text-muted">
                      Importar alunos da sua conta PrimeCoaching
                    </span>
                  </button>
                </div>
              )}

              {importStep === 'upload' && (
                <form onSubmit={handleImportPreview} className="form">
                  <p className="import-security-notice">
                    <FileSpreadsheet size={14} strokeWidth={1.6} />
                    Acesse o PrimeCoaching, exporte a lista de alunos em formato XLSX e faça o upload do arquivo abaixo.
                  </p>
                  <div>
                    <label className="form-label" htmlFor="import-file">
                      Arquivo XLSX do PrimeCoaching
                    </label>
                    <input
                      id="import-file"
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(e) => setImportFile(e.target.files[0] ?? null)}
                      className="form-input"
                      required
                      disabled={importLoading}
                    />
                  </div>
                  <div className="btn-group">
                    <button
                      type="submit"
                      disabled={importLoading || !importFile}
                      className="btn-primary"
                      style={{ flex: 1 }}
                    >
                      {importLoading ? 'Processando arquivo...' : 'Importar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseImportModal}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      disabled={importLoading}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {importStep === 'preview' && importData && (
                <>
                  <ImportSummaryBar summary={importData.summary} />
                  <ImportPreviewTable
                    students={importData.students}
                    selectedEmails={selectedEmails}
                    onToggleStudent={handleToggleStudent}
                    onToggleAll={handleToggleAll}
                  />
                  <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
                    <button
                      type="button"
                      onClick={handleImportLink}
                      className="btn-primary"
                      style={{ flex: 1 }}
                      disabled={selectedEmails.size === 0}
                    >
                      Enviar convite por e-mail
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseImportModal}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      disabled={importLoading}
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

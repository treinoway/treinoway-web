import { useState, useEffect, useCallback, useRef } from 'react';
import { X, MoreVertical } from 'lucide-react';
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

const Students = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [email, setEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Alunos</h1>
        <button onClick={() => setShowLinkForm(true)} className="btn-primary">
          + Vincular Aluno
        </button>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum aluno vinculado ainda</p>
          <p>Clique em &quot;Vincular Aluno&quot; para adicionar seu primeiro aluno</p>
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
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
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
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
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
        <div className="overlay" onClick={handleCloseForm}>
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
    </div>
  );
};

export default Students;

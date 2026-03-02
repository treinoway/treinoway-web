import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';

const getAvatarInitial = (student) => {
  if (student?.firstName) return student.firstName.charAt(0).toUpperCase();
  if (student?.email) return student.email.charAt(0).toUpperCase();
  return '?';
};

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return null;
};

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'badge badge-green';
    case 'completed': return 'badge badge-gray';
    case 'cancelled': return 'badge badge-red';
    default: return 'badge badge-gray';
  }
};

const getStatusLabel = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'Ativo';
    case 'completed': return 'Concluído';
    case 'cancelled': return 'Cancelado';
    default: return status ?? '—';
  }
};

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [student, setStudent] = useState(null);
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [protocolsLoading, setProtocolsLoading] = useState(true);

  useEffect(() => {
    const stateStudent = location.state?.student;
    if (stateStudent) {
      setStudent(stateStudent);
      setLoading(false);
      return;
    }
    api.get('/trainer/students')
      .then((r) => setStudent(r.data.find((s) => String(s.id) === String(id)) ?? null))
      .catch((err) => showToast(err.userMessage || translateError(err), 'error'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProtocols = useCallback(async () => {
    setProtocolsLoading(true);
    try {
      const r = await api.get('/trainer/protocols', { params: { assigneeId: id } });
      setProtocols(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setProtocolsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          onClick={() => navigate('/trainer/students')}
          className="btn-back"
          aria-label="Voltar para alunos"
        >
          <ArrowLeft size={16} strokeWidth={1.6} />
          Alunos
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="student-card-info" style={{ marginBottom: 0 }}>
          <div className="student-avatar">{getAvatarInitial(student)}</div>
          <div className="student-card-details">
            <span className="student-card-name">
              {getStudentName(student) ?? student?.email ?? '—'}
            </span>
            {student?.email && getStudentName(student) && (
              <span className="student-card-email">{student.email}</span>
            )}
          </div>
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>Rotinas</h2>
        <Link to={`/trainer/protocols/new?studentId=${id}`} className="btn-primary">
          + Criar Rotina
        </Link>
      </div>

      {protocolsLoading ? (
        <div className="loading-screen">
          <span className="loading-text">Carregando rotinas...</span>
        </div>
      ) : protocols.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma rotina encontrada</p>
          <Link
            to={`/trainer/protocols/new?studentId=${id}`}
            className="btn-primary"
            style={{ marginTop: 'var(--spacing-md)' }}
          >
            Criar Rotina
          </Link>
        </div>
      ) : (
        <div className="stack-md">
          {protocols.map((protocol) => (
            <Link
              key={protocol.id}
              to={`/trainer/protocols/${protocol.id}`}
              className="card-link"
            >
              <div className="card-header">
                <span className="card-title" style={{ marginBottom: 0 }}>{protocol.name}</span>
                <span className={getStatusBadgeClass(protocol.status)}>
                  {getStatusLabel(protocol.status)}
                </span>
              </div>
              <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                {formatDateForDisplay(protocol.startDate)}
                {' – '}
                {formatDateForDisplay(protocol.expirationDate)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDetail;

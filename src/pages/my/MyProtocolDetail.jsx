import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { getWeekDayLabel } from '../../constants/weekDays';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';

const MyProtocolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProtocol();
  }, [id]);

  const fetchProtocol = async () => {
    try {
      const response = await api.get(`/my/protocols/${id}`);
      setProtocol(response.data);
      setTrainings(response.data.trainings || []);
    } catch (error) {
      console.error('Failed to fetch protocol:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'badge-status badge-green';
      case 'COMPLETED': return 'badge-status badge-blue';
      case 'CANCELLED': return 'badge-status badge-red';
      default: return 'badge-status badge-gray';
    }
  };

  const trainerLabel = [protocol?.trainer?.firstName, protocol?.trainer?.lastName]
    .filter(Boolean)
    .join(' ')
    || protocol?.trainer?.name
    || protocol?.trainer?.email
    || 'N/A';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">Carregando...</div>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Rotina não encontrada</p>
        <button
          onClick={() => navigate('/my/protocols')}
          className="btn-primary mt-md"
        >
          Voltar para Minhas Rotinas
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/my/protocols')} className="btn-back">
        <ArrowLeft size={16} strokeWidth={1.6} /> Voltar para Minhas Rotinas
      </button>

      <div className="card card--mb">
        <div className="card-header-start">
          <h1 className="page-title mb-0">Minha Rotina de Treino</h1>
          <span className={getStatusBadgeClass(protocol.status)}>
            {protocol.status}
          </span>
        </div>

        <div className="grid-responsive-2col text-sm">
          <div>
            <span className="info-label info-inline">Treinador:</span>
            <span className="info-value">
              {trainerLabel}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Início:</span>
            <span className="info-value">
              {formatDateForDisplay(protocol.startDate)}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Término:</span>
            <span className="info-value">
              {formatDateForDisplay(protocol.expirationDate || protocol.endDate)}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Total de Treinos:</span>
            <span className="info-value">{trainings.length}</span>
          </div>
          {protocol.type && (
            <div>
              <span className="info-label info-inline">Tipo:</span>
              <span className="info-value">{getProtocolTypeLabel(protocol.type)}</span>
            </div>
          )}
        </div>
      </div>

      <h2 className="card-title" style={{ marginBottom: 'var(--spacing-md)' }}>
        Treinos
      </h2>

      {trainings.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum treino ainda</p>
          <p>Seu treinador irá adicionar treinos a esta rotina</p>
        </div>
      ) : (
        <div className="stack-md">
          {trainings.map((training) => (
            <div key={training.id} className="training-card">
              <div className="training-card-header">
                <div>
                  <h3 className="training-card-title">{training.name}</h3>
                  <p className="training-card-desc mt-sm">{training.description}</p>
                  <div className="training-card-order" style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Ordem: {training.order}</span>
                    {getWeekDayLabel(training.weekDay) && (
                      <span className="badge badge-blue">
                        {getWeekDayLabel(training.weekDay)}
                      </span>
                    )}
                    {!training.weekDay && training.schedules && training.schedules.length > 0 && (
                      <div className="schedule-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                        {training.schedules.map((schedule) => (
                          <span key={schedule.id} className="schedule-badge">
                            Semana {schedule.weekNumber} - {getWeekDayLabel(schedule.weekday) || schedule.weekday}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProtocolDetail;

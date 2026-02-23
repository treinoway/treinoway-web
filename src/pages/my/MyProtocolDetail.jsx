import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';

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

  const weekdayLabels = {
    MONDAY: 'Segunda-feira',
    TUESDAY: 'Terça-feira',
    WEDNESDAY: 'Quarta-feira',
    THURSDAY: 'Quinta-feira',
    FRIDAY: 'Sexta-feira',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo',
  };

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
              {protocol.trainer?.user?.name || 'N/A'}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Início:</span>
            <span className="info-value">
              {new Date(protocol.startDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Término:</span>
            <span className="info-value">
              {new Date(protocol.endDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Total de Treinos:</span>
            <span className="info-value">{trainings.length}</span>
          </div>
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
                  <div className="training-card-order">Ordem: {training.order}</div>
                </div>
              </div>

              {training.schedules && training.schedules.length > 0 && (
                <div className="schedule-section">
                  <h4 className="schedule-title">Agendamento:</h4>
                  <div className="schedule-badges">
                    {training.schedules.map((schedule) => (
                      <div key={schedule.id} className="schedule-badge">
                        Semana {schedule.weekNumber} - {weekdayLabels[schedule.weekday] || schedule.weekday}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProtocolDetail;

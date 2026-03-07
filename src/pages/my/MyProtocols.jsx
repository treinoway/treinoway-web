import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';

const MyProtocols = () => {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      const response = await api.get('/my/protocols');
      setProtocols(response.data);
    } catch (error) {
      console.error('Failed to fetch protocols:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'badge badge-green';
      case 'COMPLETED': return 'badge badge-blue';
      case 'CANCELLED': return 'badge badge-red';
      default: return 'badge badge-gray';
    }
  };

  const getTrainerLabel = (trainer) => {
    return [trainer?.firstName, trainer?.lastName].filter(Boolean).join(' ')
      || trainer?.name
      || trainer?.email
      || 'N/A';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Minhas Rotinas</h1>

      {protocols.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma rotina atribuída ainda</p>
          <p>Seu treinador irá atribuir rotinas de treino a você</p>
        </div>
      ) : (
        <div className="grid-cards">
          {protocols.map((protocol) => (
            <Link
              key={protocol.id}
              to={`/my/protocols/${protocol.id}`}
              className="card-link"
            >
              <div className="card-header-start">
                <h3 className="card-subtitle">Rotina de Treino</h3>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {protocol.type && (
                    <span className="badge badge-blue">{getProtocolTypeLabel(protocol.type)}</span>
                  )}
                  <span className={getStatusBadgeClass(protocol.status)}>
                    {protocol.status}
                  </span>
                </div>
              </div>

              <div className="protocol-meta">
                <div>
                  <span className="font-medium">Treinador:</span>{' '}
                  {getTrainerLabel(protocol.trainer)}
                </div>
                <div>
                  <span className="font-medium">Inicio:</span>{' '}
                  {formatDateForDisplay(protocol.startDate)}
                </div>
                <div>
                  <span className="font-medium">Termino:</span>{' '}
                  {formatDateForDisplay(protocol.expirationDate || protocol.endDate)}
                </div>
              </div>

              <div className="protocol-detail-link">Ver Detalhes <ArrowRight size={14} strokeWidth={1.6} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProtocols;

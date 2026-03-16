import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapPin, Instagram, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import { getServiceModeLabel } from '../constants/serviceMode';

const TrainerAvatar = ({ avatarUrl, firstName, lastName }) => {
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  if (avatarUrl) {
    return <img src={avatarUrl} alt={`${firstName} ${lastName}`} className="trainer-card__avatar" />;
  }

  return <div className="trainer-card__avatar-placeholder" aria-hidden="true">{initials}</div>;
};

TrainerAvatar.propTypes = {
  avatarUrl: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
};

const TrainerCard = ({ trainer }) => {
  const fullName = [trainer.firstName, trainer.lastName].filter(Boolean).join(' ') || 'Treinador';
  const locationParts = [trainer.address?.city, trainer.address?.state, trainer.address?.country].filter(Boolean);
  const locationLabel = locationParts.join(', ') || null;
  const serviceModeLabel = getServiceModeLabel(trainer.serviceMode);

  return (
    <div className="card trainer-card">
      <div className="trainer-card__header">
        <TrainerAvatar
          avatarUrl={trainer.avatarUrl}
          firstName={trainer.firstName}
          lastName={trainer.lastName}
        />
        <div>
          <p className="trainer-card__name">{fullName}</p>
          {serviceModeLabel && (
            <span className="badge badge-blue">{serviceModeLabel}</span>
          )}
        </div>
      </div>

      <div className="trainer-card__meta">
        {locationLabel && (
          <div className="trainer-card__meta-row">
            <MapPin size={14} strokeWidth={1.6} />
            <span>{locationLabel}</span>
          </div>
        )}
        {trainer.socialNetworks?.instagram && (
          <div className="trainer-card__meta-row">
            <Instagram size={14} strokeWidth={1.6} />
            <span>{trainer.socialNetworks.instagram}</span>
          </div>
        )}
        {trainer.socialNetworks?.whatsapp && (
          <div className="trainer-card__meta-row">
            <MessageCircle size={14} strokeWidth={1.6} />
            <span>{trainer.socialNetworks.whatsapp}</span>
          </div>
        )}
      </div>
    </div>
  );
};

TrainerCard.propTypes = {
  trainer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
    serviceMode: PropTypes.string,
    address: PropTypes.shape({
      city: PropTypes.string,
      state: PropTypes.string,
      country: PropTypes.string,
    }),
    socialNetworks: PropTypes.shape({
      instagram: PropTypes.string,
      whatsapp: PropTypes.string,
    }),
  }).isRequired,
};

const Trainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const response = await api.get('/trainers');
      setTrainers(response.data);
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    } finally {
      setLoading(false);
    }
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
      <h1 className="page-title">Treinadores</h1>

      {trainers.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum treinador disponível</p>
          <p>Ainda não há treinadores cadastrados na plataforma.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {trainers.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Trainers;

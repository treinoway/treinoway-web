import { Salad, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const NutritionistOnboardingCard = () => (
  <section className="onboarding-card" aria-label="Perfil de nutricionista incompleto">
    <div className="onboarding-card-header">
      <h2 className="onboarding-card-title">Perfil de nutricionista incompleto</h2>
      <span className="badge badge-yellow">Pendente</span>
    </div>
    <p className="text-sm text-light" style={{ marginTop: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
      Complete seu perfil de nutricionista para começar a atender.
    </p>
    <Link to="/nutritionist/onboarding" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
      <Salad size={16} strokeWidth={2} />
      Completar cadastro
      <ArrowRight size={16} strokeWidth={2} />
    </Link>
  </section>
);

export default NutritionistOnboardingCard;

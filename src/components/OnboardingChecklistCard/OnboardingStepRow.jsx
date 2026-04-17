import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { ChevronRight, Circle, CheckCircle2 } from 'lucide-react';
import { t } from '../../i18n';

const OnboardingStepRow = ({
  title,
  subtitle,
  status,
  onClick,
  onViewed,
}) => {
  const rowRef = useRef(null);
  const viewedReportedRef = useRef(false);

  const isDone = status === 'done';

  useEffect(() => {
    if (isDone || viewedReportedRef.current || !onViewed) return undefined;
    const node = rowRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      viewedReportedRef.current = true;
      onViewed();
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !viewedReportedRef.current) {
          viewedReportedRef.current = true;
          onViewed();
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [isDone, onViewed]);

  const ariaTemplate = isDone
    ? (t('onboarding.aria.doneRow') || 'Complete {title}, concluído. Ir para {title}.')
    : (t('onboarding.aria.pendingRow') || 'Complete {title}, pendente. {subtitle}');

  const ariaLabel = ariaTemplate
    .replace('{title}', title)
    .replace('{subtitle}', subtitle || '')
    .replace('{title}', title);

  const Icon = isDone ? CheckCircle2 : Circle;
  const subtitleText = isDone ? t('onboarding.profileCompleted.doneSubtitle') : subtitle;

  return (
    <button
      ref={rowRef}
      type="button"
      className={`onboarding-row${isDone ? ' onboarding-row--done' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="onboarding-row-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>
      <span className="onboarding-row-body">
        <span className="onboarding-row-title">{title}</span>
        <span className="onboarding-row-subtitle">{subtitleText}</span>
      </span>
      <span className="onboarding-row-chevron" aria-hidden="true">
        <ChevronRight size={20} strokeWidth={2} />
      </span>
    </button>
  );
};

OnboardingStepRow.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  status: PropTypes.oneOf(['pending', 'done']).isRequired,
  onClick: PropTypes.func.isRequired,
  onViewed: PropTypes.func,
};

OnboardingStepRow.defaultProps = {
  subtitle: '',
  onViewed: null,
};

export default OnboardingStepRow;

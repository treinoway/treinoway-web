import PropTypes from 'prop-types';
import { ArrowLeft, CircleAlert, SearchX } from 'lucide-react';
import EmptyBlock from './ds/EmptyBlock';
import SkeletonText from './ds/SkeletonText';
import SkeletonRows from './ds/SkeletonRows';

/**
 * Shell of a Biblioteca edit page (Treino único / Exercício), same skeleton as StudentDetail:
 * ghost "Voltar", `type-h1` title, then the content. While loading the title and content are
 * skeletons of the same size, so nothing shifts when the data lands. "Not found" is only
 * rendered after the request ends (state === 'notFound').
 *
 * Props: title, state ('loading' | 'ready' | 'notFound' | 'error'), loadingLabel, errorTitle,
 * errorDescription, notFound ({ title, description, actionLabel }), onBack, onRetry, children.
 */
const LibraryEditorLayout = ({
  title,
  state,
  loadingLabel,
  errorTitle,
  errorDescription,
  notFound,
  onBack,
  onRetry,
  children,
}) => (
  <div className="editor-page">
    <button type="button" className="btn btn--ghost editor-page__back" onClick={onBack}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      Voltar
    </button>

    {state === 'loading' && (
      <>
        <h1 className="editor-page__title type-h1"><SkeletonText typeClass="type-h1" width="long" /></h1>
        <section className="section-card editor-page__section">
          <SkeletonRows label={loadingLabel} count={4} />
        </section>
      </>
    )}

    {state === 'error' && (
      <EmptyBlock
        icon={CircleAlert}
        role="alert"
        title={errorTitle}
        description={errorDescription}
        actionLabel="Tentar novamente"
        onAction={onRetry}
      />
    )}

    {state === 'notFound' && (
      <EmptyBlock
        icon={SearchX}
        title={notFound.title}
        description={notFound.description}
        actionLabel={notFound.actionLabel}
        onAction={onBack}
      />
    )}

    {state === 'ready' && (
      <>
        <h1 className="editor-page__title type-h1">{title}</h1>
        {children}
      </>
    )}
  </div>
);

LibraryEditorLayout.propTypes = {
  title: PropTypes.string.isRequired,
  state: PropTypes.oneOf(['loading', 'ready', 'notFound', 'error']).isRequired,
  loadingLabel: PropTypes.string.isRequired,
  errorTitle: PropTypes.string.isRequired,
  errorDescription: PropTypes.string,
  notFound: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    actionLabel: PropTypes.string.isRequired,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default LibraryEditorLayout;

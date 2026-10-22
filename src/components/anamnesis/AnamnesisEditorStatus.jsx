import PropTypes from 'prop-types';
import { CircleAlert, SearchX } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';
import SkeletonText from '../ds/SkeletonText';
import SkeletonRows from '../ds/SkeletonRows';

/**
 * In-place states of the anamnesis editor before there is data to edit: loading skeleton,
 * "not found" (only after the request ended, Rule 9) and load error with retry.
 */
const AnamnesisEditorStatus = ({ state, errorMessage, onBack, onRetry }) => {
  if (state === 'loading') {
    return (
      <>
        <h1 className="editor-page__title type-h1"><SkeletonText typeClass="type-h1" width="long" /></h1>
        <section className="section-card editor-page__section">
          <SkeletonRows label="Carregando anamnese" count={4} />
        </section>
      </>
    );
  }
  if (state === 'notFound') {
    return (
      <EmptyBlock
        icon={SearchX}
        title="Anamnese não encontrada"
        description="Ela pode ter sido excluída ou o link está incorreto."
        actionLabel="Voltar para anamneses"
        onAction={onBack}
      />
    );
  }
  return (
    <EmptyBlock
      icon={CircleAlert}
      role="alert"
      title="Não foi possível carregar a anamnese"
      description={errorMessage}
      actionLabel="Tentar novamente"
      onAction={onRetry}
    />
  );
};

AnamnesisEditorStatus.propTypes = {
  state: PropTypes.oneOf(['loading', 'notFound', 'error']).isRequired,
  errorMessage: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
};

export default AnamnesisEditorStatus;

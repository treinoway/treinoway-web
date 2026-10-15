import { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, LayoutTemplate } from 'lucide-react';
import ChoiceGroup from '../finance/ChoiceGroup';
import EmptyBlock from '../ds/EmptyBlock';
import SkeletonRows from '../ds/SkeletonRows';
import TemplateCard from './TemplateCard';
import {
  ALL_TEMPLATE_CATEGORIES,
  filterTemplatesByCategory,
  getTemplateCategories,
} from '../../utils/anamnesisTemplates';

/**
 * "Usar um modelo" gallery: category chips (only when some template has a
 * category) over a grid of TemplateCard. Presentational — the page loads the
 * templates, opens the preview and copies the chosen one.
 */
const TemplateGallery = ({
  templates,
  loading = false,
  error = false,
  copyingId = null,
  onRetry,
  onPreview,
  onUse,
  onCreateFromScratch,
}) => {
  const [activeCategory, setActiveCategory] = useState(ALL_TEMPLATE_CATEGORIES);

  if (loading) return <SkeletonRows label="Carregando modelos" count={3} />;

  if (error) {
    return (
      <EmptyBlock
        icon={AlertCircle}
        title="Não foi possível carregar os modelos"
        description="Verifique sua conexão e tente de novo."
        actionLabel="Tentar novamente"
        onAction={onRetry}
      />
    );
  }

  if (templates.length === 0) {
    return (
      <EmptyBlock
        icon={LayoutTemplate}
        title="Nenhum modelo ainda"
        description="Os modelos prontos aparecem aqui. Por enquanto, crie a anamnese do zero."
        actionLabel="Criar do zero"
        onAction={onCreateFromScratch}
      />
    );
  }

  const categories = getTemplateCategories(templates);
  const isCategoryAvailable = categories.some((category) => category.value === activeCategory);
  const selectedCategory = isCategoryAvailable ? activeCategory : ALL_TEMPLATE_CATEGORIES;
  const visibleTemplates = filterTemplatesByCategory(templates, selectedCategory);
  const categoryOptions = [{ value: ALL_TEMPLATE_CATEGORIES, label: 'Todos' }, ...categories];

  return (
    <div className="template-gallery">
      {categories.length > 0 && (
        <ChoiceGroup
          ariaLabel="Filtrar modelos por categoria"
          options={categoryOptions}
          value={selectedCategory}
          onChange={setActiveCategory}
        />
      )}
      <div className="template-gallery__grid">
        {visibleTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={onPreview}
            onUse={onUse}
            using={copyingId === template.id}
            disabled={copyingId !== null && copyingId !== template.id}
          />
        ))}
      </div>
    </div>
  );
};

TemplateGallery.propTypes = {
  templates: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    category: PropTypes.string,
    categoryLabel: PropTypes.string,
    questionCount: PropTypes.number,
  })).isRequired,
  loading: PropTypes.bool,
  error: PropTypes.bool,
  copyingId: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onUse: PropTypes.func.isRequired,
  onCreateFromScratch: PropTypes.func.isRequired,
};

export default TemplateGallery;

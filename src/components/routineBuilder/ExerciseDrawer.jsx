import { useState } from 'react';
import PropTypes from 'prop-types';
import Drawer from '../ds/Drawer';
import ConfirmDialog from '../ds/ConfirmDialog';
import ExerciseComposer from '../ExerciseComposer';
import useDiscardGuard from '../../hooks/useDiscardGuard';

// Drawer that hosts the exercise composer (add or edit) with a discard guard on close.
const ExerciseDrawer = ({
  exercise,
  exerciseTemplates,
  saving,
  canUseVideoLibrary,
  onCreate,
  onEdit,
  onImport,
  onAddFromTemplate,
  onRequestDelete,
  onClose,
  layout,
}) => {
  const returnFocusSelector = exercise ? `[data-exercise-id="${exercise.id}"] .row-menu-trigger` : undefined;
  const [footerNode, setFooterNode] = useState(null);
  const [dirty, setDirty] = useState(false);
  const { requestClose, dialogProps } = useDiscardGuard(onClose, dirty);

  return (
    <>
      <Drawer
        title={exercise ? 'Editar exercício' : 'Novo exercício'}
        onClose={requestClose}
        busy={saving}
        layout={layout}
        returnFocusSelector={returnFocusSelector}
        footer={<div ref={setFooterNode} className="composer-footer-slot" />}
      >
        <ExerciseComposer
          snapshot={exercise}
          exerciseTemplates={exerciseTemplates}
          saving={saving}
          onSubmitCreate={onCreate}
          onSubmitEdit={onEdit}
          onSubmitFromLibrary={onImport}
          onSubmitFromTemplate={onAddFromTemplate}
          onCancel={requestClose}
          onRequestDelete={onRequestDelete}
          canUseVideoLibrary={canUseVideoLibrary}
          footerTarget={footerNode}
          onDirtyChange={setDirty}
        />
      </Drawer>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
};

ExerciseDrawer.propTypes = {
  exercise: PropTypes.object,
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  saving: PropTypes.bool.isRequired,
  canUseVideoLibrary: PropTypes.bool,
  onCreate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onAddFromTemplate: PropTypes.func.isRequired,
  onRequestDelete: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  layout: PropTypes.oneOf(['modal', 'side']),
};

ExerciseDrawer.defaultProps = {
  exercise: null,
  canUseVideoLibrary: false,
  onRequestDelete: null,
  layout: 'side',
};

export default ExerciseDrawer;

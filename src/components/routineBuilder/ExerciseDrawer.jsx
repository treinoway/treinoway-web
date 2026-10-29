import { useState } from 'react';
import PropTypes from 'prop-types';
import Drawer from '../ds/Drawer';
import ConfirmDialog from '../ds/ConfirmDialog';
import ExerciseComposer from '../ExerciseComposer';
import useDiscardGuard from '../../hooks/useDiscardGuard';

// Drawer title for adding or editing an exercise or a substitute.
const drawerTitle = (exercise, principal) => {
  if (principal) return exercise ? 'Editar substituto' : 'Novo substituto';
  return exercise ? 'Editar exercício' : 'Novo exercício';
};

// Selector of the element that opened the drawer, so focus returns there on close.
const getReturnFocusSelector = (exercise, principal) => {
  if (!principal) return exercise ? `[data-exercise-id="${exercise.id}"] .row-menu-trigger` : undefined;
  if (exercise) return `[data-substitute-id="${exercise.id}"] .substitute-row-edit`;
  return `[data-exercise-id="${principal.id}"] .row-menu-trigger`;
};

// Drawer that hosts the exercise composer (add or edit) with a discard guard on close.
const ExerciseDrawer = ({
  exercise,
  principal,
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
  const returnFocusSelector = getReturnFocusSelector(exercise, principal);
  const [footerNode, setFooterNode] = useState(null);
  const [dirty, setDirty] = useState(false);
  const { requestClose, dialogProps } = useDiscardGuard(onClose, dirty);

  return (
    <>
      <Drawer
        title={drawerTitle(exercise, principal)}
        onClose={requestClose}
        busy={saving}
        layout={layout}
        returnFocusSelector={returnFocusSelector}
        footer={<div ref={setFooterNode} className="composer-footer-slot" />}
      >
        {principal && <p className="type-body text-light drawer-substitute-caption">{`no lugar de ${principal.name}`}</p>}
        <ExerciseComposer
          substituteFor={principal}
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
  principal: PropTypes.object,
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
  principal: null,
  canUseVideoLibrary: false,
  onRequestDelete: null,
  layout: 'side',
};

export default ExerciseDrawer;

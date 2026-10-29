import { useState } from 'react';
import PropTypes from 'prop-types';
import { Video, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError, t, tf } from '../../i18n';
import {
  listAdminTutorials,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  reorderTutorials,
  requestTutorialUploadUrl,
  uploadTutorialVideo,
} from '../../api/tutorials';
import useAdminQuery from '../../hooks/useAdminQuery';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import RowMenu from '../../components/RowMenu';
import Badge from '../../components/ds/Badge';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import QueryFeedback from '../../components/admin/QueryFeedback';
import TutorialFormModal from '../../components/tutorials/TutorialFormModal';

const NO_PARAMS = {};
const BAD_REQUEST_STATUS = 400;

// Uploads the chosen file (if any) and returns the video fields of the payload.
const buildVideoFields = async (values, onProgress) => {
  if (values.source === 'link') return { videoSource: 'link', videoUrl: values.url.trim() };
  if (!values.file) return {};
  const { uploadUrl, videoKey } = await requestTutorialUploadUrl({
    contentType: values.file.type,
    fileSize: values.file.size,
  });
  try {
    await uploadTutorialVideo(uploadUrl, values.file, onProgress);
  } catch (uploadError) {
    // why: the presigned PUT uses plain axios, so its failures carry no userMessage and would read as offline/permission errors
    throw Object.assign(new Error('tutorial upload failed'), { userMessage: uploadError.userMessage || t('adminTutorials.errorUpload') });
  }
  return { videoSource: 'upload', videoKey };
};

// One tutorial row with its three-dot menu.
const TutorialRow = ({ tutorial, index, total, onEdit, onMove, onDelete }) => (
  <tr>
    <td>
      <span className="type-body-strong">{tutorial.title}</span>
      {tutorial.description && <span className="admin-table__sub type-caption">{tutorial.description}</span>}
    </td>
    <td>
      <Badge tone={tutorial.videoSource === 'upload' ? 'brand' : 'neutral'} variant="tag">
        {tutorial.videoSource === 'upload' ? t('adminTutorials.sourceUpload') : t('adminTutorials.sourceLink')}
      </Badge>
    </td>
    <td className="admin-table__actions">
      <RowMenu
        ariaLabel={tf('adminTutorials.rowActions', { title: tutorial.title })}
        onEdit={() => onEdit(tutorial)}
        onDelete={() => onDelete(tutorial)}
        extraItems={[
          { label: t('adminTutorials.moveUp'), onClick: () => onMove(index, -1), disabled: index === 0 },
          { label: t('adminTutorials.moveDown'), onClick: () => onMove(index, 1), disabled: index === total - 1 },
        ]}
      />
    </td>
  </tr>
);

TutorialRow.propTypes = {
  tutorial: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onEdit: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Ordered tutorials table.
const TutorialsTable = ({ tutorials, ...handlers }) => (
  <div className="section-card admin-table-wrap">
    <table className="admin-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('adminTutorials.colTitle')}</th>
          <th className="type-caption-strong">{t('adminTutorials.colSource')}</th>
          <th aria-label={t('adminTutorials.colActions')} />
        </tr>
      </thead>
      <tbody>
        {tutorials.map((tutorial, index) => (
          <TutorialRow key={tutorial.id} tutorial={tutorial} index={index} total={tutorials.length} {...handlers} />
        ))}
      </tbody>
    </table>
  </div>
);

TutorialsTable.propTypes = { tutorials: PropTypes.array.isRequired };

// Admin page: create, edit, reorder and delete "Como usar" tutorials.
const TutorialsList = () => {
  const { showToast } = useToast();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const { data, staleData, loading, error, reload, setData } = useAdminQuery(listAdminTutorials, NO_PARAMS);
  const [formState, setFormState] = useState(null);

  const tutorials = (data ?? staleData)?.items ?? [];
  const hasRows = tutorials.length > 0;
  const isEmpty = !loading && !error && !hasRows;

  const handleSubmit = async (values, onProgress) => {
    const editing = formState.tutorial;
    const videoFields = await buildVideoFields(values, onProgress);
    const description = values.description.trim();
    if (editing) {
      await updateTutorial(editing.id, { title: values.title.trim(), description: description || null, ...videoFields });
    } else {
      await createTutorial({ title: values.title.trim(), ...(description && { description }), ...videoFields });
    }
    showToast(t(editing ? 'adminTutorials.updateSuccess' : 'adminTutorials.createSuccess'), 'success');
    setFormState(null);
    reload();
  };

  const handleMove = async (index, offset) => {
    const ids = tutorials.map((tutorial) => tutorial.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    try {
      const result = await reorderTutorials(ids);
      setData(() => ({ items: result.items }));
    } catch (moveError) {
      showToast(moveError.userMessage || translateError(moveError), 'error');
      if (moveError.response?.status === BAD_REQUEST_STATUS) reload();
    }
  };

  const handleDelete = (tutorial) =>
    requestConfirm({
      message: tf('adminTutorials.deleteConfirm', { title: tutorial.title }),
      busyLabel: t('adminTutorials.deleting'),
      onConfirm: async () => {
        await deleteTutorial(tutorial.id);
        showToast(t('adminTutorials.deleteSuccess'), 'success');
        reload();
      },
    });

  const handleEdit = (tutorial) => setFormState({ tutorial });

  return (
    <div className="admin-page">
      <LibraryPageHeader
        icon={Video}
        title={t('adminTutorials.title')}
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setFormState({ tutorial: null })}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            {t('adminTutorials.newTutorial')}
          </button>
        }
      />
      <QueryFeedback
        loading={loading && !hasRows}
        error={error}
        loadingLabel={t('adminTutorials.loading')}
        errorTitle={error?.userMessage || t('adminTutorials.errorTitle')}
        retryLabel={t('adminTutorials.retry')}
        onRetry={reload}
      />
      {isEmpty && (
        <EmptyBlock icon={Video} title={t('adminTutorials.emptyTitle')} description={t('adminTutorials.emptyDescription')} />
      )}
      {!error && hasRows && (
        <TutorialsTable tutorials={tutorials} onEdit={handleEdit} onMove={handleMove} onDelete={handleDelete} />
      )}
      {formState && (
        <TutorialFormModal tutorial={formState.tutorial} onSubmit={handleSubmit} onClose={() => setFormState(null)} />
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default TutorialsList;

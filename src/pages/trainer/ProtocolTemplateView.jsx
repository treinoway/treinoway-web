import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ArrowLeft, CircleAlert, ClipboardList } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { getLevelLabel } from '../../constants/trainingLevels';
import useRoutineTemplateView from '../../hooks/useRoutineTemplateView';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import MetricCard from '../../components/ds/MetricCard';
import SkeletonRows from '../../components/ds/SkeletonRows';
import RoutineHero from '../../components/routineView/RoutineHero';
import RoutineWeekGrid from '../../components/routineView/RoutineWeekGrid';
import RoutineTrainingsCard from '../../components/routineView/RoutineTrainingsCard';

const GENDER_LABELS = {
  male: 'masculino',
  female: 'feminino',
  other: 'outro',
};

const RoutineMetrics = ({ template, trainingsCount }) => {
  const levelLabel = template.trainingLevel ? getLevelLabel(template.trainingLevel) : null;
  const genderLabel = GENDER_LABELS[template.genderOrdination?.toLowerCase()];

  return (
    <div className="metric-grid student-detail__metrics">
      {template.defaultDurationWeeks && (
        <MetricCard label="Duração" value={template.defaultDurationWeeks} support="semanas" />
      )}
      <MetricCard label="Treinos" value={trainingsCount} support="por semana" />
      {levelLabel && <MetricCard label="Nível" value={levelLabel} support={genderLabel} />}
    </div>
  );
};

RoutineMetrics.propTypes = {
  template: PropTypes.object.isRequired,
  trainingsCount: PropTypes.number.isRequired,
};

const RoutineBody = ({ data }) => (
  <>
    <RoutineMetrics template={data.template} trainingsCount={data.trainings.length} />
    <RoutineWeekGrid trainings={data.trainings} />
    <RoutineTrainingsCard trainings={data.trainings} exercisesByTraining={data.exercisesByTraining} />
  </>
);

RoutineBody.propTypes = { data: PropTypes.object.isRequired };

const RoutineLoading = () => (
  <section className="section-card cockpit-card">
    <SkeletonRows label="Carregando rotina" count={3} />
  </section>
);

const ProtocolTemplateView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { status, data, reload } = useRoutineTemplateView(id);
  const { dialogProps, requestConfirm } = useConfirmDialog();

  const goToList = () => navigate('/trainer/routines');
  const handleEdit = () => navigate(`/trainer/routines/${id}/edit`);
  const handleDelete = () => {
    requestConfirm({
      message: `Excluir "${data.template.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        await api.delete(`/trainer/protocol-templates/${id}`);
        showToast('Rotina excluída com sucesso!', 'success');
        navigate('/trainer/routines');
      },
    });
  };

  const renderContent = () => {
    if (status === 'notFound') {
      return (
        <EmptyBlock
          icon={ClipboardList}
          title="Rotina não encontrada"
          actionLabel="Voltar para rotinas"
          onAction={goToList}
        />
      );
    }
    if (status === 'error') {
      return (
        <EmptyBlock
          icon={CircleAlert}
          role="alert"
          title="Não foi possível carregar a rotina"
          description={data.message}
          actionLabel="Tentar novamente"
          onAction={reload}
        />
      );
    }
    return (
      <>
        <RoutineHero template={data?.template} onEdit={handleEdit} onDelete={handleDelete} />
        {status === 'ready' ? <RoutineBody data={data} /> : <RoutineLoading />}
      </>
    );
  };

  return (
    <div className="student-detail">
      <button type="button" className="btn btn--ghost student-detail__back" onClick={goToList}>
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Voltar
      </button>
      {renderContent()}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default ProtocolTemplateView;

import {
  emptyStudents,
  emptyTrainings,
  emptyExercises,
  emptyProgress,
  achievementPr,
  streak,
} from '../assets/illustrations/index.js';

const illustrations = {
  'empty-students': emptyStudents,
  'empty-trainings': emptyTrainings,
  'empty-exercises': emptyExercises,
  'empty-progress': emptyProgress,
  'achievement-pr': achievementPr,
  streak,
};

const BrandIllustration = ({ name, className = '', size = 200 }) => {
  const src = illustrations[name];

  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      role="presentation"
      width={size}
      className={`brand-illustration${className ? ` ${className}` : ''}`}
    />
  );
};

export default BrandIllustration;

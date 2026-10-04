import PropTypes from 'prop-types';
import { getInitials } from '../../utils/initials';

const Avatar = ({ name, src, size = 'md' }) => {
  const sizeClass = size === 'md' ? '' : ` avatar--${size}`;
  return (
    <span className={`avatar${sizeClass}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : getInitials(name)}
    </span>
  );
};

Avatar.propTypes = {
  name: PropTypes.string,
  src: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default Avatar;

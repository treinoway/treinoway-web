import PropTypes from 'prop-types';

export const layoutCalls = { last: null };

// Records the props of the latest render.
const record = (props) => { layoutCalls.last = props; };

// Test double of PrescriptionLayout: renders the title, subtitle and save status, and records the props it received.
const PrescriptionLayoutStub = (props) => {
  record(props);
  return (
    <div>
      <h1>{props.title}</h1>
      <p>{props.subtitle}</p>
      <p role="status">{props.saveStatusText}</p>
      {props.children}
    </div>
  );
};

PrescriptionLayoutStub.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  saveStatusText: PropTypes.string,
  children: PropTypes.node,
};

export default PrescriptionLayoutStub;

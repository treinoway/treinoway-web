import { Link } from 'react-router-dom';

// Legal links shown under the auth card (terms and privacy policy).
const AuthLegalFooter = () => (
  <footer className="auth-legal">
    <Link to="/terms" className="auth-legal-link">Termos e Condições</Link>
    <span className="auth-legal-group">
      <span className="auth-legal-sep" aria-hidden="true">·</span>
      <Link to="/privacy-policy" className="auth-legal-link">Política de Privacidade</Link>
    </span>
  </footer>
);

export default AuthLegalFooter;

const PLACEHOLDER_FIELDS = ['google', 'email', 'password', 'submit'];

// Stand-in for the auth form while the invite preview loads, so the email
// field never flashes editable before it gets locked to the invited address.
const InviteFormSkeleton = () => (
  <div className="invite-skeleton" role="status" aria-live="polite">
    <span className="visually-hidden">Verificando seu convite…</span>
    {PLACEHOLDER_FIELDS.map((field) => (
      <span key={field} className="skeleton invite-skeleton__field" aria-hidden="true" />
    ))}
  </div>
);

export default InviteFormSkeleton;

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];
const LOCAL_HOSTNAME_SUFFIX = '.localhost';
const STAGING_HOSTNAME_MARKER = 'staging';

// Whether the hostname belongs to a local machine or a staging deploy, where unreleased features are open to everyone.
const isPreReleaseHostname = (hostname) => {
  const normalizedHostname = String(hostname ?? '').toLowerCase();
  if (!normalizedHostname) return false;
  if (LOCAL_HOSTNAMES.includes(normalizedHostname)) return true;
  if (normalizedHostname.endsWith(LOCAL_HOSTNAME_SUFFIX)) return true;
  return normalizedHostname.includes(STAGING_HOSTNAME_MARKER);
};

// Whether the Ranking de Constância is visible: everyone in dev/local/staging, only admins elsewhere (fails closed).
export const isConsistencyRankingVisible = ({ hostname, isDev, isAdmin }) => {
  if (isDev === true) return true;
  if (isPreReleaseHostname(hostname)) return true;
  return isAdmin === true;
};

// Whether the student feedback is visible: everyone in dev/local/staging, only admins elsewhere (fails closed).
export const isStudentFeedbackVisible = ({ hostname, isDev, isAdmin }) => {
  if (isDev === true) return true;
  if (isPreReleaseHostname(hostname)) return true;
  return isAdmin === true;
};

// Only real browser push services may receive notifications from our server.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^(.+\.)?push\.apple\.com$/,
  /^(.+\.)?notify\.windows\.com$/,
];

export function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

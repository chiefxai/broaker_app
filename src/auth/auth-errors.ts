const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  full_name: 'Full name',
  phone_number: 'Phone number',
};

/** Formats FastAPI/Pydantic validation errors without echoing submitted values. */
export function formatAuthValidationErrors(detail: unknown, fallback: string): string {
  if (!Array.isArray(detail)) return fallback;
  const messages = detail.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null || !('msg' in item) || typeof item.msg !== 'string') return [];
    const location = 'loc' in item && Array.isArray(item.loc) ? item.loc : [];
    const field = [...location].reverse().find((part): part is string => typeof part === 'string');
    const label = field ? FIELD_LABELS[field] : undefined;
    return [label ? `${label}: ${item.msg}` : item.msg];
  });
  return messages.length ? messages.join(' ') : fallback;
}

export function formatAuthRequestError(reason: unknown, fallback: string): string {
  if (typeof reason === 'object' && reason !== null && 'code' in reason) {
    if (reason.code === 'ERR_NETWORK') return 'Can’t reach the server. Check your connection and try again.';
    if (reason.code === 'ECONNABORTED' || reason.code === 'ETIMEDOUT') return 'The server took too long to respond. Please try again.';
  }
  if (typeof reason === 'object' && reason !== null && 'response' in reason) {
    const response = reason.response;
    if (response === undefined || response === null) return 'Can’t reach the server. Check your connection and try again.';
  }
  return fallback;
}

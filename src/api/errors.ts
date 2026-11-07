import { isAxiosError } from 'axios';

interface ApiErrorBody {
  detail?: unknown;
}

/** Prefer FastAPI's structured validation detail over Axios's generic HTTP status message. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => {
        if (!item || typeof item !== 'object') return '';
        const validation = item as { loc?: unknown[]; msg?: unknown };
        const message = typeof validation.msg === 'string' ? validation.msg : '';
        const location = Array.isArray(validation.loc) ? validation.loc.filter((part) => typeof part === 'string' || typeof part === 'number').join('.') : '';
        return message ? `${location ? `${location}: ` : ''}${message}` : '';
      }).filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export function isUuid(value: string): boolean {
  return /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
}

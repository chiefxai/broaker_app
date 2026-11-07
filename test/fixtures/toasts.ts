import type { ToastVariant } from '@/components/core/toast/Toast';

export const toastCases: { variant: ToastVariant; message: string; role: 'alert' | 'status' }[] = [
  { variant: 'success', message: 'Changes saved.', role: 'status' },
  { variant: 'error', message: 'Could not save changes.', role: 'alert' },
  { variant: 'warning', message: 'Check the required fields.', role: 'status' },
  { variant: 'info', message: 'Link copied.', role: 'status' },
];

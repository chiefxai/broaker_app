const activeStatuses = new Set(['active', 'available']);

export function isActivePropertyStatus(status: string): boolean {
  return activeStatuses.has(status.trim().toLocaleLowerCase());
}

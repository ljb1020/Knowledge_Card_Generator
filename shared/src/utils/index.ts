export function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatPageNumber(current: number, total: number): string {
  return `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

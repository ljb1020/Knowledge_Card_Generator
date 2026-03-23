export function generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
export function generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
export function formatPageNumber(current, total) {
    return `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
}
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

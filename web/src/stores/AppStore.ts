import { makeAutoObservable } from 'mobx';
import type { BulletCard, Card, CardDocument, Job } from 'shared';

class AppStore {
  currentJobId: string | null = null;
  currentJob: Job | null = null;
  documentDraft: CardDocument | null = null;
  isDirty = false;
  isGenerating = false;
  isExporting = false;
  isPublishing = false;
  historyJobs: Job[] = [];
  errorMessage: string | null = null;
  isSaving = false;

  private pollGenerationTimer: ReturnType<typeof setTimeout> | null = null;
  private pollExportTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async loadHistoryJobs(): Promise<void> {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      this.historyJobs = data.jobs as Job[];
    } catch {
      this.setError('加载历史记录失败');
    }
  }

  async loadJob(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error('Failed to load job');
      const data = await res.json();
      this.setCurrentJob(data.job as Job);
      this.ensurePollingForCurrentJob();
    } catch {
      this.setError('加载卡片失败');
    }
  }

  async saveDocument(): Promise<boolean> {
    if (!this.currentJobId || !this.documentDraft) return false;
    this.isSaving = true;

    try {
      const res = await fetch(`/api/jobs/${this.currentJobId}/document`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: this.documentDraft }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }

      const data = await res.json();
      this.currentJob = data.job as Job;
      this.isDirty = false;
      await this.loadHistoryJobs();
      return true;
    } catch (err) {
      this.setError(err instanceof Error ? err.message : '保存失败');
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  async generateJob(topic: string): Promise<boolean> {
    this.isGenerating = true;

    try {
      const res = await fetch('/api/jobs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Generate failed');
      }

      const data = await res.json();
      this.setCurrentJob(data.job as Job);
      await this.loadHistoryJobs();
      this.ensurePollingForCurrentJob();
      return true;
    } catch (err) {
      this.isGenerating = false;
      this.setError(err instanceof Error ? err.message : '生成失败');
      return false;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Delete failed');
      }

      if (this.currentJobId === id) {
        this.setCurrentJob(null);
      }

      this.historyJobs = this.historyJobs.filter((job) => job.id !== id);
      return true;
    } catch (err) {
      this.setError(err instanceof Error ? err.message : '删除失败');
      return false;
    }
  }

  async publishToXhs(): Promise<boolean> {
    if (!this.currentJobId) return false;
    this.isPublishing = true;
    this.clearError();

    try {
      const res = await fetch(`/api/jobs/${this.currentJobId}/publish-draft`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '发布失败');
      }

      return true;
    } catch (err) {
      this.setError(err instanceof Error ? err.message : '发布到小红书失败');
      return false;
    } finally {
      this.isPublishing = false;
    }
  }

  async startExport(): Promise<boolean> {
    if (!this.currentJobId) return false;
    this.isExporting = true;

    try {
      const res = await fetch(`/api/jobs/${this.currentJobId}/export`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Export failed');
      }

      this.currentJob = this.currentJob ? { ...this.currentJob, status: 'exporting' } : this.currentJob;
      this.pollExportStatus();
      return true;
    } catch (err) {
      this.setError(err instanceof Error ? err.message : '导出失败');
      this.isExporting = false;
      return false;
    }
  }

  private async pollGenerationStatus(): Promise<void> {
    if (!this.currentJobId) return;

    const res = await fetch(`/api/jobs/${this.currentJobId}`);
    if (!res.ok) {
      this.isGenerating = false;
      return;
    }

    const data = await res.json();
    const job = data.job as Job;
    this.setCurrentJob(job);
    await this.loadHistoryJobs();

    if (job.status === 'generating' || job.status === 'validating') {
      this.isGenerating = true;
      this.pollGenerationTimer = setTimeout(() => this.pollGenerationStatus(), 1000);
    } else {
      this.isGenerating = false;
    }
  }

  private async pollExportStatus(): Promise<void> {
    if (!this.currentJobId) return;

    const res = await fetch(`/api/jobs/${this.currentJobId}`);
    if (!res.ok) {
      this.isExporting = false;
      return;
    }

    const data = await res.json();
    const job = data.job as Job;
    this.setCurrentJob(job);

    if (job.status === 'exporting') {
      this.pollExportTimer = setTimeout(() => this.pollExportStatus(), 1000);
    } else {
      this.isExporting = false;
      await this.loadHistoryJobs();
    }
  }

  clearPollTimer(): void {
    if (this.pollGenerationTimer) {
      clearTimeout(this.pollGenerationTimer);
      this.pollGenerationTimer = null;
    }

    if (this.pollExportTimer) {
      clearTimeout(this.pollExportTimer);
      this.pollExportTimer = null;
    }
  }

  setCurrentJob(job: Job | null) {
    this.currentJob = job;
    this.currentJobId = job?.id ?? null;
    this.documentDraft = job?.documentJson ? JSON.parse(JSON.stringify(job.documentJson)) : null;
    this.isDirty = false;
  }

  updateCardField(cardIndex: number, updates: Partial<Card>) {
    if (!this.documentDraft) return;
    const card = this.documentDraft.cards[cardIndex];
    Object.assign(card, updates);
    this.isDirty = true;
  }

  updateBullet(cardIndex: number, bulletIndex: number, value: string) {
    if (!this.documentDraft) return;
    const card = this.documentDraft.cards[cardIndex] as BulletCard;
    if (card.type === 'bullet' && card.bullets[bulletIndex] !== undefined) {
      card.bullets[bulletIndex] = value;
      this.isDirty = true;
    }
  }

  deleteCard(_cardIndex: number) {}

  addCard(_afterIndex: number) {}

  moveCard(_cardIndex: number, _direction: 'up' | 'down') {}

  setGenerating(val: boolean) {
    this.isGenerating = val;
  }

  setExporting(val: boolean) {
    this.isExporting = val;
  }

  setHistoryJobs(jobs: Job[]) {
    this.historyJobs = jobs;
  }

  setError(msg: string | null) {
    this.errorMessage = msg;
  }

  clearError() {
    this.errorMessage = null;
  }

  private ensurePollingForCurrentJob(): void {
    this.clearPollTimer();

    if (!this.currentJob) {
      this.isGenerating = false;
      this.isExporting = false;
      return;
    }

    if (this.currentJob.status === 'generating' || this.currentJob.status === 'validating') {
      this.isGenerating = true;
      this.pollGenerationTimer = setTimeout(() => this.pollGenerationStatus(), 1000);
      return;
    }

    if (this.currentJob.status === 'exporting') {
      this.isExporting = true;
      this.pollExportTimer = setTimeout(() => this.pollExportStatus(), 1000);
      return;
    }

    this.isGenerating = false;
    this.isExporting = false;
  }

  get hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  get canExport(): boolean {
    return (
      this.currentJob?.status === 'ready' ||
      this.currentJob?.status === 'ready_with_warnings' ||
      this.currentJob?.status === 'done' ||
      this.currentJob?.status === 'published'
    );
  }

  get canPublishToXhs(): boolean {
    return (
      this.currentJob?.status === 'done' &&
      (this.currentJob?.imagePaths?.length ?? 0) > 0
    );
  }
}

export const appStore = new AppStore();

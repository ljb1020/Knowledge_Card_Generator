import { makeAutoObservable } from 'mobx';
import type { Job, CardDocument, Card, BulletCard } from 'shared';

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

class AppStore {
  currentJobId: string | null = null;
  currentJob: Job | null = null;
  documentDraft: CardDocument | null = null;
  isDirty: boolean = false;
  isGenerating: boolean = false;
  isExporting: boolean = false;
  historyJobs: Job[] = [];
  errorMessage: string | null = null;
  isSaving: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  async loadHistoryJobs(): Promise<void> {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      this.historyJobs = data.jobs as Job[];
    } catch (err) {
      this.setError('加载历史记录失败');
    }
  }

  async loadJob(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error('Failed to load job');
      const data = await res.json();
      this.setCurrentJob(data.job as Job);
    } catch (err) {
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
      // Update currentJob with the server response
      this.currentJob = data.job as Job;
      this.isDirty = false;
      // Refresh history
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
      const job = data.job as Job;
      this.setCurrentJob(job);
      await this.loadHistoryJobs();
      return true;
    } catch (err) {
      this.setError(err instanceof Error ? err.message : '生成失败');
      return false;
    } finally {
      this.isGenerating = false;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      });
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

  private pollExportTimer: ReturnType<typeof setTimeout> | null = null;

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
      // Start polling for status updates
      this.pollExportStatus();
      return true;
    } catch (err) {
      this.setError(err instanceof Error ? err.message : '导出失败');
      this.isExporting = false;
      return false;
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
    this.currentJob = job;

    if (job.status === 'exporting') {
      // Continue polling
      this.pollExportTimer = setTimeout(() => this.pollExportStatus(), 1000);
    } else {
      // Export finished (done or failed)
      this.isExporting = false;
      await this.loadHistoryJobs();
    }
  }

  clearPollTimer(): void {
    if (this.pollExportTimer) {
      clearTimeout(this.pollExportTimer);
      this.pollExportTimer = null;
    }
  }

  setCurrentJob(job: Job | null) {
    this.currentJob = job;
    this.currentJobId = job?.id ?? null;
    if (job?.documentJson) {
      this.documentDraft = JSON.parse(JSON.stringify(job.documentJson));
    } else {
      this.documentDraft = null;
    }
    this.isDirty = false;
  }

  updateCardField(cardIndex: number, updates: Partial<Card>) {
    if (!this.documentDraft) return;
    const card = this.documentDraft.cards[cardIndex] as Card;
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

  deleteCard(cardIndex: number) {
    if (!this.documentDraft) return;
    const total = this.documentDraft.cards.length;
    if (total <= 4) return;
    const card = this.documentDraft.cards[cardIndex];
    if (card.type === 'cover' || card.type === 'summary') return;
    this.documentDraft.cards.splice(cardIndex, 1);
    this.isDirty = true;
  }

  addCard(afterIndex: number) {
    if (!this.documentDraft) return;
    const total = this.documentDraft.cards.length;
    if (total >= 8) return;
    const newCard: BulletCard = {
      id: generateId(),
      type: 'bullet',
      title: '新要点',
      bullets: ['要点内容', '要点内容'],
    };
    this.documentDraft.cards.splice(afterIndex, 0, newCard);
    this.isDirty = true;
  }

  moveCard(cardIndex: number, direction: 'up' | 'down') {
    if (!this.documentDraft) return;
    const cards = this.documentDraft.cards;
    if (cardIndex <= 1 && direction === 'up') return;
    if (cardIndex >= cards.length - 2 && direction === 'down') return;
    const targetIndex = direction === 'up' ? cardIndex - 1 : cardIndex + 1;
    const [card] = cards.splice(cardIndex, 1);
    cards.splice(targetIndex, 0, card);
    this.isDirty = true;
  }

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

  get hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  get canExport(): boolean {
    return this.currentJob?.status === 'ready' || this.currentJob?.status === 'done';
  }
}

export const appStore = new AppStore();

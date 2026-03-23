import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { appStore } from '../stores';

function getJobStatusLabel(status: string): string {
  if (status === 'generating') return '生成中...';
  if (status === 'validating') return '校验中...';
  if (status === 'ready') return '待导出';
  if (status === 'exporting') return '导出中...';
  if (status === 'done') return '已完成';
  return '失败';
}

export default observer(function LeftPanel() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    appStore.loadHistoryJobs();
    return () => appStore.clearPollTimer();
  }, []);

  async function handleGenerate() {
    const topic = inputRef.current?.value.trim();
    if (!topic) {
      appStore.setError('请输入前端知识点');
      return;
    }

    const ok = await appStore.generateJob(topic);
    if (ok && inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function handleSelectJob(jobId: string) {
    if (appStore.hasUnsavedChanges) {
      const confirmed = window.confirm('当前有未保存的修改，确定要切换吗？');
      if (!confirmed) return;
    }

    await appStore.loadJob(jobId);
  }

  async function handleDeleteJob(jobId: string) {
    const confirmed = window.confirm('确定要删除这条历史记录吗？');
    if (!confirmed) return;

    await appStore.deleteJob(jobId);
  }

  async function handleSave() {
    await appStore.saveDocument();
  }

  async function handleExport() {
    await appStore.startExport();
  }

  return (
    <aside className="w-[320px] min-w-[320px] bg-panel border-r border-border flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary mb-4">知识卡片生成器</h1>
        <input
          ref={inputRef}
          type="text"
          placeholder="输入前端知识点，如：闭包、虚拟 DOM、事件循环"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleGenerate}
            disabled={appStore.isGenerating}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              appStore.isGenerating
                ? 'bg-border text-text-secondary cursor-not-allowed'
                : 'bg-primary text-white hover:bg-blue-700'
            }`}
          >
            {appStore.isGenerating ? '生成中...' : '生成内容'}
          </button>
          <button
            className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary cursor-not-allowed opacity-50"
            disabled
            title="重新生成待后续实现"
          >
            重新生成
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
          历史记录
        </div>
        <div className="space-y-2">
          {appStore.historyJobs.length === 0 ? (
            <p className="text-sm text-text-secondary">暂无历史记录</p>
          ) : (
            appStore.historyJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleSelectJob(job.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  job.id === appStore.currentJobId
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-background'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary truncate">{job.topic}</div>
                    <div className="text-xs text-text-secondary mt-1">{getJobStatusLabel(job.status)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteJob(job.id);
                    }}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-background hover:text-red-600 transition-colors"
                    aria-label={`删除 ${job.topic}`}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        {appStore.currentJob && (
          <div className="mb-3">
            <div className="text-xs text-text-secondary">当前主题：{appStore.currentJob.topic}</div>
            {appStore.isDirty && <div className="text-xs text-amber-600 mt-1">有未保存的修改</div>}
            {appStore.isExporting && <div className="text-xs text-blue-600 mt-1">导出中...</div>}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!appStore.isDirty || appStore.isSaving}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              appStore.isDirty && !appStore.isSaving
                ? 'bg-primary text-white hover:bg-blue-700'
                : 'bg-border text-text-secondary cursor-not-allowed'
            }`}
          >
            {appStore.isSaving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleExport}
            disabled={!appStore.canExport || appStore.isExporting || appStore.isGenerating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              appStore.canExport && !appStore.isExporting && !appStore.isGenerating
                ? 'bg-primary text-white hover:bg-blue-700'
                : 'bg-border text-text-secondary cursor-not-allowed'
            }`}
          >
            {appStore.isExporting ? '导出中...' : '导出'}
          </button>
        </div>
        {appStore.errorMessage && <div className="mt-2 text-xs text-red-500">{appStore.errorMessage}</div>}
      </div>
    </aside>
  );
});

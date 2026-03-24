import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { appStore } from '../stores';

function getJobStatusLabel(status: string): string {
  if (status === 'generating') return '生成中...';
  if (status === 'validating') return '校验中...';
  if (status === 'ready') return '待导出';
  if (status === 'ready_with_warnings') return '可导出（有提醒）';
  if (status === 'exporting') return '导出中...';
  if (status === 'done') return '已完成';
  if (status === 'published') return '已发布';
  return '失败';
}

function summarizeMessage(message: string | null, maxLength = 120): string | null {
  if (!message) return null;

  const normalized = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' / ');

  if (!normalized) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function isInProgress(status: string): boolean {
  return status === 'generating' || status === 'validating' || status === 'exporting';
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

  async function handlePublishToXhs() {
    const ok = await appStore.publishToXhs();
    if (ok) {
      alert('已发布到小红书');
    }
  }

  async function handleCheckXhsAuth() {
    try {
      const res = await fetch('/api/xhs/check-auth');
      const data = await res.json();
      alert(data.success ? `✅ 登录态有效：${data.message}` : `❌ 需要重新登录：${data.message}`);
    } catch {
      alert('❌ 检测失败');
    }
  }

  return (
    <aside className="w-[320px] min-w-[320px] bg-panel border-r border-border flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary mb-4">前端面试作答卡生成器</h1>
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
            onClick={handleCheckXhsAuth}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-background transition-colors"
            title="测试小红书登录态是否有效"
          >
            测试登录
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">历史记录</div>
        <div className="space-y-2">
          {appStore.historyJobs.length === 0 ? (
            <p className="text-sm text-text-secondary">暂无历史记录</p>
          ) : (
            appStore.historyJobs.map((job) => {
              const progressPreview = isInProgress(job.status) ? summarizeMessage(job.progressMessage, 100) : null;
              const issuePreview =
                job.status === 'failed' || job.status === 'ready_with_warnings'
                  ? summarizeMessage(job.errorMessage)
                  : null;

              return (
                <div
                  key={job.id}
                  onClick={() => handleSelectJob(job.id)}
                  title={progressPreview || issuePreview || undefined}
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

                      {progressPreview && (
                        <div className="mt-2 rounded-md px-2 py-1 text-[11px] leading-4 bg-blue-50 text-blue-700">
                          当前进度：{progressPreview}
                        </div>
                      )}

                      {issuePreview && (
                        <div
                          className={`mt-2 rounded-md px-2 py-1 text-[11px] leading-4 ${
                            job.status === 'failed'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {job.status === 'failed' ? '失败原因：' : '提醒：'}
                          {issuePreview}
                        </div>
                      )}
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
              );
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        {appStore.currentJob && (
          <div className="mb-3">
            <div className="text-xs text-text-secondary">当前主题：{appStore.currentJob.topic}</div>
            {appStore.isDirty && <div className="text-xs text-amber-600 mt-1">有未保存的修改</div>}
            {isInProgress(appStore.currentJob.status) && appStore.currentJob.progressMessage && (
              <div className="mt-2 rounded-md px-2 py-2 text-xs leading-5 whitespace-pre-wrap bg-blue-50 text-blue-700">
                当前进度：
                {'\n'}
                {appStore.currentJob.progressMessage}
              </div>
            )}
            {(appStore.currentJob.status === 'failed' ||
              appStore.currentJob.status === 'ready_with_warnings') &&
              appStore.currentJob.errorMessage && (
                <div
                  className={`mt-2 rounded-md px-2 py-2 text-xs leading-5 whitespace-pre-wrap ${
                    appStore.currentJob.status === 'failed'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {appStore.currentJob.status === 'failed' ? '失败原因：' : '提醒：'}
                  {'\n'}
                  {appStore.currentJob.errorMessage}
                </div>
              )}
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
          {appStore.canPublishToXhs && (
            <button
              onClick={handlePublishToXhs}
              disabled={appStore.isPublishing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                appStore.isPublishing
                  ? 'bg-border text-text-secondary cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {appStore.isPublishing ? '发布中...' : '小红书'}
            </button>
          )}
        </div>
        {appStore.errorMessage && <div className="mt-2 text-xs text-red-500">{appStore.errorMessage}</div>}
      </div>
    </aside>
  );
});

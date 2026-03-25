import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { appStore } from '../stores';

function getStatusConfig(status: string): { label: string; bg: string; text: string; dot?: string; pulse?: boolean } {
  switch (status) {
    case 'generating': return { label: '生成中', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', pulse: true };
    case 'validating': return { label: '校验中', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', pulse: true };
    case 'ready': return { label: '待导出', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' };
    case 'ready_with_warnings': return { label: '有提醒', bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' };
    case 'exporting': return { label: '导出中', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', pulse: true };
    case 'done': return { label: '已完成', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };
    case 'published': return { label: '已发布', bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-500' };
    case 'failed': return { label: '失败', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' };
    default: return { label: status, bg: 'bg-slate-50', text: 'text-slate-500' };
  }
}

function StatusPill({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <span className={`status-pill ${config.bg} ${config.text}`}>
      {config.dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.pulse ? 'animate-pulse-dot' : ''}`} />
      )}
      {config.label}
    </span>
  );
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
    appStore.loadModels();
    return () => appStore.clearPollTimer();
  }, []);

  async function handleGenerate() {
    const topic = inputRef.current?.value?.trim();
    if (!topic) return;
    const ok = await appStore.generateJob(topic);
    if (ok) {
      inputRef.current!.value = '';
    }
  }

  function handleSelectJob(jobId: string) {
    appStore.loadJob(jobId);
  }

  async function handleDeleteJob(id: string) {
    if (window.confirm('确认删除此条记录？')) {
      await appStore.deleteJob(id);
    }
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
    <aside className="w-[320px] min-w-[320px] glass-panel rounded-2xl flex flex-col h-full">
      <div className="p-5 border-b border-white/40">
        <h1 className="text-base font-semibold text-slate-800 mb-4">知识卡片生成器</h1>
        <input
          ref={inputRef}
          type="text"
          placeholder="输入前端知识点，如：闭包、虚拟 DOM"
          className="w-full px-3 py-2.5 border border-slate-200/60 rounded-xl text-sm text-slate-800 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 placeholder:text-slate-400 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        {appStore.availableModels.length > 1 && (
          <div className="flex gap-2 mt-3">
            <select
              value={appStore.selectedModelId}
              onChange={(e) => appStore.setModelId(e.target.value)}
              className="flex-1 px-2 py-2 border border-slate-200/60 rounded-lg text-xs text-slate-600 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all cursor-pointer"
            >
              {appStore.availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/models/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modelId: appStore.selectedModelId }),
                  });
                  const data = await res.json();
                  alert(data.success ? `✅ ${data.message}` : `❌ ${data.message}`);
                } catch {
                  alert('❌ 测试失败');
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-black/5 text-slate-500 bg-white/50 hover:bg-white hover:shadow-sm transition-all active:scale-[0.98]"
              title="测试当前模型连接是否有效"
            >
              测试模型
            </button>
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleGenerate}
            disabled={appStore.isGenerating}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              appStore.isGenerating
                ? 'bg-black/5 text-slate-400 cursor-not-allowed'
                : 'bg-[#007AFF] text-white hover:bg-[#006ee6] shadow-sm active:scale-[0.98]'
            }`}
          >
            {appStore.isGenerating ? '生成中...' : '生成内容'}
          </button>
          <button
            onClick={handleCheckXhsAuth}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-black/5 text-slate-500 bg-white/50 hover:bg-white hover:shadow-sm transition-all active:scale-[0.98]"
            title="测试小红书登录态是否有效"
          >
            测试登录
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">历史记录</span>
          <span className="text-xs text-slate-400">{appStore.historyJobs.length} 条</span>
        </div>
        <div className="space-y-2">
          {appStore.historyJobs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">暂无历史记录</p>
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
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    job.id === appStore.currentJobId
                      ? 'bg-indigo-50/80 border border-indigo-200/60 shadow-sm'
                      : 'hover:bg-indigo-100/40 hover:border-indigo-200/50 hover:shadow-sm hover:-translate-y-[1px] border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700 truncate">{job.topic}</div>
                      <div className="mt-1.5">
                        <StatusPill status={job.status} />
                      </div>

                      {progressPreview && (
                        <div className="mt-2 rounded-lg px-2 py-1 text-[11px] leading-4 bg-blue-50/80 text-blue-600">
                          {progressPreview}
                        </div>
                      )}

                      {issuePreview && (
                        <div
                          className={`mt-2 rounded-lg px-2 py-1 text-[11px] leading-4 ${
                            job.status === 'failed'
                              ? 'bg-red-50/80 text-red-500'
                              : 'bg-amber-50/80 text-amber-600'
                          }`}
                        >
                          {job.status === 'failed' ? '失败：' : '提醒：'}
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
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label={`删除 ${job.topic}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/40">
        {appStore.currentJob && (
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-500">当前：{appStore.currentJob.topic}</div>
            {appStore.isDirty && <div className="text-xs text-amber-500 mt-1 font-medium">● 有未保存的修改</div>}
            {isInProgress(appStore.currentJob.status) && appStore.currentJob.progressMessage && (
              <div className="mt-2 rounded-xl px-3 py-2 text-xs leading-5 whitespace-pre-wrap bg-blue-50/80 text-blue-600">
                {appStore.currentJob.progressMessage}
              </div>
            )}
            {(appStore.currentJob.status === 'failed' ||
              appStore.currentJob.status === 'ready_with_warnings') &&
              appStore.currentJob.errorMessage && (
                <div
                  className={`mt-2 rounded-xl px-3 py-2 text-xs leading-5 whitespace-pre-wrap ${
                    appStore.currentJob.status === 'failed'
                      ? 'bg-red-50/80 text-red-500'
                      : 'bg-amber-50/80 text-amber-600'
                  }`}
                >
                  {appStore.currentJob.errorMessage}
                </div>
              )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!appStore.isDirty || appStore.isSaving}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              appStore.isDirty && !appStore.isSaving
                ? 'bg-[#007AFF] text-white hover:bg-[#006ee6] shadow-sm active:scale-[0.98]'
                : 'bg-black/5 text-slate-400 cursor-not-allowed'
            }`}
          >
            {appStore.isSaving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleExport}
            disabled={!appStore.canExport || appStore.isExporting || appStore.isGenerating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              appStore.canExport && !appStore.isExporting && !appStore.isGenerating
                ? 'bg-slate-800 text-white hover:bg-black shadow-sm active:scale-[0.98]'
                : 'bg-black/5 text-slate-400 cursor-not-allowed'
            }`}
          >
            {appStore.isExporting ? '导出中...' : '导出'}
          </button>
          {appStore.canPublishToXhs && (
            <button
              onClick={handlePublishToXhs}
              disabled={appStore.isPublishing}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                appStore.isPublishing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
              }`}
            >
              {appStore.isPublishing ? '发布中...' : '小红书'}
            </button>
          )}
        </div>
        {appStore.errorMessage && (
          <div className="mt-2 text-xs text-red-500 bg-red-50/80 rounded-lg px-3 py-1.5">{appStore.errorMessage}</div>
        )}
      </div>
    </aside>
  );
});

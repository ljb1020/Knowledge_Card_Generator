import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
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

const GeneratorSection = observer(() => {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleGenerate() {
    const topic = inputRef.current?.value?.trim();
    if (!topic) return;
    const ok = await appStore.generateJob(topic);
    if (ok) {
      inputRef.current!.value = '';
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
    <div className="bg-white/40 border border-white/60 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">新建提取</h2>
        {appStore.availableModels.length > 1 && (
          <select
            value={appStore.selectedModelId}
            onChange={(e) => appStore.setModelId(e.target.value)}
            className="w-28 px-2 py-1 border border-slate-200/60 rounded-lg text-[11px] text-slate-600 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all cursor-pointer"
          >
            {appStore.availableModels.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        )}
      </div>
      
      <input
        ref={inputRef}
        type="text"
        placeholder="输入前端知识点，如：闭包、虚拟 DOM"
        className="input-base text-slate-800 shadow-inner"
        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
      />

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={appStore.isGenerating}
          className={`btn-primary flex-1 ${
            appStore.isGenerating
              ? 'btn-disabled'
              : 'bg-slate-800 text-white hover:bg-slate-900'
          }`}
        >
          {appStore.isGenerating ? '生成中...' : '生成卡片'}
        </button>
          {appStore.availableModels.length > 1 && (
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
              className="btn-ghost"
              title="测试当前模型连接是否有效"
            >
              测模型
            </button>
          )}
          <button
            onClick={handleCheckXhsAuth}
            className="btn-ghost"
            title="测试小红书登录态是否有效"
          >
            测账号
          </button>
      </div>
    </div>
  );
});

const HistorySection = observer(() => {
  function handleSelectJob(jobId: string) {
    appStore.loadJob(jobId);
  }

  async function handleDeleteJob(id: string) {
    if (window.confirm('确认删除此条记录？')) {
      await appStore.deleteJob(id);
    }
  }

  return (
    <div className="flex-1 min-h-0 bg-white/40 border border-white/60 rounded-2xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <div className="px-4 py-3 border-b border-white/40 flex items-center justify-between">
        <h2 className="section-title">历史记录</h2>
        <span className="text-[11px] bg-white/60 px-2 py-0.5 rounded-full text-slate-400 border border-slate-100">{appStore.historyJobs.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
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
                    : 'bg-white/40 hover:bg-indigo-50/60 hover:border-indigo-100 border border-transparent hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-700 truncate">{job.topic}</div>
                    <div className="mt-1.5">
                      <StatusPill status={job.status} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteJob(job.id);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
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
  );
});

const PublishModal = observer(({ onClose }: { onClose: () => void }) => {
  const job = appStore.currentJob;
  if (!job) return null;

  const [title, setTitle] = useState(`前端面试卡-${job.topic}`);
  const [content, setContent] = useState(`前端面试遇到面试官问${job.topic}，这样回答才能拿满分`);

  async function handleConfirm() {
    const ok = await appStore.publishToXhs(title, content);
    if (ok) {
      alert('✅ 已起草到小红书');
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full m-4 border border-slate-200/60" onClick={e => e.stopPropagation()}>
        <div className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#ff2442]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          推送到小红书草稿箱
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">笔记标题</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入起草标题..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:bg-white focus:ring-1 focus:ring-red-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">笔记正文</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              placeholder="请输入正文..."
              rows={4}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:bg-white focus:ring-1 focus:ring-red-400 transition-all custom-scrollbar resize-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-5 py-2 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-xl transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            disabled={appStore.isPublishing}
            className={`px-5 py-2 text-white text-sm font-medium rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${appStore.isPublishing ? 'bg-red-400 cursor-not-allowed' : 'bg-[#ff2442] hover:bg-[#e01934]'}`}
          >
            {appStore.isPublishing ? '发布中...' : '确认推送'}
          </button>
        </div>
      </div>
    </div>
  );
});

const ActionSection = observer(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  async function handleSave() {
    await appStore.saveDocument();
  }

  async function handleExport() {
    await appStore.startExport();
  }

  async function handlePublishToXhs() {
    setIsPublishModalOpen(true);
  }

  if (!appStore.currentJob) {
    return (
      <div className="bg-white/40 border border-white/60 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] text-center text-slate-400 text-xs">
        未选中任何记录
      </div>
    );
  }

  return (
    <div className="bg-white/40 border border-white/60 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-3">
      <div>
        <div className="section-title line-clamp-2 leading-relaxed">
          {appStore.currentJob.topic}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <StatusPill status={appStore.currentJob.status} />
          
          {(appStore.currentJob.status === 'failed' || appStore.currentJob.status === 'ready_with_warnings') && appStore.currentJob.errorMessage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className={`btn-secondary flex items-center gap-1 border ${
                appStore.currentJob.status === 'failed'
                  ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:border-red-300'
                  : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
              }`}
              title="点击查看详细信息"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {appStore.currentJob.status === 'failed' ? '错误详情' : '提醒详情'}
            </button>
          )}

          {appStore.isDirty && <span className="text-[10px] text-amber-500 font-medium px-1.5 py-0.5 bg-amber-50 rounded-md border border-amber-100/50">未保存的修改</span>}
        </div>

        {isInProgress(appStore.currentJob.status) && appStore.currentJob.progressMessage && (
          <div className="mt-3 text-[11px] leading-4 text-blue-500 truncate">
            {appStore.currentJob.progressMessage.split('\n').pop()}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={handleSave}
          disabled={!appStore.isDirty || appStore.isSaving}
          className={`flex-1 btn-primary ${
            appStore.isDirty && !appStore.isSaving
              ? 'bg-[#007AFF] text-white hover:bg-[#006ee6]'
              : 'btn-disabled'
          }`}
        >
          {appStore.isSaving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={handleExport}
          disabled={!appStore.canExport || appStore.isExporting || appStore.isGenerating}
          className={`flex-1 btn-primary ${
            appStore.canExport && !appStore.isExporting && !appStore.isGenerating
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'btn-disabled'
          }`}
        >
          {appStore.isExporting ? '导出中...' : '导出'}
        </button>
        {appStore.canPublishToXhs && (
          <button
            onClick={handlePublishToXhs}
            disabled={appStore.isPublishing}
            className={`flex-1 btn-primary ${
              appStore.isPublishing
                ? 'btn-disabled'
                : appStore.currentJob.status === 'published'
                ? 'bg-white text-[#ff2442] border border-[#ff2442]/30 hover:bg-red-50'
                : 'bg-[#ff2442] hover:bg-[#e01934] text-white'
            }`}
            title="一键起草到小红书"
          >
            {appStore.isPublishing 
              ? '发布中...' 
              : appStore.currentJob.status === 'published'
              ? '重新发布'
              : '发布'}
          </button>
        )}
      </div>
      
      {appStore.errorMessage && (
        <div className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
          {appStore.errorMessage}
        </div>
      )}

      {/* 详情弹窗 Modal (统一处理错误和提醒，便于复制与查阅) */}
      {isModalOpen && appStore.currentJob && (appStore.currentJob.status === 'failed' || appStore.currentJob.status === 'ready_with_warnings') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-5 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col m-4 border border-slate-200/60" onClick={e => e.stopPropagation()}>
            <div className={`flex items-center gap-2 mb-4 font-bold text-base ${appStore.currentJob.status === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={appStore.currentJob.status === 'failed' ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
              </svg>
              {appStore.currentJob.status === 'failed' ? '错误详情' : '提醒详情'}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/80 shadow-inner rounded-xl p-3">
              <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700 leading-relaxed font-medium">
                {appStore.currentJob.errorMessage}
              </pre>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl shadow-sm transition-all active:scale-95"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发布配置弹窗 */}
      {isPublishModalOpen && <PublishModal onClose={() => setIsPublishModalOpen(false)} />}
    </div>
  );
});

export default observer(function LeftPanel() {
  useEffect(() => {
    appStore.loadHistoryJobs();
    appStore.loadModels();
    return () => appStore.clearPollTimer();
  }, []);

  return (
    <aside className="w-[340px] min-w-[340px] flex flex-col h-full gap-4 pb-2 pr-1">
      <div className="px-1 flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">

          <h1 className="text-base font-bold text-slate-800 tracking-tight">知识卡片工厂</h1>
        </div>
      </div>
      
      <GeneratorSection />
      <HistorySection />
      <ActionSection />
    </aside>
  );
});

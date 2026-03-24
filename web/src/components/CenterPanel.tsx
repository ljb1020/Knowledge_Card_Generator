import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import type { BulletCard, Card, CoverCard } from 'shared';
import { appStore } from '../stores';

const CARD_ROLE_LABELS = ['定义与价值', '完整面试回答', '高频追问', '易错点'];

export default observer(function CenterPanel() {
  const draft = appStore.documentDraft;

  if (!draft) {
    return (
      <main className="flex-1 glass-panel rounded-2xl flex flex-col p-2 min-w-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-400">
            <div className="text-4xl mb-3 opacity-20">✏️</div>
            <p className="text-sm font-medium">输入知识点并点击"生成内容"</p>
            <p className="text-xs mt-1 opacity-60">开始创建你的面试作答卡组内容</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 glass-panel rounded-2xl flex flex-col p-2 min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 pr-3">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">
            文档编辑 · 共 {draft.cards.length} 个逻辑卡位
          </h2>
          <div className="text-xs text-slate-400 bg-white/60 px-3 py-1 rounded-full">
            定义 → 回答 → 追问 → 易错点
          </div>
        </div>
        <div className="space-y-4">
          {draft.cards.map((card, index) => (
            <CardEditorPanel
              key={card.id}
              card={card}
              index={index}
              roleLabel={CARD_ROLE_LABELS[index] ?? '卡片'}
            />
          ))}
        </div>
      </div>
    </main>
  );
});

function CardEditorPanel({
  card,
  index,
  roleLabel,
}: {
  card: Card;
  index: number;
  roleLabel: string;
}) {
  const isCover = card.type === 'cover';

  return (
    <div className="bg-white/60 rounded-xl border border-white/40 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-500">
            卡位 {index + 1}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-medium">
            {roleLabel}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 uppercase font-mono">
            {card.type}
          </span>
        </div>
      </div>

      {isCover ? (
        <CoverEditor card={card as CoverCard} index={index} />
      ) : (
        <BulletEditor card={card as BulletCard} index={index} />
      )}
    </div>
  );
}

function CoverEditor({ card, index }: { card: CoverCard; index: number }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5">标题</label>
        <AutoResizeTextarea
          value={card.title}
          maxLength={28}
          rows={1}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-200/60 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all"
        />
        <div className="text-[11px] text-slate-400 text-right mt-1">{card.title.length}/28</div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5">副标题</label>
        <AutoResizeTextarea
          value={card.subtitle}
          maxLength={90}
          rows={1}
          onChange={(e) => appStore.updateCardField(index, { subtitle: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-200/60 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all"
        />
        <div className="text-[11px] text-slate-400 text-right mt-1">{card.subtitle.length}/90</div>
      </div>
    </div>
  );
}

function BulletEditor({ card, index }: { card: BulletCard; index: number }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5">标题</label>
        <AutoResizeTextarea
          value={card.title}
          maxLength={28}
          rows={1}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-200/60 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all"
        />
        <div className="text-[11px] text-slate-400 text-right mt-1">{card.title.length}/28</div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5">要点列表</label>
        <div className="space-y-2">
          {card.bullets.map((bullet, bulletIndex) => (
            <div key={bulletIndex} className="flex gap-2">
              <AutoResizeTextarea
                value={bullet}
                maxLength={220}
                rows={1}
                onChange={(e) => appStore.updateBullet(index, bulletIndex, e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-200/60 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all"
              />
              {card.bullets.length > 3 && (
                <button
                  onClick={() => {
                    const newBullets = card.bullets.filter((_, i) => i !== bulletIndex);
                    appStore.updateCardField(index, { bullets: newBullets });
                  }}
                  className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg self-start transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {card.bullets.length < 6 && (
            <button
              onClick={() => appStore.updateCardField(index, { bullets: [...card.bullets, '新要点'] })}
              className="text-xs text-indigo-500 hover:text-indigo-600 py-1 font-medium"
            >
              + 添加要点
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={`overflow-hidden resize-none ${className || ''}`}
      {...props}
    />
  );
}


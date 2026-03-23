import { observer } from 'mobx-react-lite';
import { appStore } from '../stores';
import type { Card, CoverCard, BulletCard, SummaryCard } from 'shared';

export default observer(function CenterPanel() {
  const draft = appStore.documentDraft;

  if (!draft) {
    return (
      <main className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center text-text-secondary">
          <p className="text-sm">输入知识点并点击「生成内容」</p>
          <p className="text-xs mt-1">开始创建您的知识卡片</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background overflow-auto">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-secondary">
            文档编辑 · 共 {draft.cards.length} 页
          </h2>
          {draft.cards.length < 8 && (
            <button
              onClick={() => appStore.addCard(draft.cards.length - 1)}
              className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary/5 transition-colors"
            >
              + 新增一页
            </button>
          )}
        </div>
        <div className="space-y-4">
          {draft.cards.map((card, index) => (
            <CardEditorPanel key={card.id} card={card} index={index} total={draft.cards.length} />
          ))}
        </div>
      </div>
    </main>
  );
});

function CardEditorPanel({
  card,
  index,
  total,
}: {
  card: Card;
  index: number;
  total: number;
}) {
  const isCover = card.type === 'cover';
  const isSummary = card.type === 'summary';
  const isBullet = card.type === 'bullet';
  const canDelete = isBullet && total > 4;
  const canMoveUp = isBullet && index > 1;
  const canMoveDown = isBullet && index < total - 2;

  return (
    <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded bg-background text-text-secondary">
            第 {index + 1} 页
          </span>
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium uppercase">
            {card.type}
          </span>
        </div>
        {isBullet && (
          <div className="flex gap-1">
            <button
              onClick={() => appStore.moveCard(index, 'up')}
              disabled={!canMoveUp}
              className="p-1.5 rounded hover:bg-background text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              title="上移"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => appStore.moveCard(index, 'down')}
              disabled={!canMoveDown}
              className="p-1.5 rounded hover:bg-background text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              title="下移"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => appStore.deleteCard(index)}
              disabled={!canDelete}
              className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {isCover && (
        <CoverEditor card={card as CoverCard} index={index} />
      )}
      {isBullet && (
        <BulletEditor card={card as BulletCard} index={index} />
      )}
      {isSummary && (
        <SummaryEditor card={card as SummaryCard} index={index} />
      )}
    </div>
  );
}

function CoverEditor({ card, index }: { card: CoverCard; index: number }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-secondary block mb-1">标题</label>
        <input
          type="text"
          value={card.title}
          maxLength={24}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.title.length}/24</div>
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1">副标题</label>
        <input
          type="text"
          value={card.subtitle}
          maxLength={40}
          onChange={(e) => appStore.updateCardField(index, { subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.subtitle.length}/40</div>
      </div>
    </div>
  );
}

function BulletEditor({ card, index }: { card: BulletCard; index: number }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-secondary block mb-1">标题</label>
        <input
          type="text"
          value={card.title}
          maxLength={22}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.title.length}/22</div>
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1">要点列表</label>
        <div className="space-y-2">
          {card.bullets.map((b, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={b}
                maxLength={30}
                onChange={(e) => appStore.updateBullet(index, i, e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {card.bullets.length > 2 && (
                <button
                  onClick={() => {
                    const newBullets = card.bullets.filter((_, j) => j !== i);
                    appStore.updateCardField(index, { bullets: newBullets });
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {card.bullets.length < 4 && (
            <button
              onClick={() => {
                const newBullets = [...card.bullets, '新要点'];
                appStore.updateCardField(index, { bullets: newBullets });
              }}
              className="text-xs text-primary hover:text-blue-700 py-1"
            >
              + 添加要点
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryEditor({ card, index }: { card: SummaryCard; index: number }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-secondary block mb-1">标题</label>
        <input
          type="text"
          value={card.title}
          maxLength={22}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.title.length}/22</div>
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1">总结内容</label>
        <textarea
          value={card.summary}
          maxLength={80}
          rows={3}
          onChange={(e) => appStore.updateCardField(index, { summary: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.summary.length}/80</div>
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1">CTA</label>
        <input
          type="text"
          value={card.cta}
          maxLength={24}
          onChange={(e) => appStore.updateCardField(index, { cta: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.cta.length}/24</div>
      </div>
    </div>
  );
}

import { observer } from 'mobx-react-lite';
import type { BulletCard, Card, CoverCard } from 'shared';
import { appStore } from '../stores';

const CARD_ROLE_LABELS = ['定义与价值', '完整面试回答', '高频追问', '易错点'];

export default observer(function CenterPanel() {
  const draft = appStore.documentDraft;

  if (!draft) {
    return (
      <main className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center text-text-secondary">
          <p className="text-sm">输入知识点并点击“生成内容”</p>
          <p className="text-xs mt-1">开始创建你的面试作答卡组</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background overflow-auto">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-secondary">文档编辑 · 共 {draft.cards.length} 页</h2>
          <div className="text-xs text-text-secondary">固定 4 张卡：定义、回答、追问、易错点</div>
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
    <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded bg-background text-text-secondary">
            第 {index + 1} 页
          </span>
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
            {roleLabel}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-background text-text-secondary uppercase">
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
        <label className="text-xs text-text-secondary block mb-1">标题</label>
        <input
          type="text"
          value={card.title}
          maxLength={28}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.title.length}/28</div>
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1">副标题</label>
        <textarea
          value={card.subtitle}
          maxLength={90}
          rows={3}
          onChange={(e) => appStore.updateCardField(index, { subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.subtitle.length}/90</div>
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
          maxLength={28}
          onChange={(e) => appStore.updateCardField(index, { title: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-text-secondary text-right mt-1">{card.title.length}/28</div>
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1">要点列表</label>
        <div className="space-y-2">
          {card.bullets.map((bullet, bulletIndex) => (
            <div key={bulletIndex} className="flex gap-2">
              <textarea
                value={bullet}
                maxLength={220}
                rows={2}
                onChange={(e) => appStore.updateBullet(index, bulletIndex, e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {card.bullets.length > 3 && (
                <button
                  onClick={() => {
                    const newBullets = card.bullets.filter((_, i) => i !== bulletIndex);
                    appStore.updateCardField(index, { bullets: newBullets });
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded self-start"
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

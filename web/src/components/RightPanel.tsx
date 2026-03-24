import { observer } from 'mobx-react-lite';
import { appStore } from '../stores';
import CardPreview from './CardPreview';

export default observer(function RightPanel() {
  const draft = appStore.documentDraft;

  if (!draft) {
    return (
      <section
        className="flex-1 border-l border-border flex items-center justify-center p-6"
        style={{ background: '#080C16' }}
      >
        <div className="text-center" style={{ color: '#334155' }}>
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-sm">预览区域</p>
          <p className="text-xs mt-1 opacity-60">生成内容后将显示实时预览</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex-1 border-l border-border overflow-auto p-6"
      style={{ background: '#080C16' }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-medium" style={{ color: '#334155' }}>实时预览</h2>
      </div>
      <div className="flex flex-col items-center gap-4">
        {draft.cards.map((card, index) => (
          <CardPreview key={card.id} card={card} current={index + 1} total={draft.cards.length} />
        ))}
      </div>
    </section>
  );
});

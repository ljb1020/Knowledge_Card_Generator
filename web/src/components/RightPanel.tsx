import { observer } from 'mobx-react-lite';
import { appStore } from '../stores';
import { expandCards } from '../lib';
import CardPreview from './CardPreview';

export default observer(function RightPanel() {
  const draft = appStore.documentDraft;

  if (!draft) {
    return (
      <section className="flex-1 glass-panel rounded-2xl flex flex-col p-2 min-w-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-sm font-medium">预览区域</p>
            <p className="text-xs mt-1 opacity-60">生成内容后将显示实时预览</p>
          </div>
        </div>
      </section>
    );
  }

  const renderItems = expandCards(draft.cards);

  return (
    <section className="flex-1 glass-panel rounded-2xl flex flex-col p-2 min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 pr-3">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-500">实时预览</h2>
        </div>
      <div className="flex flex-col items-center gap-4">
        {renderItems.map((item) => (
          <CardPreview
            key={item.key}
            card={item.card}
            current={item.current}
            total={item.total}
            sectionIndex={item.sectionIndex}
            bulletsToShow={item.bulletsToShow}
            bulletOffset={item.bulletOffset}
          />
        ))}
      </div>
      </div>
    </section>
  );
});

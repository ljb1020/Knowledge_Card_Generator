import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Job } from 'shared';
import { expandCards } from '../lib';
import ExportCardView from '../components/ExportCardView';

declare global {
  interface Window {
    __EXPORT_READY__?: boolean;
    __EXPORT_LAYOUT_OK__?: boolean;
    __EXPORT_CARD_COUNT__?: number;
  }
}

export default function ExportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    window.__EXPORT_READY__ = false;
    window.__EXPORT_LAYOUT_OK__ = false;
    window.__EXPORT_CARD_COUNT__ = 0;

    if (jobId) {
      fetch(`/api/jobs/${jobId}`)
        .then((res) => res.json())
        .then((data) => setJob(data.job))
        .catch(() => {
          window.__EXPORT_READY__ = true;
          window.__EXPORT_LAYOUT_OK__ = false;
        });
    }
  }, [jobId]);

  useEffect(() => {
    if (!job?.documentJson) return;

    const frameId = requestAnimationFrame(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.export-card'));
      const expectedCount = expandCards(job.documentJson!.cards).length;
      const renderedCount = cards.length;
      const layoutOk =
        renderedCount === expectedCount &&
        renderedCount > 0 &&
        cards.every((card) => card.scrollHeight <= card.clientHeight && card.scrollWidth <= card.clientWidth);

      window.__EXPORT_CARD_COUNT__ = renderedCount;
      window.__EXPORT_LAYOUT_OK__ = layoutOk;
      window.__EXPORT_READY__ = true;
    });

    return () => cancelAnimationFrame(frameId);
  }, [job]);

  if (!job?.documentJson) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-text-secondary">加载中...</p>
      </div>
    );
  }

  const renderItems = expandCards(job.documentJson.cards);

  return (
    <div className="bg-background min-h-screen p-4">
      <h1 className="text-center text-text-secondary mb-4">
        导出模式 - {job.documentJson.topic}
      </h1>
      <div className="flex flex-col items-center gap-4">
        {renderItems.map((item, index) => (
          <div
            key={item.key}
            className="export-card"
            data-page={index + 1}
            data-type={item.card.type}
            style={{ width: '1080px', flexShrink: '0' }}
          >
            <ExportCardView
              card={item.card}
              current={item.current}
              total={item.total}
              sectionIndex={item.sectionIndex}
              bulletsToShow={item.bulletsToShow}
              bulletOffset={item.bulletOffset}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

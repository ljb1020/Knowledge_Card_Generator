import type { Card } from 'shared';
import ExportCardView from './ExportCardView';

interface Props {
  card: Card;
  current: number;
  total: number;
}

export default function CardPreview({ card, current, total }: Props) {
  const scale = 0.35;
  const width = Math.round(1080 * scale);
  const height = Math.round(1440 * scale);

  return (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        flexShrink: '0',
      }}
    >
      <div
        style={{
          width: '1080px',
          height: '1440px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="pointer-events-none"
      >
        <ExportCardView card={card} current={current} total={total} />
      </div>
    </div>
  );
}

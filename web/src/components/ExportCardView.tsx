import type { Card } from 'shared';
import CoverCardView from './CoverCardView';
import BulletCardView from './BulletCardView';

interface Props {
  card: Card;
  current: number;
  total: number;
  sectionIndex: number;
  bulletsToShow: string[];
  bulletOffset: number;
}

export default function ExportCardView({ card, current, total, sectionIndex, bulletsToShow, bulletOffset }: Props) {
  if (card.type === 'cover') {
    return <CoverCardView card={card} current={current} total={total} sectionIndex={sectionIndex} />;
  }

  return (
    <BulletCardView
      card={card}
      current={current}
      total={total}
      sectionIndex={sectionIndex}
      bulletsToShow={bulletsToShow}
      bulletOffset={bulletOffset}
    />
  );
}

import type { Card } from 'shared';
import CoverCardView from './CoverCardView';
import BulletCardView from './BulletCardView';

interface Props {
  card: Card;
  current: number;
  total: number;
}

export default function ExportCardView({ card, current, total }: Props) {
  if (card.type === 'cover') return <CoverCardView card={card} current={current} total={total} />;
  return <BulletCardView card={card} current={current} total={total} />;
}

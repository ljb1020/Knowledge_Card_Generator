import type { BulletCard } from 'shared';

interface Props {
  card: BulletCard;
  current: number;
  total: number;
}

export default function BulletCardView({ card, current, total }: Props) {
  const totalTextLength = card.bullets.reduce((sum, bullet) => sum + bullet.length, 0);
  const textSizeClass = totalTextLength > 220 ? 'text-[28px]' : 'text-[32px]';
  const itemSpacingClass = totalTextLength > 220 ? 'mb-4' : 'mb-5';

  return (
    <div
      className="w-[1080px] h-[1440px] bg-[#F8FAFC] px-[72px] py-[88px] flex flex-col relative"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      }}
    >
      <div
        className="text-[56px] font-bold text-[#0F172A] mb-12"
        style={{ fontWeight: 700, lineHeight: 1.2 }}
      >
        {card.title}
      </div>
      <div className="flex-1">
        {card.bullets.map((b, i) => (
          <div
            key={i}
            className={`${textSizeClass} text-[#0F172A] leading-[1.55] ${itemSpacingClass} pl-5 border-l-4 border-[#2563EB]`}
            style={{ lineHeight: 1.55 }}
          >
            {b}
          </div>
        ))}
      </div>
      <div
        className="absolute bottom-[72px] right-[72px] text-[24px] text-[#475569]"
        style={{ fontFamily: 'inherit' }}
      >
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    </div>
  );
}

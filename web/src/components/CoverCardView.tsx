import type { CoverCard } from 'shared';

interface Props {
  card: CoverCard;
  current: number;
  total: number;
}

export default function CoverCardView({ card, current, total }: Props) {
  return (
    <div
      className="w-[1080px] h-[1440px] bg-[#F8FAFC] px-[72px] py-[88px] flex flex-col relative"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      }}
    >
      <div className="text-[24px] text-[#475569] mb-8">{card.tag}</div>
      <div
        className="text-[76px] font-extrabold text-[#0F172A] mb-8 leading-tight"
        style={{ fontWeight: 800 }}
      >
        {card.title}
      </div>
      <div className="text-[32px] text-[#475569]">{card.subtitle}</div>
      <div
        className="absolute bottom-[72px] right-[72px] text-[24px] text-[#475569]"
        style={{ fontFamily: 'inherit' }}
      >
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    </div>
  );
}

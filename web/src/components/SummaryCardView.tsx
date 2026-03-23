import type { SummaryCard } from 'shared';

interface Props {
  card: SummaryCard;
  current: number;
  total: number;
}

export default function SummaryCardView({ card, current, total }: Props) {
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
      <div
        className="flex-1 text-[34px] text-[#0F172A] leading-[1.7]"
        style={{ lineHeight: 1.7 }}
      >
        {card.summary}
      </div>
      <div className="text-[28px] text-[#2563EB] mt-12 font-medium">
        {card.cta}
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

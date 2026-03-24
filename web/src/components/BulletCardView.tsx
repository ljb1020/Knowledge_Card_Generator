import type { BulletCard } from 'shared';

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const MONO_STACK = '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace';

interface Props {
  card: BulletCard;
  current: number;
  total: number;
}

export default function BulletCardView({ card, current, total }: Props) {
  const totalTextLength = card.bullets.reduce((sum, b) => sum + b.length, 0);
  const textSize =
    totalTextLength > 300 ? '30px' : totalTextLength > 200 ? '32px' : '34px';

  return (
    <div
      className="w-[1080px] h-[1440px] relative overflow-hidden"
      style={{ fontFamily: FONT_STACK, background: '#0D1117' }}
    >
      {/* 顶部微边 */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: '1px', background: 'rgba(59,130,246,0.28)' }}
      />

      {/* 右上光晕 */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: -180,
          right: -120,
          width: 480,
          height: 480,
          background:
            'radial-gradient(ellipse at center, rgba(59,130,246,0.09) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />

      <div
        className="relative z-10 flex flex-col"
        style={{ height: '100%', padding: '80px 72px' }}
      >
        {/* ── 标题行（标题 + 页码同行） ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: '62px',
              fontWeight: 700,
              color: '#E2E8F0',
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
            }}
          >
            {card.title}
          </div>
          <div
            style={{
              fontFamily: MONO_STACK,
              fontSize: '24px',
              color: '#2D3F5A',
              letterSpacing: '0.06em',
              flexShrink: 0,
              paddingTop: '10px',
            }}
          >
            {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        </div>

        {/* 分隔线 */}
        <div
          style={{
            height: '1px',
            background:
              'linear-gradient(90deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.08) 70%, transparent 100%)',
            marginBottom: '40px',
          }}
        />

        {/* ── Bullet 列表 ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {card.bullets.map((b, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '18px',
                marginBottom: 0,
              }}
            >
              {/* 数字徽章 */}
              <div
                style={{
                  flexShrink: 0,
                  width: '54px',
                  height: '54px',
                  border: `1px solid ${i === 0 ? 'rgba(59,130,246,0.45)' : 'rgba(59,130,246,0.22)'}`,
                  borderRadius: '8px',
                  background: i === 0
                    ? 'rgba(59,130,246,0.12)'
                    : 'rgba(59,130,246,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: MONO_STACK,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: i === 0 ? '#93C5FD' : '#4A6A8A',
                  marginTop: '3px',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>

              {/* 内容块 */}
              <div
                style={{
                  flex: 1,
                  paddingTop: '11px',
                  paddingBottom: '13px',
                  paddingLeft: '22px',
                  paddingRight: '20px',
                  borderLeft: `2px solid ${i === 0 ? 'rgba(59,130,246,0.65)' : 'rgba(59,130,246,0.35)'}`,
                  background: i === 0
                    ? 'rgba(59,130,246,0.06)'
                    : 'rgba(255,255,255,0.02)',
                  borderRadius: '0 6px 6px 0',
                  boxShadow: i === 0
                    ? '-3px 0 14px rgba(59,130,246,0.2)'
                    : '-2px 0 8px rgba(59,130,246,0.1)',
                  fontSize: textSize,
                  color: i === 0 ? '#DDE6F0' : '#B8C8DA',
                  lineHeight: 1.65,
                }}
              >
                {b}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部微边 */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '1px', background: 'rgba(59,130,246,0.1)' }}
      />
    </div>
  );
}

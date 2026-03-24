import type { CoverCard } from 'shared';

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const MONO_STACK = '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace';

const DECK_ITEMS = ['定义与价值', '完整作答', '高频追问', '易错点'];

interface Props {
  card: CoverCard;
  current: number;
  total: number;
}

export default function CoverCardView({ card, current, total }: Props) {
  const subtitleIsLong = card.subtitle.length > 60;

  return (
    <div
      className="w-[1080px] h-[1440px] relative overflow-hidden"
      style={{
        fontFamily: FONT_STACK,
        background: '#0A0F1C',
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '48px 48px',
      }}
    >
      {/* 顶部光边 */}
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{
          height: '2px',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.55) 30%, rgba(147,197,253,0.95) 50%, rgba(96,165,250,0.55) 70%, transparent 100%)',
        }}
      />

      {/* 左上径向光晕 */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: -160,
          left: -160,
          width: 800,
          height: 800,
          background:
            'radial-gradient(ellipse at center, rgba(59,130,246,0.16) 0%, rgba(37,99,235,0.06) 45%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* 内容层 */}
      <div
        className="relative z-10 flex flex-col"
        style={{ height: '100%', padding: '88px 72px' }}
      >
        {/* ── 上半区：flex-1，将标题块居中 ── */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Tag：绝对定位左上角，放大 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontFamily: MONO_STACK,
              fontSize: '60px',
              fontWeight: 800,
              color: '#60A5FA',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {card.tag}
          </div>

          {/* 标题 + 副标题居中块，paddingTop 避免与 tag 重叠并使视觉偏上 */}
          <div style={{ paddingTop: '56px' }}>

            {/* 主标题：居中，放大 */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '108px',
                fontWeight: 800,
                color: '#F0F6FF',
                letterSpacing: '-0.03em',
                lineHeight: 1.06,
                marginBottom: '28px',
              }}
            >
              {card.title}
            </div>

            {/* 对称分隔线（居中） */}
            <div
              style={{
                height: '2px',
                width: '80px',
                margin: '0 auto 28px',
                background: 'linear-gradient(90deg, rgba(59,130,246,0.15), #3B82F6, rgba(59,130,246,0.15))',
                boxShadow: '0 0 10px rgba(59,130,246,0.5)',
              }}
            />

            {/* 核心定义小标签 */}
            <div
              style={{
                fontFamily: MONO_STACK,
                fontSize: '25px',
                fontWeight: 800,
                color: '#4A7FA8',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              核心定义
            </div>

            {/* 副标题面板 */}
            <div
              style={{
                borderLeft: '3px solid rgba(59,130,246,0.55)',
                border: '1px solid rgba(59,130,246,0.12)',
                borderLeftWidth: '3px',
                background: 'rgba(59,130,246,0.04)',
                borderRadius: '0 8px 8px 0',
                padding: '22px 28px',
                fontSize: subtitleIsLong ? '32px' : '35px',
                color: '#94A3B8',
                lineHeight: 1.72,
              }}
            >
              {card.subtitle}
            </div>
          </div>
        </div>

        {/* ── 下半区 Bento ─────────────────── */}
        <div style={{ display: 'flex', gap: '14px', height: '268px' }}>

          {/* 左：本套卡组导航 */}
          <div
            style={{
              flex: 1,
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '24px 28px',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: MONO_STACK,
                fontSize: '13px',
                color: '#2D3F5A',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: '22px',
              }}
            >
              本套卡组
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
              }}
            >
              {DECK_ITEMS.map((label, i) => {
                const idx = String(i + 1).padStart(2, '0');
                const isActive = i + 1 === current;
                return (
                  <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                  >
                    <span
                      style={{
                        fontFamily: MONO_STACK,
                        fontSize: '20px',
                        color: isActive ? '#60A5FA' : '#2D3F5A',
                        fontWeight: isActive ? 600 : 400,
                        minWidth: '26px',
                      }}
                    >
                      {idx}
                    </span>
                    <span
                      style={{
                        width: '1px',
                        height: '14px',
                        flexShrink: 0,
                        background: isActive
                          ? 'rgba(59,130,246,0.55)'
                          : 'rgba(255,255,255,0.08)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '26px',
                        color: isActive ? '#E2E8F0' : '#3A4F6A',
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: '#3B82F6',
                          boxShadow: '0 0 7px rgba(59,130,246,0.85)',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右：两个叠放小面板 */}
          <div
            style={{
              width: '252px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* 类型面板 */}
            <div
              style={{
                flex: 1,
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding: '18px 22px',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: MONO_STACK,
                  fontSize: '13px',
                  color: '#2D3F5A',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                类型
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: '#60A5FA',
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {card.tag}
              </div>
            </div>

            {/* 进度面板 */}
            <div
              style={{
                flex: 1,
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding: '18px 22px',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: MONO_STACK,
                  fontSize: '13px',
                  color: '#2D3F5A',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                进度
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span
                  style={{
                    fontFamily: MONO_STACK,
                    fontSize: '54px',
                    fontWeight: 700,
                    color: '#E2E8F0',
                    lineHeight: 1,
                  }}
                >
                  {String(current).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: MONO_STACK,
                    fontSize: '26px',
                    color: '#2D3F5A',
                  }}
                >
                  /{String(total).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
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

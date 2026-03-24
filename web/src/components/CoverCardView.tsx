import type { CoverCard } from 'shared';

const SYS_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const CYBER_MONO =
  '"JetBrains Mono", "SF Mono", "Fira Code", Menlo, monospace';

const NEON_CYAN = '#00F0FF';
const TERM_GREEN = '#00FF41';
const BG = '#030712';
const GRID_COLOR = 'rgba(0,240,255,0.04)';

const DECK_ITEMS = ['定义与价值', '完整作答', '高频追问', '易错点'];

interface Props {
  card: CoverCard;
  current: number;
  total: number;
  sectionIndex: number;  // cover 卡始终为 0
}

/** 四角定位符 */
function CornerMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const SIZE = 30;
  const OFF = 20;
  const base: React.CSSProperties = {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderColor: 'rgba(0,240,255,0.6)',
    borderStyle: 'solid',
    borderWidth: 0,
    pointerEvents: 'none',
  };
  if (pos === 'tl') return <div style={{ ...base, top: OFF, left: OFF, borderTopWidth: 2, borderLeftWidth: 2 }} />;
  if (pos === 'tr') return <div style={{ ...base, top: OFF, right: OFF, borderTopWidth: 2, borderRightWidth: 2 }} />;
  if (pos === 'bl') return <div style={{ ...base, bottom: OFF, left: OFF, borderBottomWidth: 2, borderLeftWidth: 2 }} />;
  return <div style={{ ...base, bottom: OFF, right: OFF, borderBottomWidth: 2, borderRightWidth: 2 }} />;
}

/** 方块进度条 */
function ProgressSquares({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '7px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '16px',
            height: '16px',
            background: i < current ? NEON_CYAN : 'transparent',
            border: `1px solid ${i < current ? NEON_CYAN : 'rgba(0,240,255,0.22)'}`,
            boxShadow: i < current ? `0 0 8px rgba(0,240,255,0.7)` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function CoverCardView({ card, current, total, sectionIndex }: Props) {
  const subtitleIsLong = card.subtitle.length > 60;

  return (
    <div
      className="w-[1080px] h-[1440px] relative overflow-hidden"
      style={{
        fontFamily: SYS_FONT,
        background: BG,
        backgroundImage: [
          `linear-gradient(${GRID_COLOR} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${GRID_COLOR} 1px, transparent 1px)`,
        ].join(', '),
        backgroundSize: '48px 48px',
      }}
    >
      {/* 顶部霓虹光边 */}
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.5) 25%, ${NEON_CYAN} 50%, rgba(0,240,255,0.5) 75%, transparent 100%)`,
          boxShadow: `0 0 12px rgba(0,240,255,0.5)`,
        }}
      />

      {/* 四角定位符 */}
      <CornerMark pos="tl" />
      <CornerMark pos="tr" />
      <CornerMark pos="bl" />
      <CornerMark pos="br" />

      {/* 右侧竖排数据流 */}
      <div
        style={{
          position: 'absolute',
          right: 10,
          top: 160,
          bottom: 160,
          width: 18,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: CYBER_MONO,
            fontSize: '13px',
            color: 'rgba(0,240,255,0.22)',
            letterSpacing: '0.22em',
            whiteSpace: 'nowrap',
            transform: 'rotate(90deg)',
            textTransform: 'uppercase',
          }}
        >
          SYS.READY // 0x00FA · STATUS: NORMAL · DECK_INIT_OK · V2.4.1
        </div>
      </div>

      {/* 径向光晕 */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: -200,
          left: -200,
          width: 900,
          height: 900,
          background: 'radial-gradient(ellipse at center, rgba(0,240,255,0.07) 0%, rgba(0,240,255,0.02) 45%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* 内容层 */}
      <div
        className="relative z-10 flex flex-col"
        style={{ height: '100%', padding: '88px 72px' }}
      >
        {/* ── 上半区：居中标题块 ── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Tag：左上角 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontFamily: CYBER_MONO,
              fontSize: '60px',
              fontWeight: 800,
              color: NEON_CYAN,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textShadow: `0 0 20px rgba(0,240,255,0.5)`,
            }}
          >
            {card.tag}
          </div>

          {/* 右上角系统状态 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontFamily: CYBER_MONO,
              fontSize: '14px',
              color: 'rgba(0,240,255,0.3)',
              letterSpacing: '0.14em',
              textAlign: 'right',
              lineHeight: 2,
              textTransform: 'uppercase',
            }}
          >
            <div>SYS.READY</div>
            <div style={{ color: 'rgba(0,255,65,0.35)' }}>STATUS: OK</div>
            <div>0x00FA</div>
          </div>

          {/* 主标题 + 副标题块 */}
          <div style={{ paddingTop: '80px' }}>
            {/* 主标题 */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '112px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '-0.05em',
                lineHeight: 1.04,
                marginBottom: '32px',
                textShadow: `0 0 28px rgba(0,240,255,0.35), 0 0 56px rgba(0,240,255,0.12)`,
              }}
            >
              {card.title}
            </div>

            {/* 对称光线分隔 */}
            <div
              style={{
                height: '1px',
                margin: '0 auto 32px',
                width: '120px',
                background: `linear-gradient(90deg, transparent, ${NEON_CYAN}, transparent)`,
                boxShadow: `0 0 12px rgba(0,240,255,0.6)`,
              }}
            />

            {/* 核心定义标签 */}
            <div
              style={{
                fontFamily: CYBER_MONO,
                fontSize: '25px',
                fontWeight: 800,
                color: 'rgba(0,240,255,0.65)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              // 核心定义
            </div>

            {/* 副标题面板 */}
            <div
              style={{
                borderLeft: `4px solid ${NEON_CYAN}`,
                border: `1px solid rgba(0,240,255,0.14)`,
                borderLeftWidth: '4px',
                background: 'rgba(0,240,255,0.03)',
                borderRadius: '0 4px 4px 0',
                padding: '24px 30px',
                fontSize: subtitleIsLong ? '32px' : '35px',
                color: '#9ECFDA',
                lineHeight: 1.72,
                boxShadow: `-4px 0 18px rgba(0,240,255,0.12)`,
              }}
            >
              {card.subtitle.trim()}
            </div>
          </div>
        </div>

        {/* ── 下半区 Bento ── */}
        <div style={{ display: 'flex', gap: '12px', height: '268px' }}>

          {/* 左：本套卡组导航 */}
          <div
            style={{
              flex: 1,
              border: `1px solid rgba(0,240,255,0.15)`,
              borderRadius: '4px',
              padding: '22px 26px',
              background: 'rgba(0,240,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: CYBER_MONO,
                fontSize: '14px',
                color: 'rgba(0,240,255,0.4)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              // DECK_STRUCTURE
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
                const isActive = i === sectionIndex;
                return (
                  <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                  >
                    <span
                      style={{
                        fontFamily: CYBER_MONO,
                        fontSize: '20px',
                        color: isActive ? NEON_CYAN : 'rgba(0,240,255,0.25)',
                        fontWeight: isActive ? 700 : 400,
                        minWidth: '28px',
                        textShadow: isActive ? `0 0 8px rgba(0,240,255,0.7)` : 'none',
                      }}
                    >
                      {idx}
                    </span>
                    <span
                      style={{
                        width: '1px',
                        height: '16px',
                        flexShrink: 0,
                        background: isActive ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.07)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '26px',
                        color: isActive ? '#E0F4FF' : 'rgba(224,244,255,0.25)',
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {label}
                    </span>
                    {isActive && (
                      /* 发光方块（替代圆点） */
                      <span
                        style={{
                          marginLeft: 'auto',
                          width: '10px',
                          height: '10px',
                          flexShrink: 0,
                          background: TERM_GREEN,
                          boxShadow: `0 0 8px rgba(0,255,65,0.85), 0 0 16px rgba(0,255,65,0.4)`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右：两个叠放小面板 */}
          <div style={{ width: '252px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* 类型面板 */}
            <div
              style={{
                flex: 1,
                border: `1px solid rgba(0,240,255,0.15)`,
                borderRadius: '4px',
                padding: '16px 20px',
                background: 'rgba(0,240,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: CYBER_MONO,
                  fontSize: '13px',
                  color: 'rgba(0,240,255,0.35)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                // TYPE
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: NEON_CYAN,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  textShadow: `0 0 12px rgba(0,240,255,0.4)`,
                }}
              >
                {card.tag}
              </div>
            </div>

            {/* 进度面板 */}
            <div
              style={{
                flex: 1,
                border: `1px solid rgba(0,240,255,0.15)`,
                borderRadius: '4px',
                padding: '16px 20px',
                background: 'rgba(0,240,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: CYBER_MONO,
                  fontSize: '13px',
                  color: 'rgba(0,240,255,0.35)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                // PROGRESS
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontFamily: CYBER_MONO,
                      fontSize: '54px',
                      fontWeight: 700,
                      color: '#E0F4FF',
                      lineHeight: 1,
                    }}
                  >
                    {String(current).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: CYBER_MONO, fontSize: '26px', color: 'rgba(0,240,255,0.3)' }}>
                    /{String(total).padStart(2, '0')}
                  </span>
                </div>
                <ProgressSquares current={current} total={total} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部光边 */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '1px',
          background: `linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent)`,
        }}
      />
    </div>
  );
}

import type { BulletCard } from 'shared';

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
  card: BulletCard;
  current: number;
  total: number;
  sectionIndex: number;    // 1-3，对应 bento 高亮项
  bulletsToShow: string[]; // 当前页要渲染的 bullets 切片
  bulletOffset: number;    // 序号起始偏移（第二页从 firstHalf.length 开始）
}

function CornerMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const SIZE = 30, OFF = 20;
  const base: React.CSSProperties = {
    position: 'absolute', width: SIZE, height: SIZE,
    borderColor: 'rgba(0,240,255,0.6)', borderStyle: 'solid', borderWidth: 0,
    pointerEvents: 'none',
  };
  if (pos === 'tl') return <div style={{ ...base, top: OFF, left: OFF, borderTopWidth: 2, borderLeftWidth: 2 }} />;
  if (pos === 'tr') return <div style={{ ...base, top: OFF, right: OFF, borderTopWidth: 2, borderRightWidth: 2 }} />;
  if (pos === 'bl') return <div style={{ ...base, bottom: OFF, left: OFF, borderBottomWidth: 2, borderLeftWidth: 2 }} />;
  return <div style={{ ...base, bottom: OFF, right: OFF, borderBottomWidth: 2, borderRightWidth: 2 }} />;
}

function ProgressSquares({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: '16px', height: '16px',
          background: i < current ? NEON_CYAN : 'transparent',
          border: `1px solid ${i < current ? NEON_CYAN : 'rgba(0,240,255,0.22)'}`,
          boxShadow: i < current ? `0 0 8px rgba(0,240,255,0.7)` : 'none',
        }} />
      ))}
    </div>
  );
}

const QUESTION_MARKS = new Set(['？', '?']);

function getQuestionMarkIndexes(text: string): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (QUESTION_MARKS.has(text[i])) {
      indexes.push(i);
    }
  }
  return indexes;
}

function stripAnswerLead(text: string): string {
  return text.replace(/^(?:\s*(?:——|--|-)\s*)+/, '').trim();
}

/**
 * 高频追问的 bullet 经常是“多个连续问题 + 答题方向”。
 * 这里优先按显式答题提示词切分；如果没有提示词，只有在“恰好一个问号”时才退回旧拆法。
 */
function splitQA(text: string): { question: string; answer: string } | null {
  const normalized = text.trim();
  const questionIndexes = getQuestionMarkIndexes(normalized);
  if (questionIndexes.length === 0) return null;

  const cuePatterns = [
    /答题方向[:：]/u,
    /答[:：]/u,
    /——/u,
    /--/u,
    /\s-\s/u,
  ];

  for (const pattern of cuePatterns) {
    const match = pattern.exec(normalized);
    if (!match || match.index <= 0) continue;

    const questionIndex = [...questionIndexes].reverse().find((idx) => idx < match.index);
    if (questionIndex === undefined) continue;

    const question = normalized.slice(0, questionIndex + 1).trim();
    const answer = stripAnswerLead(normalized.slice(match.index));
    if (question && answer) {
      return { question, answer };
    }
  }

  if (questionIndexes.length === 1) {
    const question = normalized.slice(0, questionIndexes[0] + 1).trim();
    const answer = normalized.slice(questionIndexes[0] + 1).trim();
    if (question && answer) {
      return { question, answer };
    }
  }

  return null;
}

export default function BulletCardView({ card, current, total, sectionIndex, bulletsToShow, bulletOffset }: Props) {
  const isFollowUp = card.title === '高频追问';
  const totalTextLength = bulletsToShow.reduce((sum, b) => sum + b.length, 0);
  const textSize = totalTextLength > 200 ? '30px' : totalTextLength > 120 ? '32px' : '34px';

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
      <div className="absolute top-0 left-0 right-0 z-20" style={{
        height: '2px',
        background: `linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.5) 25%, ${NEON_CYAN} 50%, rgba(0,240,255,0.5) 75%, transparent 100%)`,
        boxShadow: `0 0 12px rgba(0,240,255,0.5)`,
      }} />

      <CornerMark pos="tl" />
      <CornerMark pos="tr" />
      <CornerMark pos="bl" />
      <CornerMark pos="br" />

      {/* 右侧竖排数据流 */}
      <div style={{
        position: 'absolute', right: 10, top: 160, bottom: 160, width: 18,
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: CYBER_MONO, fontSize: '13px', color: 'rgba(0,240,255,0.18)',
          letterSpacing: '0.22em', whiteSpace: 'nowrap', transform: 'rotate(90deg)',
          textTransform: 'uppercase',
        }}>
          STREAM_OK · MEM: 128K · CPU: 4% · SYS_NOMINAL
        </div>
      </div>

      {/* 右上光晕 */}
      <div className="absolute pointer-events-none z-0" style={{
        top: -200, right: -150, width: 550, height: 550,
        background: 'radial-gradient(ellipse at center, rgba(0,240,255,0.06) 0%, transparent 65%)',
        borderRadius: '50%',
      }} />

      <div className="relative z-10 flex flex-col" style={{ height: '100%', padding: '80px 72px' }}>

        {/* ── 标题行 ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '24px', marginBottom: '36px',
        }}>
          <div style={{
            fontSize: '62px', fontWeight: 700, color: '#E0F4FF',
            lineHeight: 1.2, letterSpacing: '-0.015em',
            textShadow: `0 0 20px rgba(0,240,255,0.2)`,
          }}>
            {card.title}
          </div>
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'flex-end', gap: '10px', paddingTop: '8px',
          }}>
            <div style={{
              fontFamily: CYBER_MONO, fontSize: '24px',
              color: 'rgba(0,240,255,0.5)', letterSpacing: '0.08em',
            }}>
              {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </div>
            <ProgressSquares current={current} total={total} />
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{
          height: '1px',
          background: `linear-gradient(90deg, ${NEON_CYAN} 0%, rgba(0,240,255,0.08) 60%, transparent 100%)`,
          boxShadow: `0 0 8px rgba(0,240,255,0.3)`,
          marginBottom: '40px',
        }} />

        {/* ── Bullet 列表 ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}>
          {bulletsToShow.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              {/* 终端提示符标号 */}
              <div style={{
                flexShrink: 0, paddingTop: '10px',
                fontFamily: CYBER_MONO, fontSize: '20px', fontWeight: 700,
                whiteSpace: 'nowrap', lineHeight: 1,
              }}>
                <span style={{ color: TERM_GREEN }}>&gt;_</span>
                <span style={{
                  color: 'rgba(0,240,255,0.55)',
                  marginLeft: '6px',
                }}>
                  {String(bulletOffset + i + 1).padStart(2, '0')}
                </span>
              </div>

              {/* 内容块 */}
              <div style={{
                flex: 1,
                paddingTop: '12px', paddingBottom: '14px',
                paddingLeft: '24px', paddingRight: '22px',
                borderLeft: `2px solid rgba(0,240,255,0.35)`,
                background: 'rgba(0,240,255,0.018)',
                borderRadius: '0 4px 4px 0',
                boxShadow: `-2px 0 10px rgba(0,240,255,0.08)`,
                fontSize: textSize,
                lineHeight: 1.65,
              }}>
                {(() => {
                  const qa = isFollowUp ? splitQA(b.trim()) : null;
                  if (qa) {
                    return (
                      <>
                        <div style={{ color: '#C8E8FF', fontWeight: 600, marginBottom: '10px' }}>
                          {qa.question}
                        </div>
                        <div style={{ color: '#8AAFC4' }}>
                          {qa.answer}
                        </div>
                      </>
                    );
                  }
                  return <span style={{ color: '#8AAFC4' }}>{b.trim()}</span>;
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bento 导航 ── */}
        <div style={{ display: 'flex', gap: '12px', height: '200px', marginTop: '40px' }}>

          {/* 左：本套卡组导航 */}
          <div style={{
            flex: 1, border: `1px solid rgba(0,240,255,0.15)`,
            borderRadius: '4px', padding: '18px 24px',
            background: 'rgba(0,240,255,0.02)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              fontFamily: CYBER_MONO, fontSize: '13px',
              color: 'rgba(0,240,255,0.4)', letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: '14px',
            }}>
              // DECK_STRUCTURE
            </div>
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'space-around',
            }}>
              {DECK_ITEMS.map((label, i) => {
                const idx = String(i + 1).padStart(2, '0');
                const isActive = i === sectionIndex;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontFamily: CYBER_MONO, fontSize: '18px',
                      color: isActive ? NEON_CYAN : 'rgba(0,240,255,0.25)',
                      fontWeight: isActive ? 700 : 400,
                      minWidth: '24px',
                      textShadow: isActive ? `0 0 8px rgba(0,240,255,0.7)` : 'none',
                    }}>{idx}</span>
                    <span style={{
                      width: '1px', height: '13px', flexShrink: 0,
                      background: isActive ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.07)',
                    }} />
                    <span style={{
                      fontSize: '22px',
                      color: isActive ? '#E0F4FF' : 'rgba(224,244,255,0.25)',
                      fontWeight: isActive ? 500 : 400,
                    }}>{label}</span>
                    {isActive && (
                      <span style={{
                        marginLeft: 'auto', width: '9px', height: '9px',
                        flexShrink: 0, background: TERM_GREEN,
                        boxShadow: `0 0 8px rgba(0,255,65,0.85), 0 0 16px rgba(0,255,65,0.4)`,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右：两个叠放小面板 */}
          <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              flex: 1, border: `1px solid rgba(0,240,255,0.15)`,
              borderRadius: '4px', padding: '14px 18px',
              background: 'rgba(0,240,255,0.02)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{
                fontFamily: CYBER_MONO, fontSize: '12px',
                color: 'rgba(0,240,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>// TYPE</div>
              <div style={{
                fontSize: '22px', color: NEON_CYAN, fontWeight: 600,
                textShadow: `0 0 12px rgba(0,240,255,0.4)`,
              }}>前端面试卡</div>
            </div>
            <div style={{
              flex: 1, border: `1px solid rgba(0,240,255,0.15)`,
              borderRadius: '4px', padding: '14px 18px',
              background: 'rgba(0,240,255,0.02)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{
                fontFamily: CYBER_MONO, fontSize: '12px',
                color: 'rgba(0,240,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>// PROGRESS</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{
                  fontFamily: CYBER_MONO, fontSize: '38px', fontWeight: 700,
                  color: '#E0F4FF', lineHeight: 1,
                }}>{String(current).padStart(2, '0')}</span>
                <span style={{ fontFamily: CYBER_MONO, fontSize: '20px', color: 'rgba(0,240,255,0.3)' }}>
                  /{String(total).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部光边 */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '1px',
        background: `linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent)`,
      }} />
    </div>
  );
}

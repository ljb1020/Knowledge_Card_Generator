import db from 'better-sqlite3';

const sqlite = db('../storage/db.sqlite');
const rows = sqlite.prepare("SELECT document_json FROM jobs WHERE topic LIKE '%垃圾回收%' ORDER BY created_at DESC LIMIT 1").all();

if (rows.length > 0) {
  const doc = JSON.parse(rows[0].document_json);
  const card = doc.cards.find(c => c.title === '易错点');
  console.log(JSON.stringify(card.bullets, null, 2));

  // Let's run the exact same math as expandCards.ts
  const MAX_USABLE_HEIGHT = 889;
  const CHARS_PER_LINE = 27;     
  const LINE_HEIGHT_PX = 49.5;   
  const BULLET_PADDING_PX = 26;  
  const BULLET_GAP_PX = 28;      

  function estimate(text, isFollowUp) {
    let h = BULLET_PADDING_PX;
    if (isFollowUp && (text.includes('？') || text.includes('?'))) {
      const lines = Math.ceil(text.length / CHARS_PER_LINE);
      h += lines * LINE_HEIGHT_PX + 10;
      return h;
    }
    const lines = Math.ceil(text.length / CHARS_PER_LINE);
    h += lines * LINE_HEIGHT_PX;
    return h;
  }

  let currentHeight = 0;
  for (let i = 0; i < card.bullets.length; i++) {
    const text = card.bullets[i];
    const h = estimate(text, false);
    const gap = currentHeight > 0 ? BULLET_GAP_PX : 0;
    
    console.log(`Bullet ${i + 1} (${text.length} chars): ${Math.ceil(text.length / CHARS_PER_LINE)} lines = ${h}px (height ${currentHeight} + gap ${gap} + ${h} = ${currentHeight + gap + h})`);
    
    currentHeight += gap + h;
  }
} else {
  console.log('Job not found');
}

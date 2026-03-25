/**
 * 校验共享工具：Stage 1（底稿）和 Stage 2（卡片）共用的范围校验逻辑和常量。
 * 
 * 设计原则：总字数范围只作为 warning（信息提示），永不阻断。
 * 真正的 hard 约束是：
 *   - 每条 bullet 的单条长度（由 Zod schema 管控：bulletMin~bulletMax）
 *   - bullet 条数（2~6 条）
 *   - 结构完整性（cover + 3 bullet 卡位）
 * 
 * 这样不同知识点可以自由伸缩信息量，分页引擎兜底视觉渲染。
 */

export interface RangeCheck {
  hardMin: number;
  hardMax: number;
  idealMin: number;
  idealMax: number;
}

export interface ValidationCollector {
  hardErrors: string[];
  warnings: string[];
}

// ── 总字数参考范围（仅作 warning，不做 hard 阻断） ──

export const ANSWER_RANGE: RangeCheck = {
  hardMin: 200,
  hardMax: 1200,
  idealMin: 300,
  idealMax: 800,
};

export const FOLLOW_UP_RANGE: RangeCheck = {
  hardMin: 120,
  hardMax: 1000,
  idealMin: 200,
  idealMax: 600,
};

export const PITFALL_RANGE: RangeCheck = {
  hardMin: 120,
  hardMax: 1000,
  idealMin: 200,
  idealMax: 600,
};

// ── 共享校验函数 ──

/**
 * 总字数校验：只产生 warning，永不产生 hard error。
 * 真正的质量约束由 Zod schema（单条长度）和条数检查负责。
 */
export function pushRangeIssue(
  collector: ValidationCollector,
  stageLabel: string,
  partLabel: string,
  actualLength: number,
  range: RangeCheck
): void {
  if (actualLength < range.hardMin) {
    collector.warnings.push(
      `${stageLabel} / ${partLabel} / 总字数 ${actualLength} 低于建议下限 ${range.hardMin}，内容可能偏薄`
    );
    return;
  }

  if (actualLength > range.hardMax) {
    collector.warnings.push(
      `${stageLabel} / ${partLabel} / 总字数 ${actualLength} 超过建议上限 ${range.hardMax}，内容可能偏冗长`
    );
    return;
  }

  if (actualLength < range.idealMin || actualLength > range.idealMax) {
    collector.warnings.push(
      `${stageLabel} / ${partLabel} / 总字数 ${actualLength} 偏离理想范围 ${range.idealMin}~${range.idealMax}`
    );
  }
}

export function pushCountIssue(
  collector: ValidationCollector,
  stageLabel: string,
  partLabel: string,
  actualCount: number,
  idealMin: number,
  idealMax: number,
  hardMin: number,
  hardMax: number
): void {
  if (actualCount < hardMin || actualCount > hardMax) {
    collector.hardErrors.push(
      `${stageLabel} / ${partLabel} / 条数 ${actualCount} 超出可接受范围 ${hardMin}~${hardMax}`
    );
    return;
  }

  if (actualCount < idealMin || actualCount > idealMax) {
    collector.warnings.push(
      `${stageLabel} / ${partLabel} / 条数 ${actualCount} 偏离理想范围 ${idealMin}~${idealMax}`
    );
  }
}

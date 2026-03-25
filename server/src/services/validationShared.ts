/**
 * 校验共享工具：Stage 1（底稿）和 Stage 2（卡片）共用的范围校验逻辑和常量。
 * 单点维护，避免两侧漂移。
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

// ── 共享常量 ──

export const ANSWER_RANGE: RangeCheck = {
  hardMin: 240,
  hardMax: 1000,
  idealMin: 300,
  idealMax: 800,
};

export const FOLLOW_UP_RANGE: RangeCheck = {
  hardMin: 160,
  hardMax: 800,
  idealMin: 200,
  idealMax: 600,
};

export const PITFALL_RANGE: RangeCheck = {
  hardMin: 160,
  hardMax: 800,
  idealMin: 200,
  idealMax: 600,
};

// ── 共享校验函数 ──

export function pushRangeIssue(
  collector: ValidationCollector,
  stageLabel: string,
  partLabel: string,
  actualLength: number,
  range: RangeCheck
): void {
  if (actualLength < range.hardMin || actualLength > range.hardMax) {
    collector.hardErrors.push(
      `${stageLabel} / ${partLabel} / 总字数 ${actualLength} 超出可接受范围 ${range.hardMin}~${range.hardMax}`
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

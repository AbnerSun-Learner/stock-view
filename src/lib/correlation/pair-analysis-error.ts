/**
 * 可安全展示给前端的业务错误（与脚本/网络一类“未预期”错误区分）。
 */

export class PairAnalysisUserError extends Error {
  readonly code = "PAIR_ANALYSIS_USER";

  constructor(message: string) {
    super(message);
    this.name = "PairAnalysisUserError";
  }
}

export function isPairAnalysisUserError(
  error: unknown
): error is PairAnalysisUserError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as PairAnalysisUserError).name === "PairAnalysisUserError"
  );
}

export const SCORE_FIELDS = [
  "scorePromptMatch",
  "scoreReference",
  "scoreMotion",
  "scoreAudioSync",
] as const;

export function computeOverallScore(scores: number[]) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((total / scores.length) * 10) / 10;
}

export function formatScore(score: number) {
  return score.toFixed(1);
}

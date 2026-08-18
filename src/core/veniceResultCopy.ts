/** Locked Venice CASE card voice. Do not invent new copy. */
export const VENICE_RESULT_COPY = {
  makeHeadline: "That's the Bonds Bounce.",
  makeSub: 'The card is the proof. You ran Eastbay.',
  missHeadline: 'Missed the plant, not the rim.',
  missSub: 'Gather was late. The block foot paid for it.',
  nextAttempt: 'NEXT ATTEMPT. Same plant.',
  instantRetry: 'INSTANT RETRY. Same plant.',
  eastbayName: 'Eastbay Master Standard',
  eastbayLine: '164 ms / 4.8x / 38.5 in / 3°',
  eastbayRole: 'CASE comparison',
  eastbayClass: 'NOT CLINICAL',
} as const;

/** Gather-late line only when gather was late. No invented AIR / mushy / rim-out copy. */
export function caseMissSub(reason: 'EARLY' | 'LATE' | 'AIR' | 'SHORT' | 'RIM_OUT' | 'MUSHY_PLANT' | null): string {
  if (reason === 'LATE') return VENICE_RESULT_COPY.missSub;
  return '';
}

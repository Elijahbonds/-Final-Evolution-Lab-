/** Locked Venice CASE card voice. Do not invent new copy. */
export const VENICE_RESULT_COPY = {
  makeHeadline: "That's the Bonds Bounce.",
  makeSub: 'The card is the proof. You ran Eastbay.',
  missHeadline: 'Missed the plant, not the rim.',
  missSub: 'Gather was late. The block foot paid for it.',
  missSubAir: "Never got there. That's air.",
  missSubMushy: 'Gather was late. The block foot paid for it.',
  missSubRimOut: 'Caught iron. Off the window.',
  nextAttempt: 'NEXT ATTEMPT. Same plant.',
  instantRetry: 'INSTANT RETRY. Same plant.',
  eastbayName: 'Eastbay Master Standard',
  eastbayLine: '164 ms / 4.8x / 38.5 in / 3°',
  eastbayRole: 'CASE comparison',
  eastbayClass: 'NOT CLINICAL',
} as const;

/** Headline is always the plant miss. Gather-late sub only on MUSHY_PLANT. */
export function caseMissSub(reason: 'EARLY' | 'LATE' | 'AIR' | 'SHORT' | 'RIM_OUT' | 'MUSHY_PLANT' | null): string {
  if (reason === 'AIR') return VENICE_RESULT_COPY.missSubAir;
  if (reason === 'MUSHY_PLANT') return VENICE_RESULT_COPY.missSubMushy;
  if (reason === 'RIM_OUT') return VENICE_RESULT_COPY.missSubRimOut;
  return '';
}

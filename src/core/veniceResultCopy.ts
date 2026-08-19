/** Locked Venice CASE card voice. Wire missReason to these strings only. */
export const VENICE_RESULT_COPY = {
  makeHeadline: "That's the Bonds Bounce.",
  makeSub: 'The card is the proof. You ran Eastbay.',
  missHeadline: 'Missed the plant, not the rim.',
  missSubLate: 'Gather was late. The block foot paid for it.',
  missSubEarly: 'Left too early. You never loaded it.',
  missSubMushy: 'You stayed in the plant.',
  missSubAir: "Never got there. That's air.",
  missSubRimOut: 'Caught iron. Off the window.',
  nextAttempt: 'NEXT ATTEMPT. Same plant.',
  instantRetry: 'INSTANT RETRY. Same plant.',
  eastbayName: 'Eastbay Master Standard',
  eastbayLine: '164 ms / 4.8x / 38.5 in / 3°',
  eastbayRole: 'CASE comparison',
  eastbayClass: 'NOT CLINICAL',
} as const;

export type CaseMissReason = 'EARLY' | 'LATE' | 'AIR' | 'SHORT' | 'RIM_OUT' | 'MUSHY_PLANT' | null;

/** Plant-miss headline only on LATE / EARLY / MUSHY. SHORT is AIR. */
export function caseMissHeadline(reason: CaseMissReason): string {
  if (reason === 'LATE' || reason === 'EARLY' || reason === 'MUSHY_PLANT') {
    return VENICE_RESULT_COPY.missHeadline;
  }
  if (reason === 'RIM_OUT') return VENICE_RESULT_COPY.missSubRimOut;
  if (reason === 'AIR' || reason === 'SHORT') return VENICE_RESULT_COPY.missSubAir;
  return VENICE_RESULT_COPY.missSubAir;
}

export function caseMissSub(reason: CaseMissReason): string {
  if (reason === 'LATE') return VENICE_RESULT_COPY.missSubLate;
  if (reason === 'EARLY') return VENICE_RESULT_COPY.missSubEarly;
  if (reason === 'MUSHY_PLANT') return VENICE_RESULT_COPY.missSubMushy;
  if (reason === 'AIR' || reason === 'SHORT') return VENICE_RESULT_COPY.missSubAir;
  if (reason === 'RIM_OUT') return VENICE_RESULT_COPY.missSubRimOut;
  return '';
}

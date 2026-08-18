/** Venice CASE card voice. Route headline and sub by miss reason. */
export const VENICE_RESULT_COPY = {
  makeHeadline: "That's the Bonds Bounce.",
  makeSub: 'The card is the proof. You ran Eastbay.',
  missHeadline: 'Missed the plant, not the rim.',
  missHeadlineLate: 'Gather was late.',
  missHeadlineEarly: 'Gather was early.',
  missHeadlineAir: 'Never got there.',
  missHeadlineRimOut: 'Caught iron.',
  missSub: 'Gather was late. The block foot paid for it.',
  missSubLate: 'Gather was late. The block foot paid for it.',
  missSubEarly: 'You mashed the mark.',
  missSubMushy: 'Held too long. The bounce sat.',
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

export function caseMissHeadline(reason: CaseMissReason): string {
  if (reason === 'LATE') return VENICE_RESULT_COPY.missHeadlineLate;
  if (reason === 'EARLY') return VENICE_RESULT_COPY.missHeadlineEarly;
  if (reason === 'AIR') return VENICE_RESULT_COPY.missHeadlineAir;
  if (reason === 'RIM_OUT') return VENICE_RESULT_COPY.missHeadlineRimOut;
  return VENICE_RESULT_COPY.missHeadline;
}

export function caseMissSub(reason: CaseMissReason): string {
  if (reason === 'LATE') return VENICE_RESULT_COPY.missSubLate;
  if (reason === 'EARLY') return VENICE_RESULT_COPY.missSubEarly;
  if (reason === 'MUSHY_PLANT') return VENICE_RESULT_COPY.missSubMushy;
  if (reason === 'AIR') return VENICE_RESULT_COPY.missSubAir;
  if (reason === 'RIM_OUT') return VENICE_RESULT_COPY.missSubRimOut;
  return '';
}

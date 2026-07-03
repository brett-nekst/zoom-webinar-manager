// Webinars alternate weekly between an Advanced and a New User training.
// The type is a deterministic function of the meeting date, anchored so that
// the week of 2026-07-08 is "Advanced". Both the manual create (dashboard) and
// the weekly cron use this single source of truth.

// Anchor Wednesday that is an "Advanced" session (local date, noon UTC to avoid
// any timezone date-shift when parsing).
const ANCHOR_ADVANCED = Date.UTC(2026, 6, 8); // July 8, 2026
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WebinarContent {
  type: 'advanced' | 'new-user';
  topic: string;
  agenda: string;
}

const ADVANCED: WebinarContent = {
  type: 'advanced',
  topic: 'Nekst Advanced User Training',
  agenda:
    'For current Nekst users ready to go deeper — advanced workflows, maximizing features, and power-user tips to get more out of Nekst.',
};

const NEW_USER: WebinarContent = {
  type: 'new-user',
  topic: 'Nekst New User Training',
  agenda:
    "New to Nekst or just getting started? We'll walk through the fundamentals — setup, your first workflows, and how to hit the ground running.",
};

/**
 * Returns the alternating webinar content for a given Wednesday.
 * @param dateStr A date in `YYYY-MM-DD` form (the meeting's local date).
 * Even number of weeks from the anchor → Advanced; odd → New User.
 */
export function getWebinarContent(dateStr: string): WebinarContent {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateUTC = Date.UTC(y, m - 1, d);
  // Round to nearest week to stay robust against DST-induced sub-day drift.
  const weeks = Math.round((dateUTC - ANCHOR_ADVANCED) / WEEK_MS);
  return weeks % 2 === 0 ? ADVANCED : NEW_USER;
}

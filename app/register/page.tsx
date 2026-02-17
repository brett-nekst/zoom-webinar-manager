'use client';

import { useEffect, useState } from 'react';

interface ZoomMeeting {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password: string;
}

interface AvailableDate {
  meeting: ZoomMeeting;
  dateLabel: string;
  timeLabel: string;
}

type Step = 'select' | 'form' | 'success';

export default function RegisterPage() {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMeeting, setSelectedMeeting] = useState<ZoomMeeting | null>(null);
  const [step, setStep] = useState<Step>('select');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const res = await fetch('/api/zoom/meetings');
        if (!res.ok) {
          setLoadError('Unable to load available dates. Please try again later.');
          return;
        }
        const meetings: ZoomMeeting[] = await res.json();

        // Filter to only upcoming meetings (next 3 Wednesdays logic)
        const now = new Date();
        const upcoming = meetings
          .filter((m) => new Date(m.start_time) > now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 3)
          .map((m) => ({
            meeting: m,
            dateLabel: new Date(m.start_time).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'America/New_York',
            }),
            timeLabel: new Date(m.start_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
              timeZone: 'America/New_York',
            }),
          }));

        setAvailableDates(upcoming);
      } catch {
        setLoadError('Unable to load available dates. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchMeetings();
  }, []);

  const handleContinue = () => {
    if (selectedMeeting) setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    setSubmitting(true);
    setSubmitError(null);

    const selected = availableDates.find((d) => d.meeting.id === selectedMeeting.id);

    try {
      const res = await fetch('/api/hubspot/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          meetingId: selectedMeeting.id,
          meetingDate: selected?.dateLabel || '',
          meetingTopic: selectedMeeting.topic,
          joinUrl: selectedMeeting.join_url,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setJoinUrl(selectedMeeting.join_url);
      setStep('success');
    } catch {
      setSubmitError('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDateInfo = availableDates.find((d) => d.meeting.id === selectedMeeting?.id);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-xl mx-auto px-6 py-5">
          <h1 className="text-xl font-semibold text-white">Nekst Tips &amp; Tricks Webinar</h1>
          <p className="text-sm text-gray-400 mt-0.5">Register for an upcoming session</p>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-6 py-10">
        {/* Step: Select Date */}
        {step === 'select' && (
          <div>
            <h2 className="text-base font-medium text-white mb-1">Choose a date</h2>
            <p className="text-sm text-gray-400 mb-6">All sessions are at 2:00 PM Eastern Time</p>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-900 border border-gray-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="p-4 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
                {loadError}
              </div>
            ) : availableDates.length === 0 ? (
              <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 text-sm">
                No upcoming sessions are scheduled at this time. Check back soon.
              </div>
            ) : (
              <div className="space-y-3">
                {availableDates.map(({ meeting, dateLabel, timeLabel }) => {
                  const isSelected = selectedMeeting?.id === meeting.id;
                  return (
                    <button
                      key={meeting.id}
                      onClick={() => setSelectedMeeting(meeting)}
                      className={`w-full text-left rounded-xl border px-5 py-4 transition-colors ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-600'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-blue-500' : 'border-gray-600'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{dateLabel}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{timeLabel}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {availableDates.length > 0 && (
              <button
                onClick={handleContinue}
                disabled={!selectedMeeting}
                className="mt-6 w-full py-3 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Step: Registration Form */}
        {step === 'form' && selectedDateInfo && (
          <div>
            <button
              onClick={() => setStep('select')}
              className="text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors"
            >
              &larr; Change date
            </button>

            <div className="mb-6 p-4 bg-blue-950/40 border border-blue-800/50 rounded-xl">
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">
                Selected Session
              </div>
              <div className="text-sm font-medium text-white">{selectedDateInfo.dateLabel}</div>
              <div className="text-xs text-gray-400 mt-0.5">{selectedDateInfo.timeLabel}</div>
            </div>

            <h2 className="text-base font-medium text-white mb-5">Your information</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Jane"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Smith"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jane@example.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
              </div>

              {submitError && (
                <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full py-3 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Registering...' : 'Register Now'}
              </button>

              <p className="text-xs text-gray-600 text-center">
                By registering, you agree to receive emails about this webinar.
              </p>
            </form>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && selectedDateInfo && (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-900/40 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">You&apos;re registered!</h2>
            <p className="text-sm text-gray-400 mb-6">
              See you on {selectedDateInfo.dateLabel} at {selectedDateInfo.timeLabel}.
            </p>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left mb-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Join Information
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">Topic</div>
                <div className="text-sm text-white">{selectedDateInfo.meeting.topic}</div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">Date &amp; Time</div>
                <div className="text-sm text-white">
                  {selectedDateInfo.dateLabel} at {selectedDateInfo.timeLabel}
                </div>
              </div>

              {joinUrl && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">Join Link</div>
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-600">
              Save the join link above — a confirmation email may also be on its way.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

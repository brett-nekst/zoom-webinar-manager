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

// Nekst brand colors
const BRAND_BLUE = '#1565D8';
const NAVY = '#0D1F3C';
const GRAY_TEXT = '#64748B';
const INPUT_BORDER = '#CBD5E1';
const INPUT_FOCUS = '#1565D8';
const BG_HERO_FROM = '#C8E2F5';
const BG_HERO_TO = '#EEF5FB';

export default function RegisterPage() {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMeeting, setSelectedMeeting] = useState<ZoomMeeting | null>(null);
  const [step, setStep] = useState<Step>('select');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
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

        const now = new Date();
        const upcoming = meetings
          .filter(
            (m) =>
              new Date(m.start_time) > now &&
              m.topic.toLowerCase().includes('nekst tips')
          )
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
          company,
          role,
          meetingId: selectedMeeting.id,
          meetingDate: selected?.dateLabel || '',
          meetingStartTime: selectedMeeting.start_time,
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

  const inputStyle = {
    width: '100%',
    background: '#fff',
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '14px',
    color: NAVY,
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(180deg, ${BG_HERO_FROM} 0%, ${BG_HERO_TO} 100%)`,
          padding: '60px 24px 48px',
          textAlign: 'center',
        }}
      >
        {/* Nekst logo */}
        <div style={{ marginBottom: '28px' }}>
          <img
            src="https://cdn.prod.website-files.com/6686ec1023f507e468f04ac6/668707e8a00a5ffa6b3600cb_nekst-logo-color.svg"
            alt="Nekst"
            style={{ height: '48px', display: 'inline-block' }}
          />
        </div>

        <p style={{ fontSize: '13px', fontWeight: 600, color: BRAND_BLUE, marginBottom: '10px', letterSpacing: '0.02em' }}>
          See what Nekst is all about
        </p>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: NAVY,
            lineHeight: 1.25,
            margin: '0 auto 16px',
            maxWidth: '520px',
          }}
        >
          Join us live for a comprehensive webinar on all things Nekst
        </h1>
        <p style={{ fontSize: '15px', color: GRAY_TEXT, maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Dive into Nekst, best practices for accelerating your workflows, and building a foundation
          of defensibility for your business.
        </p>
      </div>

      {/* Form card */}
      <div style={{ background: '#F1F5F9', padding: '48px 24px 64px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '40px 36px',
            maxWidth: '560px',
            margin: '0 auto',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          {/* Nekst logo inside card */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src="https://cdn.prod.website-files.com/6686ec1023f507e468f04ac6/668707e8a00a5ffa6b3600cb_nekst-logo-color.svg"
              alt="Nekst"
              style={{ height: '56px', display: 'inline-block' }}
            />
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: NAVY,
              textAlign: 'center',
              marginBottom: '28px',
            }}
          >
            Nekst Tips &amp; Tricks Webinar Registration
          </h2>

          {/* Step: Select Date */}
          {step === 'select' && (
            <div>
              <p style={{ fontSize: '13px', color: GRAY_TEXT, marginBottom: '16px', fontWeight: 500 }}>
                Choose a date — all sessions at 2:00 PM Eastern Time
              </p>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: '58px',
                        background: '#F1F5F9',
                        borderRadius: '6px',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                  ))}
                </div>
              ) : loadError ? (
                <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', color: '#DC2626', fontSize: '14px' }}>
                  {loadError}
                </div>
              ) : availableDates.length === 0 ? (
                <div style={{ padding: '12px 16px', background: '#F8FAFC', border: `1px solid ${INPUT_BORDER}`, borderRadius: '6px', color: GRAY_TEXT, fontSize: '14px' }}>
                  No upcoming sessions are scheduled at this time. Check back soon.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {availableDates.map(({ meeting, dateLabel, timeLabel }) => {
                    const isSelected = selectedMeeting?.id === meeting.id;
                    return (
                      <button
                        key={meeting.id}
                        onClick={() => setSelectedMeeting(meeting)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '14px 16px',
                          background: isSelected ? '#EFF6FF' : '#fff',
                          border: `1.5px solid ${isSelected ? BRAND_BLUE : INPUT_BORDER}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, background 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? BRAND_BLUE : '#94A3B8'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BRAND_BLUE }} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>{dateLabel}</div>
                            <div style={{ fontSize: '12px', color: GRAY_TEXT, marginTop: '2px' }}>{timeLabel}</div>
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
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '12px',
                    background: selectedMeeting ? BRAND_BLUE : '#94A3B8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: selectedMeeting ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: BRAND_BLUE,
                  fontFamily: 'inherit',
                  padding: '0',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← Change date
              </button>

              <div
                style={{
                  padding: '12px 16px',
                  background: '#EFF6FF',
                  border: `1px solid #BFDBFE`,
                  borderRadius: '6px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: BRAND_BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Selected Session
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>{selectedDateInfo.dateLabel}</div>
                <div style={{ fontSize: '12px', color: GRAY_TEXT, marginTop: '2px' }}>{selectedDateInfo.timeLabel}</div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}>
                      First Name<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Jane"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
                      onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}>
                      Last Name<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Smith"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
                      onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}>
                    Email<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="jane@example.com"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
                    onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Realty"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
                    onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}>
                    What best describes your role?
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      ...inputStyle,
                      color: role ? NAVY : '#94A3B8',
                      appearance: 'auto',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
                    onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
                  >
                    <option value="" disabled>Select your role...</option>
                    <option value="Individual Agent">Individual Agent</option>
                    <option value="Real Estate Team">Real Estate Team</option>
                    <option value="Independent Transaction Coordinator">Independent Transaction Coordinator</option>
                    <option value="Team of TC&apos;s">Team of TC&apos;s</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {submitError && (
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', color: '#DC2626', fontSize: '13px' }}>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '12px',
                    background: submitting ? '#94A3B8' : BRAND_BLUE,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  {submitting ? 'Registering...' : 'Secure your spot'}
                </button>

                <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: 0 }}>
                  By registering, you agree to receive emails about this webinar.
                </p>
              </form>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && selectedDateInfo && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: '#D1FAE5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 700, color: NAVY, marginBottom: '8px' }}>
                You&apos;re registered!
              </h2>
              <p style={{ fontSize: '14px', color: GRAY_TEXT, marginBottom: '28px', lineHeight: 1.6 }}>
                See you on {selectedDateInfo.dateLabel} at {selectedDateInfo.timeLabel}.
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: `1px solid ${INPUT_BORDER}`,
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'left',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: GRAY_TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                  Session Details
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: GRAY_TEXT, marginBottom: '3px' }}>Topic</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: NAVY }}>{selectedDateInfo.meeting.topic}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: GRAY_TEXT, marginBottom: '3px' }}>Date &amp; Time</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: NAVY }}>
                    {selectedDateInfo.dateLabel} at {selectedDateInfo.timeLabel}
                  </div>
                </div>
              </div>

              {joinUrl && (() => {
                // Generate calendar link
                const meeting = selectedDateInfo.meeting;
                const startDate = new Date(meeting.start_time);
                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

                // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
                const formatGoogleDate = (date: Date) => {
                  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                };

                const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.topic)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(`Join URL: ${joinUrl}`)}&location=${encodeURIComponent(joinUrl)}`;

                return (
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '11px',
                      background: BRAND_BLUE,
                      color: '#fff',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      marginTop: '16px',
                    }}
                  >
                    Add to Calendar
                  </a>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

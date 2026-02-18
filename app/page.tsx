'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ZoomMeeting {
  id: number;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password: string;
  agenda?: string;
}

interface WednesdaySlot {
  date: string;
  label: string;
  meeting: ZoomMeeting | null;
}

function getNextWednesdays(count: number): { date: string; label: string }[] {
  const results = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const daysUntilWed = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilWed);

  for (let i = 0; i < count; i++) {
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    results.push({ date: dateStr, label });
    d.setDate(d.getDate() + 7);
  }
  return results;
}

export default function Home() {
  const router = useRouter();
  const [slots, setSlots] = useState<WednesdaySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [agendas, setAgendas] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<number | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wednesdays = getNextWednesdays(3);
      const res = await fetch('/api/zoom/meetings');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load meetings');
        setSlots(wednesdays.map((w) => ({ ...w, meeting: null })));
        return;
      }
      const allMeetings: ZoomMeeting[] = await res.json();
      const newSlots: WednesdaySlot[] = wednesdays.map((w) => {
        const meeting = allMeetings.find((m) => {
          const etDate = new Date(m.start_time).toLocaleDateString('en-CA', {
            timeZone: 'America/New_York',
          });
          return etDate === w.date;
        });
        return { ...w, meeting: meeting || null };
      });
      setSlots(newSlots);

      const defaultTopics: Record<string, string> = {};
      const defaultDurations: Record<string, string> = {};
      wednesdays.forEach((w) => {
        defaultTopics[w.date] = 'Nekst Tips & Tricks Webinar';
        defaultDurations[w.date] = '60';
      });
      setTopics((prev) => ({ ...defaultTopics, ...prev }));
      setDurations((prev) => ({ ...defaultDurations, ...prev }));
    } catch (err) {
      setError('Failed to connect to Zoom API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleCreate = async (slot: WednesdaySlot) => {
    setCreating(slot.date);
    setError(null);
    try {
      const res = await fetch('/api/zoom/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topics[slot.date] || 'Nekst Tips & Tricks Webinar',
          date: slot.date,
          duration: parseInt(durations[slot.date] || '60'),
          agenda: agendas[slot.date] || '',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create meeting');
        return;
      }
      await loadMeetings();
    } catch (err) {
      setError('Failed to create meeting');
      console.error(err);
    } finally {
      setCreating(null);
    }
  };

  const handleDelete = async (meetingId: number) => {
    if (!confirm('Cancel this Zoom meeting? This cannot be undone.')) return;
    setDeleting(meetingId);
    setError(null);
    try {
      const res = await fetch(`/api/zoom/meetings/${meetingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to cancel meeting');
        return;
      }
      await loadMeetings();
    } catch (err) {
      setError('Failed to cancel meeting');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveEdit = async (meetingId: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/zoom/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: editTopic }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update meeting');
        return;
      }
      setEditingMeeting(null);
      await loadMeetings();
    } catch (err) {
      setError('Failed to update meeting');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Zoom Webinar Manager</h1>
            <p className="text-sm text-gray-400 mt-0.5">Upcoming Wednesday meetings at 2:00 PM ET</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMeetings}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors text-gray-400 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mb-8 p-4 bg-orange-950/40 border border-orange-800/50 rounded-lg">
          <p className="text-sm text-orange-300">
            <span className="font-medium">HubSpot Sync:</span> Install the{' '}
            <span className="font-mono text-orange-200">Zoom for HubSpot</span> app from the HubSpot
            App Marketplace to automatically sync these meetings into your CRM.
          </p>
        </div>

        {loading && slots.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-800 rounded w-1/2 mb-6" />
                <div className="h-8 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {slots.map((slot) => (
              <div
                key={slot.date}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${
                  slot.meeting ? 'bg-gray-900 border-blue-800/60' : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{slot.date}</div>
                  <div className="font-medium text-white text-sm leading-snug">
                    {slot.label.replace('Wednesday, ', '')}
                  </div>
                </div>

                {slot.meeting ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      <span className="text-xs text-green-400 font-medium">Meeting Created</span>
                    </div>

                    {editingMeeting === slot.meeting.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(slot.meeting!.id)}
                            disabled={saving}
                            className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingMeeting(null)}
                            className="flex-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-sm font-medium text-white cursor-pointer hover:text-blue-300 transition-colors"
                        onClick={() => {
                          setEditingMeeting(slot.meeting!.id);
                          setEditTopic(slot.meeting!.topic);
                        }}
                      >
                        {slot.meeting.topic}
                        <span className="ml-1 text-xs text-gray-500">(edit)</span>
                      </div>
                    )}

                    <div className="text-xs text-gray-400">
                      {formatTime(slot.meeting.start_time)} &middot; {slot.meeting.duration} min
                    </div>

                    <div className="bg-gray-800 rounded-md p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Meeting ID</span>
                        <button
                          onClick={() => copyToClipboard(String(slot.meeting!.id), `id-${slot.date}`)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {copied === `id-${slot.date}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="font-mono text-sm text-white">{slot.meeting.id}</div>

                      {slot.meeting.password && (
                        <>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">Passcode</span>
                            <button
                              onClick={() => copyToClipboard(slot.meeting!.password, `pw-${slot.date}`)}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {copied === `pw-${slot.date}` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <div className="font-mono text-sm text-white">{slot.meeting.password}</div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Join Link</span>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={slot.meeting.join_url}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-300 font-mono truncate focus:outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(slot.meeting!.join_url, `url-${slot.date}`)}
                          className="px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 rounded-md transition-colors whitespace-nowrap"
                        >
                          {copied === `url-${slot.date}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(slot.meeting!.id)}
                      disabled={deleting === slot.meeting.id}
                      className="mt-1 w-full py-2 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-md transition-colors disabled:opacity-50"
                    >
                      {deleting === slot.meeting.id ? 'Cancelling...' : 'Cancel Meeting'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
                      <span className="text-xs text-gray-500">No meeting scheduled</span>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Topic</label>
                      <input
                        type="text"
                        value={topics[slot.date] || ''}
                        onChange={(e) => setTopics((prev) => ({ ...prev, [slot.date]: e.target.value }))}
                        placeholder="Weekly Webinar"
                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Agenda (optional)</label>
                      <textarea
                        value={agendas[slot.date] || ''}
                        onChange={(e) => setAgendas((prev) => ({ ...prev, [slot.date]: e.target.value }))}
                        rows={2}
                        placeholder="What will be covered..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={durations[slot.date] || '60'}
                        onChange={(e) => setDurations((prev) => ({ ...prev, [slot.date]: e.target.value }))}
                        min={15}
                        max={480}
                        step={15}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => handleCreate(slot)}
                      disabled={creating === slot.date}
                      className="w-full py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    >
                      {creating === slot.date ? 'Creating...' : 'Create Meeting'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-10">
          Meetings are created in your Zoom account at 2:00 PM Eastern Time.
        </p>
      </div>
    </div>
  );
}

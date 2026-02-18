'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BRAND_BLUE = '#1565D8';
const NAVY = '#0D1F3C';
const GRAY_TEXT = '#64748B';
const INPUT_BORDER = '#CBD5E1';
const INPUT_FOCUS = '#1565D8';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Incorrect password. Please try again.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: '#fff',
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '14px',
    color: NAVY,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #C8E2F5 0%, #EEF5FB 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px 36px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="https://cdn.prod.website-files.com/6686ec1023f507e468f04ac6/668707e8a00a5ffa6b3600cb_nekst-logo-color.svg"
            alt="Nekst"
            style={{ height: '48px', display: 'inline-block', marginBottom: '20px' }}
          />
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, margin: 0 }}>
            Admin Login
          </h1>
          <p style={{ fontSize: '13px', color: GRAY_TEXT, marginTop: '6px' }}>
            Webinar Manager
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="Enter password"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
              onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                color: '#DC2626',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: loading ? '#94A3B8' : BRAND_BLUE,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

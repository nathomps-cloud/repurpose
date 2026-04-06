// pages/welcome.js
// User lands here after paying — before they get their access email

export default function Welcome() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#06090f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Mono', 'Courier New', monospace",
      padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{ textAlign: 'center', maxWidth: 480, animation: 'fadeUp 0.5s ease' }}>

        {/* Logo */}
        <div style={{
          width: 48, height: 48,
          background: '#f59e0b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif",
          fontWeight: 900, fontSize: 20, color: '#000',
          margin: '0 auto 28px',
        }}>R</div>

        {/* Checkmark */}
        <div style={{
          width: 64, height: 64,
          border: '2px solid #10b981',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: '#10b981',
          margin: '0 auto 28px',
        }}>✓</div>

        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 900, fontSize: 28,
          color: '#f1f5f9', marginBottom: 14,
          letterSpacing: '-0.02em',
        }}>
          Payment Confirmed
        </h1>

        <p style={{
          fontSize: 12, color: '#64748b',
          lineHeight: 1.8, marginBottom: 28,
        }}>
          Check your inbox — your access link is on its way.<br />
          It usually arrives within 30 seconds.
        </p>

        {/* Pulsing dot */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          fontSize: 10, color: '#334155',
          letterSpacing: '0.12em', marginBottom: 36,
          animation: 'pulse 2s infinite',
        }}>
          <span style={{ color: '#f59e0b' }}>●</span>
          SENDING YOUR ACCESS EMAIL...
        </div>

        {/* What to do next */}
        <div style={{
          background: '#0d1117',
          border: '1px solid #1a2332',
          borderLeft: '2px solid #f59e0b',
          padding: '18px 20px',
          textAlign: 'left',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', color: '#334155', marginBottom: 12 }}>
            WHAT HAPPENS NEXT
          </div>
          {[
            'Check your email inbox (and spam folder just in case)',
            'Click the access link in the email',
            'Bookmark your dashboard',
            'Paste your first piece of content and go',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#f59e0b', fontSize: 10, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: '#1e2d3d', letterSpacing: '0.08em' }}>
          No email after 2 minutes?{' '}
          <a href="mailto:support@repurpose.ai" style={{ color: '#334155', textDecoration: 'underline' }}>
            support@repurpose.ai
          </a>
        </p>

      </div>
    </div>
  );
}

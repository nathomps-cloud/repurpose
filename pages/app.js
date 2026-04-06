import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// ── CONSTANTS ──
const FORMATS = [
  { id: 'twitter',    label: 'X Thread',      icon: '𝕏',  color: '#e2e8f0', shortLabel: 'X' },
  { id: 'linkedin',   label: 'LinkedIn',       icon: 'in', color: '#0ea5e9', shortLabel: 'LI' },
  { id: 'newsletter', label: 'Newsletter',     icon: '✉',  color: '#f59e0b', shortLabel: 'NL' },
  { id: 'tiktok',     label: 'TikTok Script',  icon: '♪',  color: '#ec4899', shortLabel: 'TT' },
];

// ── VIEWS ──
const VIEWS = { APP: 'app', HISTORY: 'history', ACCOUNT: 'account' };

export default function AppPage() {
  const router = useRouter();

  // Auth state
  const [authState, setAuthState] = useState('loading'); // loading | checking | authed | denied
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  // App state
  const [view, setView] = useState(VIEWS.APP);
  const [input, setInput] = useState('');
  const [outputs, setOutputs] = useState({});
  const [loadingFormats, setLoadingFormats] = useState({});
  const [activeTab, setActiveTab] = useState('twitter');
  const [copied, setCopied] = useState('');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [cancelStatus, setCancelStatus] = useState('');
  const textareaRef = useRef(null);

  // ── AUTH ON MOUNT ──
  useEffect(() => {
    const token = router.query.token || sessionStorage.getItem('repurpose_token');
    if (!token && router.isReady) {
      setAuthState('denied');
      setAuthError('No access token found. Please use the link from your welcome email.');
      return;
    }
    if (token) {
      sessionStorage.setItem('repurpose_token', token);
      verifyToken(token);
    }
  }, [router.isReady, router.query.token]);

  // Load history from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('repurpose_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const verifyToken = async (token) => {
    setAuthState('checking');
    try {
      const res = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.valid) {
        setUser(data.user);
        setAuthState('authed');
      } else {
        setAuthState('denied');
        setAuthError(data.error || 'Access denied.');
      }
    } catch (err) {
      setAuthState('denied');
      setAuthError('Verification failed. Please try refreshing.');
    }
  };

  // ── GENERATE ──
  const generateFormat = async (formatId) => {
    if (!input.trim()) return;
    setLoadingFormats(p => ({ ...p, [formatId]: true }));
    try {
      const res = await fetch('/api/repurpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('repurpose_token')}`
        },
        body: JSON.stringify({ content: input, format: formatId })
      });
      const data = await res.json();
      setOutputs(p => ({ ...p, [formatId]: data.output || data.error }));
    } catch {
      setOutputs(p => ({ ...p, [formatId]: 'Generation failed. Try again.' }));
    }
    setLoadingFormats(p => ({ ...p, [formatId]: false }));
  };

  const generateAll = async () => {
    if (!input.trim()) return;
    setGenerating(true);
    setOutputs({});
    await Promise.all(FORMATS.map(f => generateFormat(f.id)));
    setGenerating(false);

    // Save to history
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      preview: input.slice(0, 80) + (input.length > 80 ? '...' : ''),
      wordCount: input.trim().split(/\s+/).length,
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    sessionStorage.setItem('repurpose_history', JSON.stringify(updated));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const copyAllOutputs = () => {
    const all = FORMATS.map(f => outputs[f.id] ? `── ${f.label.toUpperCase()} ──\n${outputs[f.id]}` : '').filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(all);
    setCopied('all');
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCancelSubscription = async () => {
    if (!user?.subscriptionId) return;
    setCancelStatus('loading');
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: user.subscriptionId, email: user.email })
      });
      const data = await res.json();
      setCancelStatus(data.success ? data.message : data.error);
    } catch {
      setCancelStatus('Failed to cancel. Contact support@repurpose.ai');
    }
  };

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const hasOutputs = Object.keys(outputs).length > 0;
  const activeFormat = FORMATS.find(f => f.id === activeTab);
  const completedCount = FORMATS.filter(f => outputs[f.id] && !loadingFormats[f.id]).length;

  // ── RENDER: LOADING ──
  if (authState === 'loading' || authState === 'checking') {
    return (
      <div style={styles.fullCenter}>
        <Head><title>REPURPOSE — Loading</title></Head>
        <div style={styles.loadingBox}>
          <div style={styles.logoMark}>R</div>
          <div style={styles.loadingText}>
            {authState === 'checking' ? 'Verifying access...' : 'Loading...'}
          </div>
          <div style={styles.loadingBar}>
            <div style={styles.loadingBarFill} />
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: DENIED ──
  if (authState === 'denied') {
    return (
      <div style={styles.fullCenter}>
        <Head><title>REPURPOSE — Access Required</title></Head>
        <div style={styles.deniedBox}>
          <div style={{ ...styles.logoMark, background: '#ef4444' }}>!</div>
          <div style={styles.deniedTitle}>Access Required</div>
          <div style={styles.deniedMsg}>{authError}</div>
          <a href="/" style={styles.deniedBtn}>← Get Access</a>
        </div>
      </div>
    );
  }

  // ── RENDER: AUTHED APP ──
  return (
    <div style={styles.root}>
      <Head>
        <title>REPURPOSE — Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
      </Head>
      <GlobalStyles />

      {/* ── SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoMark}>R</div>
          <div>
            <div style={styles.logoText}>REPURPOSE</div>
            <div style={styles.logoSub}>AI CONTENT ENGINE</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {[
            { id: VIEWS.APP, icon: '⚡', label: 'Repurpose' },
            { id: VIEWS.HISTORY, icon: '📋', label: 'History' },
            { id: VIEWS.ACCOUNT, icon: '◎', label: 'Account' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{ ...styles.navItem, ...(view === item.id ? styles.navItemActive : {}) }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.planBadge}>
            <span style={{ color: '#f59e0b' }}>●</span>
            {user?.plan === 'lifetime' ? 'LIFETIME' : 'MONTHLY'}
          </div>
          <div style={styles.userEmail}>{user?.email}</div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={styles.main}>

        {/* ── VIEW: APP ── */}
        {view === VIEWS.APP && (
          <div style={styles.viewWrap}>
            <div style={styles.viewHeader}>
              <div>
                <div style={styles.viewTitle}>Repurpose Content</div>
                <div style={styles.viewSub}>Paste anything. Get 4 platform-ready formats instantly.</div>
              </div>
              {hasOutputs && (
                <button style={styles.copyAllBtn} onClick={copyAllOutputs}>
                  {copied === 'all' ? '✓ All Copied' : '⎘ Copy All'}
                </button>
              )}
            </div>

            {/* Input */}
            <div style={styles.inputSection}>
              <div style={styles.inputHeader}>
                <span style={styles.inputLabel}>▸ SOURCE CONTENT</span>
                <span style={styles.wordCountBadge}>{wordCount > 0 ? `${wordCount} words` : 'paste content below'}</span>
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste your blog post, YouTube transcript, podcast notes, newsletter draft, or any long-form content here..."
                style={styles.textarea}
              />
              <div style={styles.inputActions}>
                {input && (
                  <button style={styles.clearBtn} onClick={() => { setInput(''); setOutputs({}); }}>
                    CLEAR
                  </button>
                )}
                <button
                  style={{ ...styles.genBtn, opacity: (!input.trim() || generating) ? 0.4 : 1 }}
                  onClick={generateAll}
                  disabled={!input.trim() || generating}
                >
                  {generating ? `GENERATING (${completedCount}/4)...` : 'GENERATE ALL FORMATS →'}
                </button>
              </div>
            </div>

            {/* Outputs */}
            {(hasOutputs || Object.values(loadingFormats).some(Boolean)) && (
              <div style={styles.outputSection}>
                {/* Tabs */}
                <div style={styles.tabs}>
                  {FORMATS.map(fmt => (
                    <button
                      key={fmt.id}
                      onClick={() => setActiveTab(fmt.id)}
                      style={{
                        ...styles.tab,
                        ...(activeTab === fmt.id ? styles.tabActive : {})
                      }}
                    >
                      <span style={{ marginRight: 6, fontFamily: 'system-ui' }}>{fmt.icon}</span>
                      {fmt.label}
                      {loadingFormats[fmt.id] && <span style={styles.tabDot} className="pulse">●</span>}
                      {outputs[fmt.id] && !loadingFormats[fmt.id] && <span style={{ ...styles.tabDot, color: '#10b981' }}>✓</span>}
                    </button>
                  ))}
                </div>

                {/* Output panel */}
                <div style={styles.outputPanel}>
                  {loadingFormats[activeTab] ? (
                    <div style={styles.outputLoading} className="pulse">
                      ▸ Generating {activeFormat?.label}...
                    </div>
                  ) : outputs[activeTab] ? (
                    <div>
                      <div style={styles.outputToolbar}>
                        <span style={styles.outputLabel}>
                          {activeFormat?.icon} {activeFormat?.label}
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={styles.regenBtn} onClick={() => generateFormat(activeTab)}>
                            ↻ REGEN
                          </button>
                          <button
                            style={{ ...styles.copyBtn, ...(copied === activeTab ? styles.copyBtnCopied : {}) }}
                            onClick={() => copyToClipboard(outputs[activeTab], activeTab)}
                          >
                            {copied === activeTab ? '✓ COPIED' : 'COPY'}
                          </button>
                        </div>
                      </div>
                      <pre style={styles.outputText}>{outputs[activeTab]}</pre>
                    </div>
                  ) : (
                    <div style={styles.outputEmpty}>
                      ▸ Generating... switch tabs to see each format as it completes.
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div style={styles.statusBar}>
                  {FORMATS.map(fmt => (
                    <div key={fmt.id} style={styles.statusItem}>
                      <div style={{
                        ...styles.statusDot,
                        background: loadingFormats[fmt.id] ? '#f59e0b' : outputs[fmt.id] ? '#10b981' : '#1e2d3d'
                      }} className={loadingFormats[fmt.id] ? 'pulse' : ''} />
                      <span style={styles.statusLabel}>{fmt.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state grid */}
            {!hasOutputs && !Object.values(loadingFormats).some(Boolean) && (
              <div style={styles.emptyGrid}>
                {FORMATS.map(fmt => (
                  <div key={fmt.id} style={styles.emptyCard}>
                    <div style={{ ...styles.emptyIcon, color: fmt.color }}>{fmt.icon}</div>
                    <div>
                      <div style={styles.emptyCardTitle}>{fmt.label.toUpperCase()}</div>
                      <div style={styles.emptyCardDesc}>
                        {fmt.id === 'twitter' && 'Hook-first thread, 6-10 tweets, strong CTA'}
                        {fmt.id === 'linkedin' && 'Bold opener, punchy paragraphs, ends with a question'}
                        {fmt.id === 'newsletter' && 'Subject + preview text + structured body'}
                        {fmt.id === 'tiktok' && 'Spoken script with hook in first 3 seconds'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: HISTORY ── */}
        {view === VIEWS.HISTORY && (
          <div style={styles.viewWrap}>
            <div style={styles.viewHeader}>
              <div>
                <div style={styles.viewTitle}>History</div>
                <div style={styles.viewSub}>Your last {history.length} repurposed pieces this session.</div>
              </div>
              {history.length > 0 && (
                <button style={styles.clearBtn} onClick={() => { setHistory([]); sessionStorage.removeItem('repurpose_history'); }}>
                  CLEAR ALL
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyStateIcon}>📋</div>
                <div style={styles.emptyStateText}>No history yet. Repurpose some content first.</div>
                <button style={styles.genBtn} onClick={() => setView(VIEWS.APP)}>Start Repurposing →</button>
              </div>
            ) : (
              <div style={styles.historyList}>
                {history.map((item, i) => (
                  <div key={item.id} style={styles.historyItem}>
                    <div style={styles.historyNum}>#{String(i + 1).padStart(2, '0')}</div>
                    <div style={styles.historyContent}>
                      <div style={styles.historyPreview}>{item.preview}</div>
                      <div style={styles.historyMeta}>{item.date} · {item.wordCount} words</div>
                    </div>
                    <div style={styles.historyBadges}>
                      {FORMATS.map(f => (
                        <span key={f.id} style={styles.historyBadge}>{f.shortLabel}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: ACCOUNT ── */}
        {view === VIEWS.ACCOUNT && (
          <div style={styles.viewWrap}>
            <div style={styles.viewHeader}>
              <div>
                <div style={styles.viewTitle}>Account</div>
                <div style={styles.viewSub}>Manage your plan and access.</div>
              </div>
            </div>

            <div style={styles.accountGrid}>
              {/* Plan card */}
              <div style={styles.accountCard}>
                <div style={styles.accountCardLabel}>YOUR PLAN</div>
                <div style={styles.planName}>
                  {user?.plan === 'lifetime' ? '⚡ Lifetime Access' : '📅 Monthly Plan'}
                </div>
                <div style={styles.planDetail}>
                  {user?.plan === 'lifetime'
                    ? 'Never expires. Full access forever.'
                    : 'Renews monthly. Cancel anytime below.'}
                </div>
                <div style={styles.planFeatures}>
                  {['Unlimited generations', 'All 4 output formats', 'One-click copy', 'Priority support'].map(f => (
                    <div key={f} style={styles.planFeatureItem}>
                      <span style={{ color: '#10b981' }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage card */}
              <div style={styles.accountCard}>
                <div style={styles.accountCardLabel}>USAGE THIS SESSION</div>
                <div style={styles.usageStat}>{history.length}</div>
                <div style={styles.usageLabel}>pieces repurposed</div>
                <div style={styles.usageBar}>
                  <div style={{
                    ...styles.usageBarFill,
                    width: `${Math.min((history.length / 20) * 100, 100)}%`
                  }} />
                </div>
                <div style={styles.usageNote}>
                  {user?.plan === 'lifetime' ? 'Unlimited · Lifetime plan' : `${history.length} / 500 this month`}
                </div>
              </div>

              {/* Profile card */}
              <div style={styles.accountCard}>
                <div style={styles.accountCardLabel}>PROFILE</div>
                <div style={styles.profileRow}>
                  <span style={styles.profileKey}>Email</span>
                  <span style={styles.profileVal}>{user?.email}</span>
                </div>
                <div style={styles.profileRow}>
                  <span style={styles.profileKey}>Member since</span>
                  <span style={styles.profileVal}>
                    {user?.memberSince ? new Date(user.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Today'}
                  </span>
                </div>
                <div style={styles.profileRow}>
                  <span style={styles.profileKey}>Plan</span>
                  <span style={{ ...styles.profileVal, color: '#f59e0b', textTransform: 'uppercase' }}>
                    {user?.plan}
                  </span>
                </div>
              </div>

              {/* Actions card */}
              <div style={styles.accountCard}>
                <div style={styles.accountCardLabel}>ACTIONS</div>

                <button
                  style={styles.accountBtn}
                  onClick={() => { sessionStorage.clear(); router.push('/'); }}
                >
                  ← Sign Out
                </button>

                <a href="mailto:support@repurpose.ai" style={styles.accountBtnLink}>
                  ✉ Contact Support
                </a>

                {user?.plan === 'monthly' && (
                  <div style={styles.cancelSection}>
                    <div style={styles.cancelDivider} />
                    {!cancelStatus ? (
                      <button
                        style={styles.cancelBtn}
                        onClick={() => {
                          if (confirm('Cancel your subscription? You keep access until the end of your billing period.')) {
                            handleCancelSubscription();
                          }
                        }}
                      >
                        Cancel Subscription
                      </button>
                    ) : (
                      <div style={{
                        fontSize: 11,
                        color: cancelStatus === 'loading' ? '#f59e0b' : '#10b981',
                        lineHeight: 1.6
                      }}>
                        {cancelStatus === 'loading' ? 'Cancelling...' : cancelStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── STYLES ──
const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#06090f',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    color: '#e2e8f0',
  },
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#080c12',
    borderRight: '1px solid #1a2332',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 24px',
    borderBottom: '1px solid #1a2332',
    marginBottom: 16,
  },
  logoMark: {
    width: 32, height: 32,
    background: '#f59e0b',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 900, fontSize: 14, color: '#000',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800, fontSize: 13,
    letterSpacing: '0.06em', color: '#f1f5f9',
  },
  logoSub: {
    fontSize: 8, color: '#334155',
    letterSpacing: '0.14em', marginTop: 1,
  },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    background: 'transparent', border: 'none',
    color: '#475569', cursor: 'pointer',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11, letterSpacing: '0.06em',
    textAlign: 'left', width: '100%',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: '#111827',
    color: '#f59e0b',
    borderLeft: '2px solid #f59e0b',
  },
  navIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #1a2332',
    marginTop: 'auto',
  },
  planBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 9, letterSpacing: '0.16em',
    color: '#475569', marginBottom: 4,
  },
  userEmail: { fontSize: 10, color: '#334155', letterSpacing: '0.04em' },
  main: { flex: 1, overflow: 'auto', minWidth: 0 },
  viewWrap: { padding: '32px 36px', maxWidth: 900, margin: '0 auto' },
  viewHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 28,
    flexWrap: 'wrap', gap: 12,
  },
  viewTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800, fontSize: 22,
    color: '#f1f5f9', letterSpacing: '-0.01em',
  },
  viewSub: { fontSize: 11, color: '#475569', marginTop: 4, letterSpacing: '0.04em' },
  inputSection: { marginBottom: 24 },
  inputHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  inputLabel: { fontSize: 9, letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase' },
  wordCountBadge: { fontSize: 9, color: '#334155', letterSpacing: '0.08em' },
  textarea: {
    width: '100%', height: 180,
    background: '#0d1117',
    border: '1px solid #1a2332',
    color: '#cbd5e1', padding: '14px 16px',
    fontSize: 12, lineHeight: 1.75,
    resize: 'vertical',
    fontFamily: "'DM Mono', monospace",
    outline: 'none',
  },
  inputActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  clearBtn: {
    background: 'transparent', border: '1px solid #1a2332',
    color: '#475569', padding: '8px 14px',
    fontFamily: "'DM Mono', monospace", fontSize: 9,
    letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s',
  },
  genBtn: {
    background: '#f59e0b', border: 'none',
    color: '#000', padding: '12px 28px',
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 11, letterSpacing: '0.06em',
    textTransform: 'uppercase', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  copyAllBtn: {
    background: 'transparent', border: '1px solid #1a2332',
    color: '#64748b', padding: '8px 16px',
    fontFamily: "'DM Mono', monospace", fontSize: 10,
    letterSpacing: '0.08em', cursor: 'pointer',
  },
  outputSection: { marginTop: 4 },
  tabs: { display: 'flex', gap: 0, overflowX: 'auto' },
  tab: {
    background: 'transparent', border: '1px solid #1a2332',
    borderBottom: 'none', color: '#475569',
    padding: '8px 16px', cursor: 'pointer',
    fontFamily: "'DM Mono', monospace", fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: 0,
  },
  tabActive: { background: '#0d1117', borderColor: '#f59e0b', color: '#f59e0b' },
  tabDot: { marginLeft: 6, fontSize: 9 },
  outputPanel: {
    background: '#0d1117', border: '1px solid #1a2332',
    borderTop: '1px solid #f59e0b', padding: '22px',
    minHeight: 240,
  },
  outputLoading: { color: '#334155', fontSize: 11, letterSpacing: '0.08em' },
  outputEmpty: { color: '#1e2d3d', fontSize: 11, letterSpacing: '0.06em' },
  outputToolbar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  outputLabel: { fontSize: 9, color: '#475569', letterSpacing: '0.14em', textTransform: 'uppercase' },
  regenBtn: {
    background: 'transparent', border: '1px solid #1a2332',
    color: '#475569', padding: '5px 10px',
    fontFamily: "'DM Mono', monospace", fontSize: 9,
    letterSpacing: '0.06em', cursor: 'pointer',
  },
  copyBtn: {
    background: 'transparent', border: '1px solid #1a2332',
    color: '#475569', padding: '5px 12px',
    fontFamily: "'DM Mono', monospace", fontSize: 9,
    letterSpacing: '0.06em', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  copyBtnCopied: { borderColor: '#10b981', color: '#10b981' },
  outputText: {
    fontSize: 12, lineHeight: 1.85, color: '#cbd5e1',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    fontFamily: "'DM Mono', monospace",
  },
  statusBar: {
    display: 'flex', gap: 16, marginTop: 10,
    paddingTop: 10, borderTop: '1px solid #0d1117',
  },
  statusItem: { display: 'flex', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: '50%' },
  statusLabel: { fontSize: 8, color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase' },
  emptyGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 1, background: '#1a2332', marginTop: 8,
  },
  emptyCard: {
    background: '#06090f', padding: '24px',
    display: 'flex', gap: 14, alignItems: 'flex-start',
  },
  emptyIcon: { fontSize: 20, flexShrink: 0, fontFamily: 'system-ui', marginTop: 2 },
  emptyCardTitle: {
    fontFamily: "'Syne', sans-serif", fontWeight: 700,
    fontSize: 11, letterSpacing: '0.08em', color: '#64748b', marginBottom: 4,
  },
  emptyCardDesc: { fontSize: 10, color: '#2d3f55', lineHeight: 1.6 },
  emptyState: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 14, padding: '80px 20px', textAlign: 'center',
  },
  emptyStateIcon: { fontSize: 32, opacity: 0.3 },
  emptyStateText: { fontSize: 11, color: '#334155', letterSpacing: '0.06em' },
  historyList: { display: 'flex', flexDirection: 'column', gap: 1, background: '#1a2332' },
  historyItem: {
    background: '#06090f', padding: '18px 20px',
    display: 'flex', alignItems: 'center', gap: 16,
  },
  historyNum: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 11, color: '#1e2d3d', letterSpacing: '0.04em',
    flexShrink: 0, width: 30,
  },
  historyContent: { flex: 1, minWidth: 0 },
  historyPreview: {
    fontSize: 11, color: '#64748b',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    letterSpacing: '0.02em',
  },
  historyMeta: { fontSize: 9, color: '#1e2d3d', marginTop: 4, letterSpacing: '0.1em' },
  historyBadges: { display: 'flex', gap: 4, flexShrink: 0 },
  historyBadge: {
    background: '#0d1117', border: '1px solid #1a2332',
    fontSize: 8, color: '#334155',
    padding: '2px 6px', letterSpacing: '0.06em',
  },
  accountGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 1, background: '#1a2332',
  },
  accountCard: {
    background: '#06090f', padding: '28px',
  },
  accountCardLabel: {
    fontSize: 9, letterSpacing: '0.18em', color: '#334155',
    textTransform: 'uppercase', marginBottom: 16,
  },
  planName: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 18, color: '#f1f5f9', marginBottom: 6,
  },
  planDetail: { fontSize: 11, color: '#475569', lineHeight: 1.7, marginBottom: 20 },
  planFeatures: { display: 'flex', flexDirection: 'column', gap: 8 },
  planFeatureItem: { fontSize: 10, color: '#475569', display: 'flex', gap: 8 },
  usageStat: {
    fontFamily: "'Syne', sans-serif", fontWeight: 900,
    fontSize: 48, color: '#f1f5f9', lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  usageLabel: { fontSize: 10, color: '#334155', margin: '4px 0 16px', letterSpacing: '0.08em' },
  usageBar: { height: 3, background: '#1a2332', marginBottom: 8 },
  usageBarFill: { height: '100%', background: '#f59e0b', transition: 'width 0.3s' },
  usageNote: { fontSize: 9, color: '#2d3f55', letterSpacing: '0.1em' },
  profileRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #0d1117',
  },
  profileKey: { fontSize: 10, color: '#334155', letterSpacing: '0.08em' },
  profileVal: { fontSize: 10, color: '#64748b', letterSpacing: '0.04em', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' },
  accountBtn: {
    display: 'block', width: '100%',
    padding: '11px 14px', marginBottom: 8,
    background: 'transparent', border: '1px solid #1a2332',
    color: '#475569', fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: '0.08em',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
  },
  accountBtnLink: {
    display: 'block', width: '100%',
    padding: '11px 14px', marginBottom: 8,
    background: 'transparent', border: '1px solid #1a2332',
    color: '#475569', fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: '0.08em',
    cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s',
  },
  cancelSection: { marginTop: 8 },
  cancelDivider: { height: 1, background: '#1a2332', marginBottom: 14 },
  cancelBtn: {
    background: 'transparent', border: 'none',
    color: '#ef4444', fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: '0.06em',
    cursor: 'pointer', padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  fullCenter: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#06090f',
    fontFamily: "'DM Mono', monospace",
  },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 11, color: '#334155', letterSpacing: '0.12em' },
  loadingBar: { width: 160, height: 2, background: '#1a2332', overflow: 'hidden' },
  loadingBarFill: {
    height: '100%', background: '#f59e0b',
    animation: 'loadSlide 1.2s ease infinite',
  },
  deniedBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16, textAlign: 'center',
    padding: 40, maxWidth: 360,
  },
  deniedTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800, fontSize: 20, color: '#f1f5f9',
  },
  deniedMsg: { fontSize: 12, color: '#64748b', lineHeight: 1.7 },
  deniedBtn: {
    display: 'inline-block', marginTop: 8,
    padding: '12px 24px',
    background: '#f59e0b', color: '#000',
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 11, letterSpacing: '0.06em',
    textDecoration: 'none', textTransform: 'uppercase',
  },
};

// Global styles injected once
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: #0d1117; }
      ::-webkit-scrollbar-thumb { background: #1a2332; }
      .pulse { animation: pulseAnim 1.5s infinite; }
      @keyframes pulseAnim { 0%,100%{opacity:1} 50%{opacity:0.3} }
      @keyframes loadSlide { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      button:hover { opacity: 0.85; }
    `}</style>
  );
}

import React, { useEffect, useMemo, useState } from 'react'
import './App.css'
import LoginPage from './LoginPage'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const SPORTS = ['All', 'Cricket']

const authDefault = { name: '', email: '', password: '' }
const moneyDefault = { amount: '1000', upiRef: '', phone: '', screenshot: null }
const bidDefault = { matchId: '', selection: 'TEAM_A', amount: '100' }
const matchDefault = { teamA: '', teamB: '', matchStartTime: '', biddingDeadline: '' }

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

async function apiRequest(path, { method = 'GET', token = '', body, isFormData = false } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed')
  return data
}

function AppBidding() {
  const [token, setToken] = useState(localStorage.getItem('sm_token') || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sm_user')
    return raw ? JSON.parse(raw) : null
  })

  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(authDefault)
  const [authError, setAuthError] = useState('')

  const [activeView, setActiveView] = useState('Market')
  const [selectedSport, setSelectedSport] = useState('All')
  const [marketFilter, setMarketFilter] = useState('All')

  const [matches, setMatches] = useState([])
  const [bids, setBids] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [requests, setRequests] = useState([])
  const [adminRequests, setAdminRequests] = useState([])
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])

  const [moneyForm, setMoneyForm] = useState(moneyDefault)
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [moneyMessage, setMoneyMessage] = useState('')

  const [bidForm, setBidForm] = useState(bidDefault)
  const [bidMessage, setBidMessage] = useState('')
  const [tradePanelOpen, setTradePanelOpen] = useState(false)

  const [matchForm, setMatchForm] = useState(matchDefault)
  const [matchMessage, setMatchMessage] = useState('')
  const [resultForm, setResultForm] = useState({ matchId: '', result: 'TEAM_A' })
  const [editingMatchId, setEditingMatchId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [nowTs, setNowTs] = useState(Date.now())
  const [fullscreenImage, setFullscreenImage] = useState(null)

  const isAdmin = user?.role === 'admin'
  const isSuperAdmin = user?.role === 'superadmin'
  const hasAdminAccess = isAdmin || isSuperAdmin

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const sportOK = selectedSport === 'All' || match.sport === selectedSport
      const statusOK = marketFilter === 'All' || match.status === marketFilter
      return sportOK && statusOK
    })
  }, [matches, selectedSport, marketFilter])

  const activeAuction = useMemo(() => {
    const now = nowTs
    return matches
      .filter((match) => match.status === 'Upcoming' && new Date(match.biddingDeadline).getTime() > now)
      .sort((a, b) => new Date(a.biddingDeadline).getTime() - new Date(b.biddingDeadline).getTime())[0]
  }, [matches, nowTs])

  const secondsLeft = useMemo(() => {
    if (!activeAuction) return 0
    const remaining = Math.floor((new Date(activeAuction.biddingDeadline).getTime() - nowTs) / 1000)
    return remaining > 0 ? remaining : 0
  }, [activeAuction, nowTs])

  const pendingCommitment = useMemo(() => {
    return bids
      .filter((bid) => String(bid.status || '').toUpperCase() === 'PENDING')
      .reduce((sum, bid) => sum + Number(bid.amount || 0), 0)
  }, [bids])

  const totalBudgetTracked = Number(user?.wallet || 0) + pendingCommitment
  const committedPercent = totalBudgetTracked > 0 ? Math.min(100, (pendingCommitment / totalBudgetTracked) * 100) : 0

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  async function refreshData(activeToken = token, activeUser = user) {
    if (!activeToken || !activeUser) return

    setLoading(true)
    setPageError('')

    try {
      const baseCalls = await Promise.all([
        apiRequest('/api/matches', { token: activeToken }),
        apiRequest('/api/wallet/me', { token: activeToken }),
        apiRequest('/api/topup-requests/me', { token: activeToken }),
        apiRequest('/api/bids/me', { token: activeToken }),
        apiRequest('/api/leaderboard', { token: activeToken }),
      ])

      setMatches(baseCalls[0])
      setUser((prev) => {
        const updated = { ...prev, wallet: baseCalls[1].wallet }
        localStorage.setItem('sm_user', JSON.stringify(updated))
        return updated
      })
      setRequests(baseCalls[2])
      setBids(baseCalls[3])
      setLeaderboard(baseCalls[4])

      if (activeUser.role === 'admin') {
        const adminCalls = await Promise.all([
          apiRequest('/api/admin/topup-requests', { token: activeToken }),
          apiRequest('/api/admin/users', { token: activeToken }),
          apiRequest('/api/admin/matches', { token: activeToken }),
          apiRequest('/api/admin/transactions', { token: activeToken }),
        ])
        setAdminRequests(adminCalls[0])
        setUsers(adminCalls[1])
        setMatches(adminCalls[2])
        setTransactions(adminCalls[3])
      }
    } catch (error) {
      setPageError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const logout = () => {
    localStorage.removeItem('sm_token')
    localStorage.removeItem('sm_user')
    setToken('')
    setUser(null)
  }

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm

      const data = await apiRequest(endpoint, { method: 'POST', body: payload })
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('sm_token', data.token)
      localStorage.setItem('sm_user', JSON.stringify(data.user))
      setActiveView(data.user.role === 'admin' ? 'Admin' : 'Market')
      setAuthForm(authDefault)
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const submitTopup = async (event) => {
    event.preventDefault()
    if (!moneyForm.screenshot) {
      setMoneyMessage('Screenshot is required')
      return
    }

    const formData = new FormData()
    formData.append('amount', moneyForm.amount)
    formData.append('upiRef', moneyForm.upiRef)
    formData.append('phone', moneyForm.phone)
    formData.append('screenshot', moneyForm.screenshot)

    try {
      await apiRequest('/api/wallet/topup-request', {
        method: 'POST',
        token,
        body: formData,
        isFormData: true,
      })
      setMoneyForm(moneyDefault)
      setMoneyMessage('Request sent for admin approval')
      setAddMoneyOpen(false)
      await refreshData()
    } catch (error) {
      setMoneyMessage(error.message)
    }
  }

  const placeBid = async (event) => {
    event.preventDefault()
    setBidMessage('')

    try {
      const data = await apiRequest('/api/bids', {
        method: 'POST',
        token,
        body: {
          ...bidForm,
          amount: Number(bidForm.amount),
        },
      })

      setUser((prev) => {
        const updated = { ...prev, wallet: data.wallet }
        localStorage.setItem('sm_user', JSON.stringify(updated))
        return updated
      })

      setBidMessage('Bid placed successfully')
      setBidForm((prev) => ({ ...prev, amount: '100' }))
      await refreshData()
    } catch (error) {
      setBidMessage(error.message)
    }
  }

  const createMatch = async (event) => {
    event.preventDefault()
    setMatchMessage('')
    try {
      if (editingMatchId) {
        await apiRequest(`/api/admin/matches/${editingMatchId}`, {
          method: 'PUT',
          token,
          body: matchForm,
        })
        setMatchMessage('Match updated successfully')
        setEditingMatchId(null)
      } else {
        await apiRequest('/api/admin/matches', {
          method: 'POST',
          token,
          body: matchForm,
        })
        setMatchMessage('Match created')
      }
      setMatchForm(matchDefault)
      await refreshData()
    } catch (error) {
      setMatchMessage(error.message)
    }
  }

  const deleteMatch = async (matchId) => {
    if (!confirm('Are you sure you want to delete this match? All bids will be refunded.')) return
    
    setMatchMessage('')
    try {
      await apiRequest(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        token,
      })
      setMatchMessage('Match deleted successfully')
      await refreshData()
    } catch (error) {
      setMatchMessage(error.message)
    }
  }

  const startEditMatch = (match) => {
    setEditingMatchId(match.id)
    setMatchForm({
      teamA: match.teamA,
      teamB: match.teamB,
      matchStartTime: new Date(match.matchStartTime).toISOString().slice(0, 16),
      biddingDeadline: new Date(match.biddingDeadline).toISOString().slice(0, 16),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditMatch = () => {
    setEditingMatchId(null)
    setMatchForm(matchDefault)
    setMatchMessage('')
  }

  const declareResult = async (event) => {
    event.preventDefault()
    setMatchMessage('')

    try {
      await apiRequest(`/api/admin/matches/${resultForm.matchId}/result`, {
        method: 'PATCH',
        token,
        body: { result: resultForm.result },
      })
      setMatchMessage('Result declared and payouts processed')
      await refreshData()
    } catch (error) {
      setMatchMessage(error.message)
    }
  }

  const approveTopup = async (id) => {
    await apiRequest(`/api/admin/topup-requests/${id}/approve`, { method: 'PATCH', token })
    refreshData()
  }

  const rejectTopup = async (id) => {
    await apiRequest(`/api/admin/topup-requests/${id}/reject`, { method: 'PATCH', token })
    refreshData()
  }

  if (!token || !user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">NEW BIDDING ERA</p>
          <h1>{authMode === 'login' ? 'Login' : 'Register'}</h1>

          <form onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  value={authForm.name}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </>
            )}

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />

            {authError && <p className="error-text">{authError}</p>}
            <button className="confirm" type="submit">
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          <button className="link-button" onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}>
            {authMode === 'login' ? 'Create account' : 'Back to login'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="header-content">
          <img src="https://documents.iplt20.com//ipl/assets/images/ipl-logo-new-old.png" alt="IPL" className="ipl-poster" />
          <div className="header-text">
            <h1>New Bidding Era</h1>
            <p className="muted">
              {user.name} ({user.role}) · Wallet: <strong>{formatCurrency(user.wallet)}</strong>
            </p>
          </div>
        </div>

        <div className="header-actions">
          <div className="secure-badge">🔒 Secure Wallet</div>
          <div className={`bidding-clock-card ${secondsLeft > 0 && secondsLeft <= 30 ? 'urgent' : ''}`}>
            <p className="clock-label">Bidding Clock</p>
            <p className="clock-value">{activeAuction ? formatCountdown(secondsLeft) : '--:--'}</p>
            <p className="clock-match">{activeAuction ? `${activeAuction.teamA} vs ${activeAuction.teamB}` : 'No active window'}</p>
          </div>
          <button className="chip" onClick={logout}>Logout</button>
        </div>
      </header>

      {pageError && <p className="error-text">{pageError}</p>}
      {loading && <p className="muted">Refreshing data...</p>}

      <section className="view-switcher">
        {['Market', 'Bids', 'Leaderboard', 'Wallet', ...(hasAdminAccess ? ['Admin'] : [])].map((view) => (
          <button key={view} className={activeView === view ? 'chip active' : 'chip'} onClick={() => setActiveView(view)}>
            {view}
          </button>
        ))}
      </section>

      {activeView === 'Market' && (
        <>
          <section className="filters-panel">
            <div className="sport-tabs">
              {SPORTS.map((sport) => (
                <button key={sport} className={selectedSport === sport ? 'tab active' : 'tab'} onClick={() => setSelectedSport(sport)}>
                  {sport}
                </button>
              ))}
            </div>
            <div className="status-filter">
              {['All', 'Upcoming', 'Locked', 'Completed'].map((status) => (
                <button key={status} className={marketFilter === status ? 'chip active' : 'chip'} onClick={() => setMarketFilter(status)}>
                  {status}
                </button>
              ))}
            </div>
          </section>

          {!tradePanelOpen && (
            <button className="place-bid-trigger" onClick={() => setTradePanelOpen(true)}>
              📊 Place Bid
            </button>
          )}

          <main className="content-grid single-column">
            <section className="matches-list">
              {filteredMatches.map((match) => (
                <article className="match-card" key={match.id}>
                  <div className="match-head">
                    <span className="sport">{match.sport}</span>
                    <span className={match.status === 'Upcoming' ? 'status live' : 'status'}>{match.status}</span>
                  </div>
                  <h3>{match.teamA} <span>vs</span> {match.teamB}</h3>
                  <p className="muted">Start: {new Date(match.matchStartTime).toLocaleString()}</p>
                  <p className="muted">Bidding deadline: {new Date(match.biddingDeadline).toLocaleString()}</p>
                  <p className="score">{match.result ? `Result: ${match.result}` : 'Result pending'}</p>
                  <button
                    className="btn bid"
                    disabled={match.status !== 'Upcoming'}
                    onClick={() => {
                      setBidForm({ matchId: match.id, selection: 'TEAM_A', amount: '100' })
                      setTradePanelOpen(true)
                    }}
                  >
                    {match.status === 'Upcoming' ? 'Bid on this match' : 'Bidding closed'}
                  </button>
                </article>
              ))}
            </section>
          </main>

          {tradePanelOpen && (
            <>
              <div className="overlay" onClick={() => setTradePanelOpen(false)}></div>
              <aside className="trade-panel trade-panel-overlay">
                <div className="trade-panel-header">
                  <h2>Place Bid</h2>
                  <button type="button" className="close-panel" onClick={() => setTradePanelOpen(false)}>✕</button>
                </div>
              <form onSubmit={placeBid}>
                <label htmlFor="bidMatch">Match</label>
                <select
                  id="bidMatch"
                  value={bidForm.matchId}
                  onChange={(event) => setBidForm((prev) => ({ ...prev, matchId: event.target.value }))}
                  required
                >
                  <option value="">Select match</option>
                  {matches.filter((item) => item.status === 'Upcoming').map((item) => (
                    <option key={item.id} value={item.id}>{item.teamA} vs {item.teamB}</option>
                  ))}
                </select>

                <label htmlFor="selection">Pick team</label>
                <select
                  id="selection"
                  value={bidForm.selection}
                  onChange={(event) => setBidForm((prev) => ({ ...prev, selection: event.target.value }))}
                >
                  <option value="">Select team</option>
                  {matches
                    .filter((item) => item.id === bidForm.matchId)
                    .map((item) => (
                      <React.Fragment key={item.id}>
                        <option value="TEAM_A">{item.teamA} (Team A)</option>
                        <option value="TEAM_B">{item.teamB} (Team B)</option>
                      </React.Fragment>
                    ))}
                </select>

                <label htmlFor="amount">Bid amount</label>
                <input
                  id="amount"
                  type="number"
                  min="1"
                  value={bidForm.amount}
                  onChange={(event) => setBidForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />

                <button className="confirm" type="submit">Place Bid</button>
              </form>
              {bidMessage && <p className="muted">{bidMessage}</p>}
              </aside>
            </>
          )}
        </>
      )}

      {activeView === 'Bids' && (
        <section className="wallet-card">
          <h2>Your Bid History</h2>
          <div className="requests-list">
            {bids.map((bid) => (
              <div key={bid.id} className="request-row">
                <div>
                  <strong>{bid.teams?.[0]} vs {bid.teams?.[1]}</strong>
                  <p className="small-text">Pick: {bid.selection} · Bid: {formatCurrency(bid.amount)}</p>
                </div>
                <div>
                  <span className={`request-status ${bid.status === 'WON' ? 'approved' : bid.status === 'LOST' ? 'rejected' : 'pending'}`}>{bid.status}</span>
                  <p className="small-text muted">Payout: {formatCurrency(bid.payoutAmount)}</p>
                </div>
              </div>
            ))}
            {bids.length === 0 && <p className="muted">No bids yet.</p>}
          </div>
        </section>
      )}

      {activeView === 'Leaderboard' && (
        <section className="wallet-card">
          <h2>Leaderboard (by wallet)</h2>
          <div className="requests-list">
            {leaderboard.map((item) => (
              <div key={item.id} className="request-row">
                <strong>#{item.rank} {item.name}</strong>
                <strong>{formatCurrency(item.wallet)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === 'Wallet' && (
        <section className="wallet-grid">
          <article className="wallet-card">
            <h2>Wallet Topup</h2>
            <p className="wallet-amount">{formatCurrency(user.wallet)}</p>
            <div className="budget-overview">
              <div className="budget-meta-row">
                <span>Committed Bids</span>
                <strong>{formatCurrency(pendingCommitment)}</strong>
              </div>
              <div className="budget-meta-row">
                <span>Available Balance</span>
                <strong>{formatCurrency(user.wallet)}</strong>
              </div>
              <div className="budget-progress" role="progressbar" aria-valuenow={Math.round(committedPercent)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${committedPercent}%` }}></span>
              </div>
              <p className="small-text muted">Available vs committed bids</p>
            </div>
            <button className="confirm" onClick={() => setAddMoneyOpen((prev) => !prev)}>{addMoneyOpen ? 'Close' : 'Add Money'}</button>

            {addMoneyOpen && (
              <div className="add-money-panel">
                <div className="qr-section">
                  <h3>Scan QR to pay</h3>
                  <div className="qr-box"><span>QR</span></div>
                  <p>UPI ID: <strong>sportsmarket@upi</strong></p>
                </div>

                <form className="proof-form" onSubmit={submitTopup}>
                  <label htmlFor="topAmt">Amount</label>
                  <input id="topAmt" value={moneyForm.amount} onChange={(event) => setMoneyForm((prev) => ({ ...prev, amount: event.target.value }))} required />

                  <label htmlFor="topRef">UPI Ref</label>
                  <input id="topRef" value={moneyForm.upiRef} onChange={(event) => setMoneyForm((prev) => ({ ...prev, upiRef: event.target.value }))} required />

                  <label htmlFor="topPhone">Phone</label>
                  <input id="topPhone" value={moneyForm.phone} onChange={(event) => setMoneyForm((prev) => ({ ...prev, phone: event.target.value }))} required />

                  <label htmlFor="topProof">Screenshot</label>
                  <input id="topProof" type="file" accept="image/*" onChange={(event) => setMoneyForm((prev) => ({ ...prev, screenshot: event.target.files?.[0] || null }))} required />

                  <button className="confirm" type="submit">Submit</button>
                </form>
              </div>
            )}

            {moneyMessage && <p className="muted">{moneyMessage}</p>}
          </article>

          <article className="wallet-card">
            <h2>Your Topup Requests</h2>
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request.id} className="request-row">
                  <div>
                    <strong>{request.id}</strong>
                    <p className="small-text">{formatCurrency(request.amount)}</p>
                  </div>
                  <span className={`request-status ${request.status === 'Approved' ? 'approved' : request.status === 'Rejected' ? 'rejected' : 'pending'}`}>{request.status}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {activeView === 'Admin' && hasAdminAccess && (
        <section className="admin-grid">
          <article className="wallet-card">
            <h2>{editingMatchId ? 'Edit Match' : 'Create Match'}</h2>
            <form onSubmit={createMatch}>
              <label htmlFor="teamA">Team A</label>
              <input id="teamA" value={matchForm.teamA} onChange={(event) => setMatchForm((prev) => ({ ...prev, teamA: event.target.value }))} required />
              <label htmlFor="teamB">Team B</label>
              <input id="teamB" value={matchForm.teamB} onChange={(event) => setMatchForm((prev) => ({ ...prev, teamB: event.target.value }))} required />
              <label htmlFor="start">Match start time</label>
              <input id="start" type="datetime-local" value={matchForm.matchStartTime} onChange={(event) => setMatchForm((prev) => ({ ...prev, matchStartTime: event.target.value }))} required />
              <label htmlFor="deadline">Bidding deadline</label>
              <input id="deadline" type="datetime-local" value={matchForm.biddingDeadline} onChange={(event) => setMatchForm((prev) => ({ ...prev, biddingDeadline: event.target.value }))} required />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="confirm" type="submit">{editingMatchId ? 'Update Match' : 'Create Match'}</button>
                {editingMatchId && (
                  <button className="btn bid" type="button" onClick={cancelEditMatch}>Cancel</button>
                )}
              </div>
            </form>

            <h2 style={{ marginTop: 18 }}>Manage Matches</h2>
            <div className="requests-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {matches.length === 0 ? (
                <p className="muted">No matches yet.</p>
              ) : (
                matches.map((match) => (
                  <div key={match.id} className="request-row" style={{ alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--glass-border, #2a2e3a)' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{match.teamA} vs {match.teamB}</strong>
                      <p className="small-text">Status: <span className={match.status === 'Upcoming' ? 'status live' : 'status'}>{match.status}</span></p>
                      <p className="small-text">Start: {new Date(match.matchStartTime).toLocaleString()}</p>
                      <p className="small-text">Deadline: {new Date(match.biddingDeadline).toLocaleString()}</p>
                      {match.result && <p className="small-text">Result: {match.result}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                      {match.status !== 'Completed' && (
                        <button className="btn buy" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => startEditMatch(match)}>Edit</button>
                      )}
                      <button className="btn bid" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => deleteMatch(match.id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h2 style={{ marginTop: 18 }}>Declare Result</h2>
            <form onSubmit={declareResult}>
              <select value={resultForm.matchId} onChange={(event) => setResultForm((prev) => ({ ...prev, matchId: event.target.value }))} required>
                <option value="">Select match</option>
                {matches.filter((item) => item.status !== 'Completed').map((item) => (
                  <option key={item.id} value={item.id}>{item.teamA} vs {item.teamB}</option>
                ))}
              </select>
              <select value={resultForm.result} onChange={(event) => setResultForm((prev) => ({ ...prev, result: event.target.value }))}>
                <option value="TEAM_A">Team A won</option>
                <option value="TEAM_B">Team B won</option>
              </select>
              <button className="confirm" type="submit">Declare</button>
            </form>
            {matchMessage && <p className="muted">{matchMessage}</p>}
          </article>

          <article className="wallet-card">
            <h2>Admin Topup Requests</h2>
            <div className="requests-list">
              {adminRequests.filter(request => request.userRole !== 'superadmin').map((request) => (
                <div key={request.id} className="admin-request-card">
                  {request.screenshotUrl && (
                    <div style={{ marginBottom: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '12px' }}>
                      <img 
                        src={`${API_BASE}${request.screenshotUrl}`} 
                        alt="Payment proof" 
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', cursor: 'pointer' }} 
                        onClick={() => setFullscreenImage(`${API_BASE}${request.screenshotUrl}`)}
                      />
                    </div>
                  )}
                  <div>
                    <strong>{request.userName}</strong>
                    <p className="small-text">{request.id} · {formatCurrency(request.amount)}</p>
                    <p className="small-text">{request.upiRef}</p>
                  </div>
                  <div className="admin-actions">
                    <span className={`request-status ${request.status === 'Approved' ? 'approved' : request.status === 'Rejected' ? 'rejected' : 'pending'}`}>{request.status}</span>
                    {request.status === 'Pending' && (
                      <div className="action-row">
                        <button className="btn buy" onClick={() => approveTopup(request.id)}>Approve</button>
                        <button className="btn bid" onClick={() => rejectTopup(request.id)}>Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: 18 }}>Wallet Ledger</h2>
            <div className="requests-list">
              {users.filter(item => item.role !== 'superadmin').map((item) => (
                <div key={item.id} className="request-row">
                  <strong>{item.name}</strong>
                  <strong>{formatCurrency(item.wallet)}</strong>
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: 18 }}>Transaction Ledger</h2>
            <div className="requests-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {transactions.length === 0 ? (
                <p className="muted">No transactions yet.</p>
              ) : (
                transactions.filter(tx => tx.userRole !== 'superadmin').map((tx) => (
                  <div key={tx.id} className="request-row" style={{ paddingBottom: '8px', borderBottom: '1px solid #e0e0e0', marginBottom: '8px' }}>
                    <div>
                      <strong>{tx.userName}</strong>
                      <p className="small-text">{tx.description}</p>
                      <p className="small-text">Type: {tx.type} · Amount: {formatCurrency(tx.amount)}</p>
                      <p className="small-text">Balance: {formatCurrency(tx.balanceBefore)} → {formatCurrency(tx.balanceAfter)}</p>
                      <p className="small-text">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      )}

      {fullscreenImage && (
        <div className="fullscreen-image-modal" onClick={() => setFullscreenImage(null)}>
          <div className="fullscreen-image-container">
            <button className="close-fullscreen" onClick={() => setFullscreenImage(null)}>✕</button>
            <img src={fullscreenImage} alt="Full screen" />
          </div>
        </div>
      )}
    </div>
  )
}

export default AppBidding

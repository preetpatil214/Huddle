import { useEffect, useState } from 'react'
import Brand from './components/Brand.jsx'
import Field from './components/Field.jsx'
import MapView from './components/MapView.jsx'
import { ensureAnonymousUser, subscribeToAuth } from './services/firebase.js'
import { createHuddle, joinHuddle, saveMemberLocation, subscribeToHuddle, subscribeToUserHuddles, getStoredHuddles, clearLocalSession } from './services/huddle.js'
import { requestCurrentLocation, watchLocation } from './services/location.js'

const emptyForm = { name: '', password: '', profileName: '', home: null }

function Button({ children, variant = 'primary', ...props }) {
  return <button className={`button button--${variant}`} {...props}>{children}</button>
}

function Back({ onClick }) {
  return <button className="back-button" onClick={onClick} aria-label="Go back">&#8592;</button>
}

function Welcome({ onCreate, onJoin }) {
  return <main className="welcome page-shell">
    <div className="welcome__image" />
    <div className="welcome__content">
      <img src="/huddleicon.jpg" alt="Huddle" className="welcome__logo" />
      <p className="welcome__credit">Built by Preet</p>
      <h1>Stay close to the people who matter.</h1>
      <div className="welcome__actions">
        <Button onClick={onCreate}>Create a Huddle <span>&#8594;</span></Button>
        <Button variant="quiet" onClick={onJoin}>Join a Huddle <span>&#8594;</span></Button>
      </div>
    </div>
  </main>
}

function HuddleForm({ mode, form, setForm, onNext, onBack, error, loading }) {
  const isCreate = mode === 'create'
  const [homeError, setHomeError] = useState('')
  const setHome = () => requestCurrentLocation((location) => { setForm((current) => ({ ...current, home: location })); setHomeError('') }, () => setHomeError('Location unavailable. Select a point on the map instead.'))
  return <main className="form-page page-shell">
    <div className="form-topline"><span className="step">01 / 02</span><Back onClick={onBack} /></div>
    <div className="form-page__intro"><h1>{isCreate ? 'Create your Huddle' : 'Join your Huddle'}</h1><p>{isCreate ? 'A private place for your family to stay connected.' : 'Enter the details shared by your family.'}</p></div>
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onNext() }}>
      <Field label={isCreate ? 'Huddle name' : 'Huddle code'} value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder={isCreate ? 'e.g. The Parkers' : 'e.g. 4A8F2C1D'} autoComplete="off" />
      <Field label="Huddle password" type="password" value={form.password} onChange={(password) => setForm((current) => ({ ...current, password }))} placeholder="At least 6 characters" autoComplete="new-password" />
      {isCreate && <div className={`home-picker ${error && !form.home ? 'home-picker--error' : ''}`}>
        <div className="home-picker__header"><div><span className="field-label"><span className="home-icon" aria-hidden="true" /> Home</span><p>{form.home ? `${form.home.latitude.toFixed(4)}, ${form.home.longitude.toFixed(4)}` : 'Tap the map or use your current location'}</p></div><Button type="button" variant="outline" onClick={setHome}>Use current</Button></div>
        <MapView home={form.home} onSelectHome={(home) => setForm((current) => ({ ...current, home }))} />
        {homeError && <p className="error-text">{homeError}</p>}
      </div>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? 'Working...' : isCreate ? 'Continue' : 'Join Huddle'} <span>&#8594;</span></Button>
    </form>
  </main>
}

function Profile({ form, setForm, onContinue, onBack, loading, error }) {
  return <main className="form-page page-shell"><div className="form-topline"><span className="step">02 / 02</span><Back onClick={onBack} /></div><div className="form-page__intro"><h1>Welcome to Huddle</h1><p>What should your family call you?</p></div><form className="form-stack" onSubmit={(event) => { event.preventDefault(); onContinue() }}><Field label="Your name" value={form.profileName} onChange={(profileName) => setForm((current) => ({ ...current, profileName }))} placeholder="e.g. Jamie" autoComplete="name" />{error && <p className="error-text" role="alert">{error}</p>}<Button type="submit" disabled={loading}>{loading ? 'Joining...' : 'Continue'} <span>&#8594;</span></Button></form></main>
}

function LocationModal({ onAllow, error, loading }) {
  return <div className="location-modal" role="dialog" aria-modal="true" aria-labelledby="location-modal-title"><div className="location-modal__card"><div className="location-modal__icon" aria-hidden="true"><svg viewBox="0 0 32 40"><path d="M16 2C8.27 2 2 8.27 2 16c0 9.91 14 21 14 21s14-11.09 14-21C30 8.27 23.73 2 16 2Z" /><circle cx="16" cy="15" r="5" /></svg></div><h2 id="location-modal-title">Enable Location Access</h2><p>{error || 'Huddle requires live location sharing to display your family on the map safely.'}</p><Button onClick={onAllow} disabled={loading}>{loading ? 'Locating...' : 'Allow Location'}</Button><small>Note: Location access is required for Huddle to keep your family connected and safe.</small></div></div>
}

function HuddlesDashboard({ huddles, onCreate, onJoin, onEnter }) {
  return <main className="dashboard page-shell"><header className="dashboard__header"><div><span className="eyebrow">Your private circle</span><h1>My Huddles</h1><p>Choose a Huddle to see everyone on the map.</p></div></header><div className="dashboard__actions"><Button onClick={onCreate}>Create New Huddle <span>+</span></Button><Button variant="quiet" onClick={onJoin}>Join Another Huddle <span>&#8594;</span></Button></div><section className="huddle-list" aria-label="My Huddles">{huddles.length ? huddles.map((item) => { const active = Object.values(item.members || {}).filter((member) => member.sharingEnabled).length; return <article className="huddle-card" key={item.id}><div className="huddle-card__top"><div><span className="huddle-card__label">HUDDLE</span><h2>{item.name}</h2></div><span className="huddle-code">{item.code || item.id.slice(0, 8).toUpperCase()}</span></div><div className="huddle-card__meta"><span><strong>{Object.keys(item.members || {}).length}</strong> members</span><span className="huddle-card__live"><i />{active} active now</span></div><Button onClick={() => onEnter(item)}>Enter Map <span>&#8594;</span></Button></article> }) : <div className="dashboard__empty"><strong>No Huddles yet</strong><p>Create one for your family or join with an invite code.</p></div>}</section></main>
}

function HuddleMap({ huddle, userId, profileName, location, sharing, onToggle, onLocate, onLeave, onJoinAnother, onExit }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [locateOpen, setLocateOpen] = useState(false)
  const [focusLocation, setFocusLocation] = useState(null)
  const activeMembers = Object.entries(huddle.members || {}).filter(([, member]) => member.latitude != null && member.longitude != null)
  const atHome = location && huddle.home && Math.abs(location.latitude - huddle.home.latitude) < 0.01 && Math.abs(location.longitude - huddle.home.longitude) < 0.01
  const statusText = atHome ? 'At Home' : sharing ? 'Active' : 'Location off'
  return <main className="map-page" onClick={() => { setMenuOpen(false); setLocateOpen(false) }}><MapView members={huddle.members} home={huddle.home} currentUserId={userId} currentLocation={location} focusLocation={focusLocation} /><button className="map-exit" onClick={(event) => { event.stopPropagation(); onExit() }} aria-label="Back to My Huddles">&#8592; <span>My Huddles</span></button><header className="map-header" onClick={(event) => event.stopPropagation()}><Brand compact /><div className="map-context"><div className="map-context__label">{huddle.name.toUpperCase()} HUDDLE</div><strong>{profileName}</strong><div className="map-context__status"><span className={`status-dot ${sharing ? 'status-dot--live' : ''}`} />{statusText}</div></div><button className="icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Open menu">&#8942;</button></header><button className="locate-button" onClick={(event) => { event.stopPropagation(); setLocateOpen((open) => !open); onLocate() }} aria-expanded={locateOpen} aria-label="Locate"><span>&#9678;</span><strong>Locate</strong></button>{locateOpen && <div className="member-picker" onClick={(event) => event.stopPropagation()}><div className="member-picker__heading"><strong>Family locations</strong><span>{activeMembers.length} active</span></div>{activeMembers.length ? activeMembers.map(([id, member]) => <button className="member-picker__item" key={id} onClick={() => { setFocusLocation({ latitude: member.latitude, longitude: member.longitude }); setLocateOpen(false) }}><span className={`member-dot ${id === userId ? 'member-dot--you' : ''}`} /><span>{id === userId ? `${member.name} (you)` : member.name}</span><span className="member-picker__arrow">&#8594;</span></button>) : <p className="member-picker__empty">No active family locations yet.</p>}</div>}{menuOpen && <div className="map-menu" onClick={(event) => event.stopPropagation()}><div className="map-menu__profile"><div><strong>{profileName}</strong><span>{sharing ? 'Location sharing on' : 'Location sharing off'}</span></div></div><button className="menu-option" onClick={() => setMenuOpen(false)}>Edit Profile</button><button className="menu-option" onClick={() => setMenuOpen(false)}>Huddle Settings</button><button className="sharing-toggle" onClick={onToggle}><span className={`status-dot ${sharing ? 'status-dot--live' : ''}`} />Share Live Location</button><button className="menu-option" onClick={onJoinAnother}>Join another Huddle</button><button className="menu-link" onClick={onLeave}>Leave Huddle</button></div>}</main>
}

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [mode, setMode] = useState('create')
  const [form, setForm] = useState(emptyForm)
  const [user, setUser] = useState(null)
  const [huddle, setHuddle] = useState(null)
  const [huddles, setHuddles] = useState(() => getStoredHuddles())
  const [location, setLocation] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [locationPrompt, setLocationPrompt] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stopWatching, setStopWatching] = useState(() => () => {})

  useEffect(() => () => stopWatching(), [stopWatching])
  useEffect(() => subscribeToAuth((currentUser) => { if (currentUser) { setUser(currentUser); if (getStoredHuddles().length) setScreen('dashboard') } }), [])
  useEffect(() => { if (huddle) return subscribeToHuddle(huddle.id, (next) => { setHuddle(next); if (next) setHuddles((current) => current.map((item) => item.id === next.id ? next : item)) }) }, [huddle?.id])
  useEffect(() => { if (user) return subscribeToUserHuddles(user.uid, setHuddles) }, [user?.uid])

  const openForm = (nextMode) => { setMode(nextMode); setForm(emptyForm); setError(''); setScreen(nextMode === 'create' ? 'create' : 'join') }
  const toProfile = () => {
    if (!form.name.trim()) return setError('Enter a Huddle name to continue.')
    if (form.password.length < 6) return setError('Use a Huddle password with at least 6 characters.')
    setError('')
    setScreen('profile')
  }
  const finishProfile = async () => {
    if (!form.profileName.trim()) return setError('Tell your family what to call you.')
    setLoading(true); setError('')
    try {
      const currentUser = user || await ensureAnonymousUser()
      const nextHuddle = mode === 'create' ? await createHuddle({ ...form, userId: currentUser.uid }) : await joinHuddle({ ...form, userId: currentUser.uid })
      setUser(currentUser); setHuddle(nextHuddle); setHuddles((current) => [...current.filter((item) => item.id !== nextHuddle.id), nextHuddle]); setLocationError(''); setLocationPrompt(true); setScreen('map')
    } catch (caught) { setError(caught.message || 'Something went wrong. Try again.') } finally { setLoading(false) }
  }
  const enableLocation = () => {
    setLoading(true); setError(''); setLocationError(''); setLocationPrompt(true)
    requestCurrentLocation((current) => { setLocation(current); setSharing(true); setLocationPrompt(false); setLoading(false); const stop = watchLocation((next) => { setLocation(next); saveMemberLocation(huddle.id, user.uid, { ...next, sharingEnabled: true }) }, () => setLocationError('Location access is currently blocked. Please enable permissions in your device/browser settings to continue.')); setStopWatching(() => stop); saveMemberLocation(huddle.id, user.uid, { ...current, sharingEnabled: true }); setScreen('map') }, () => { setLoading(false); setLocationError('Location access is currently blocked. Please enable permissions in your device/browser settings to continue.'); setLocationPrompt(true) })
  }
  const toggleSharing = () => { if (sharing) { stopWatching(); setStopWatching(() => () => {}); setSharing(false); saveMemberLocation(huddle.id, user.uid, { sharingEnabled: false }) } else enableLocation() }
  const leave = () => { stopWatching(); clearLocalSession(); setHuddle(null); setHuddles([]); setUser(null); setForm(emptyForm); setSharing(false); setScreen('welcome') }
  const openJoin = () => { stopWatching(); setLocation(null); setSharing(false); setForm((current) => ({ ...emptyForm, profileName: current.profileName })); setError(''); setMode('join'); setScreen('join') }
  const exitMap = () => { stopWatching(); setStopWatching(() => () => {}); setSharing(false); if (huddle && user) saveMemberLocation(huddle.id, user.uid, { sharingEnabled: false }); setScreen('dashboard') }
  const enterHuddle = (nextHuddle) => { stopWatching(); setHuddle(nextHuddle); setLocation(null); setSharing(false); setLocationError(''); setLocationPrompt(true); setScreen('map') }
  if (screen === 'welcome') return <Welcome onCreate={() => openForm('create')} onJoin={() => openForm('join')} />
  if (screen === 'create' || screen === 'join') return <HuddleForm mode={mode} form={form} setForm={setForm} onNext={toProfile} onBack={() => setScreen('welcome')} error={error} loading={loading} />
  if (screen === 'profile') return <Profile form={form} setForm={setForm} onContinue={finishProfile} onBack={() => setScreen(mode)} loading={loading} error={error} />
  if (screen === 'dashboard') return <HuddlesDashboard huddles={huddles} onCreate={() => openForm('create')} onJoin={openJoin} onEnter={enterHuddle} />
  return <><HuddleMap huddle={huddle} userId={user.uid} profileName={form.profileName} location={location} sharing={sharing} onToggle={toggleSharing} onLocate={() => location && setLocation({ ...location })} onLeave={leave} onJoinAnother={openJoin} onExit={exitMap} />{locationPrompt && <LocationModal onAllow={enableLocation} error={locationError} loading={loading} />}</>
}

import { useEffect, useState } from 'react'
import Brand from './components/Brand.jsx'
import Field from './components/Field.jsx'
import MapView from './components/MapView.jsx'
import { ensureAnonymousUser } from './services/firebase.js'
import { createHuddle, joinHuddle, saveMemberLocation, subscribeToHuddle, clearLocalSession } from './services/huddle.js'
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
      <Field label="Huddle name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="e.g. The Parkers" autoComplete="off" />
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

function Permission({ onEnable, onSkip, error, loading }) {
  return <main className="permission page-shell"><span className="eyebrow">Your privacy, your choice</span><h1>Share your location</h1><p>Your Huddle members will be able to see your location on the family map.</p><p className="secondary-copy">You can stop sharing anytime.</p>{error && <p className="error-text" role="alert">{error}</p>}<div className="permission__actions"><Button onClick={onEnable} disabled={loading}>{loading ? 'Locating...' : 'Enable Location'} <span>&#8594;</span></Button><p className="permission__note">Note: Location access is required for Huddle to keep your family connected and safe.</p></div></main>
}

function HuddleMap({ huddle, userId, profileName, location, sharing, onToggle, onLocate, onLeave, onJoinAnother }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [locateOpen, setLocateOpen] = useState(false)
  const [focusLocation, setFocusLocation] = useState(null)
  const [batteryLevel, setBatteryLevel] = useState(85)
  const activeMembers = Object.entries(huddle.members || {}).filter(([, member]) => member.latitude != null && member.longitude != null)
  useEffect(() => {
    let battery
    const updateBattery = () => battery && setBatteryLevel(Math.round(battery.level * 100))
    navigator.getBattery?.().then((result) => {
      battery = result
      updateBattery()
      battery.addEventListener('levelchange', updateBattery)
    })
    return () => battery?.removeEventListener('levelchange', updateBattery)
  }, [])
  const atHome = location && huddle.home && Math.abs(location.latitude - huddle.home.latitude) < 0.01 && Math.abs(location.longitude - huddle.home.longitude) < 0.01
  const statusText = atHome ? 'At Home' : sharing ? 'Active' : 'Location off'
  return <main className="map-page" onClick={() => { setMenuOpen(false); setLocateOpen(false) }}><MapView members={huddle.members} home={huddle.home} currentUserId={userId} currentLocation={location} focusLocation={focusLocation} /><header className="map-header" onClick={(event) => event.stopPropagation()}><Brand compact /><div className="map-context"><div className="map-context__label">{huddle.name.toUpperCase()} HUDDLE</div><strong>{profileName}</strong><div className="map-context__status"><span className={`status-dot ${sharing ? 'status-dot--live' : ''}`} />{statusText}<span className="map-context__separator">·</span><span className="map-context__battery">Battery {batteryLevel}%</span></div></div><button className="icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Open menu">&#8942;</button></header><button className="locate-button" onClick={(event) => { event.stopPropagation(); setLocateOpen((open) => !open); onLocate() }} aria-expanded={locateOpen} aria-label="Locate"><span>&#9678;</span><strong>Locate</strong></button>{locateOpen && <div className="member-picker" onClick={(event) => event.stopPropagation()}><div className="member-picker__heading"><strong>Family locations</strong><span>{activeMembers.length} active</span></div>{activeMembers.length ? activeMembers.map(([id, member]) => <button className="member-picker__item" key={id} onClick={() => { setFocusLocation({ latitude: member.latitude, longitude: member.longitude }); setLocateOpen(false) }}><span className={`member-dot ${id === userId ? 'member-dot--you' : ''}`} /><span>{id === userId ? `${member.name} (you)` : member.name}</span><span className="member-picker__arrow">&#8594;</span></button>) : <p className="member-picker__empty">No active family locations yet.</p>}</div>}{menuOpen && <div className="map-menu" onClick={(event) => event.stopPropagation()}><div className="map-menu__profile"><div><strong>{profileName}</strong><span>{sharing ? 'Location sharing on' : 'Location sharing off'}</span></div></div><button className="menu-option" onClick={() => setMenuOpen(false)}>Edit Profile</button><button className="menu-option" onClick={() => setMenuOpen(false)}>Huddle Settings</button><button className="sharing-toggle" onClick={onToggle}><span className={`status-dot ${sharing ? 'status-dot--live' : ''}`} />Share Live Location</button><button className="menu-option" onClick={onJoinAnother}>Join another Huddle</button><button className="menu-link" onClick={onLeave}>Leave Huddle</button></div>}</main>
}

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [mode, setMode] = useState('create')
  const [form, setForm] = useState(emptyForm)
  const [user, setUser] = useState(null)
  const [huddle, setHuddle] = useState(null)
  const [location, setLocation] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stopWatching, setStopWatching] = useState(() => () => {})

  useEffect(() => () => stopWatching(), [stopWatching])
  useEffect(() => { if (huddle) return subscribeToHuddle(huddle.id, setHuddle) }, [huddle?.id])

  const openForm = (nextMode) => { setMode(nextMode); setForm(emptyForm); setError(''); setScreen(nextMode === 'create' ? 'create' : 'join') }
  const toProfile = () => {
    if (!form.name.trim()) return setError('Enter a Huddle name to continue.')
    if (form.password.length < 6) return setError('Use a Huddle password with at least 6 characters.')
    if (mode === 'create' && !form.home) return setError('Choose your Home by tapping the map or selecting Use current.')
    setError('')
    setScreen('profile')
  }
  const finishProfile = async () => {
    if (!form.profileName.trim()) return setError('Tell your family what to call you.')
    setLoading(true); setError('')
    try {
      const currentUser = user || await ensureAnonymousUser()
      const nextHuddle = mode === 'create' ? await createHuddle({ ...form, userId: currentUser.uid }) : await joinHuddle({ ...form, userId: currentUser.uid })
      setUser(currentUser); setHuddle(nextHuddle); setScreen('permission')
    } catch (caught) { setError(caught.message || 'Something went wrong. Try again.') } finally { setLoading(false) }
  }
  const enableLocation = () => {
    setLoading(true); setError('')
    requestCurrentLocation((current) => { setLocation(current); setSharing(true); setLoading(false); const stop = watchLocation((next) => { setLocation(next); saveMemberLocation(huddle.id, user.uid, { ...next, sharingEnabled: true }) }, () => setError('Location unavailable. You can try again from the menu.')); setStopWatching(() => stop); saveMemberLocation(huddle.id, user.uid, { ...current, sharingEnabled: true }); setScreen('map') }, () => { setLoading(false); setError('Location access is off. You can enable it from your device settings.') })
  }
  const toggleSharing = () => { if (sharing) { stopWatching(); setStopWatching(() => () => {}); setSharing(false); saveMemberLocation(huddle.id, user.uid, { sharingEnabled: false }) } else enableLocation() }
  const leave = () => { stopWatching(); clearLocalSession(); setHuddle(null); setUser(null); setForm(emptyForm); setSharing(false); setScreen('welcome') }
  const joinAnother = () => { stopWatching(); setHuddle(null); setLocation(null); setSharing(false); setForm(emptyForm); setError(''); setMode('join'); setScreen('join') }
  if (screen === 'welcome') return <Welcome onCreate={() => openForm('create')} onJoin={() => openForm('join')} />
  if (screen === 'create' || screen === 'join') return <HuddleForm mode={mode} form={form} setForm={setForm} onNext={toProfile} onBack={() => setScreen('welcome')} error={error} loading={loading} />
  if (screen === 'profile') return <Profile form={form} setForm={setForm} onContinue={finishProfile} onBack={() => setScreen(mode)} loading={loading} error={error} />
  if (screen === 'permission') return <Permission onEnable={enableLocation} error={error} loading={loading} />
  return <HuddleMap huddle={huddle} userId={user.uid} profileName={form.profileName} location={location} sharing={sharing} onToggle={toggleSharing} onLocate={() => location && setLocation({ ...location })} onLeave={leave} onJoinAnother={joinAnother} />
}

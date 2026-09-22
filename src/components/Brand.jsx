export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <img src="/huddleicon.jpg" alt="Huddle" className="brand__logo" />
    </div>
  )
}

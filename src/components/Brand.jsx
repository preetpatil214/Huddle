import iconBackground from '../../iconbg.jpg'

export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <img src={iconBackground} alt="Huddle" className="brand__logo" />
    </div>
  )
}

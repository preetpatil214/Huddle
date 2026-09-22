export default function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} required />
    </label>
  )
}

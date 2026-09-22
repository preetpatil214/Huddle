import { useState } from 'react'

export default function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field__control">
        <input type={isPassword && visible ? 'text' : type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} required />
        {isPassword && <button type="button" className="field__toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button>}
      </span>
    </label>
  )
}

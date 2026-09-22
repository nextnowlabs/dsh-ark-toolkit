import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: string
  variant?: string
  children?: ReactNode
}

/** Test-only HTML substitute for the host button component. */
export function Button({ size, variant, ...props }: ButtonProps): ReactNode {
  return <button data-size={size} data-variant={variant} {...props} />
}

/** Test-only HTML substitute for the host input component. */
export function Input(props: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input {...props} />
}

interface SettingsFormLabels {
  unavailable: string
  readOnly: string
  saveFailed: string
  save: string
  saving: string
}

interface SettingsFormShell {
  available: boolean
  writable: boolean
  dirty: boolean
  invalid: boolean
  saving: boolean
  failed: boolean
}

interface SettingsFormProps {
  labels: SettingsFormLabels
  state: SettingsFormShell
  onSave: () => void
  onDiscard: () => void
  children: ReactNode
}

/**
 * Test-only substitute for the host's settings-form frame. It reproduces the
 * DOM contract this plugin's page depends on: the unavailable line in place of
 * the controls, the read-only notice, one save control, and the failure notice
 * beside it.
 */
export function SettingsForm({ labels, state, onSave, onDiscard, children }: SettingsFormProps): ReactNode {
  if (!state.available) return <p>{labels.unavailable}</p>
  return (
    <div>
      {state.writable ? null : <p>{labels.readOnly}</p>}
      {children}
      <div>
        <button type="button" disabled={!state.writable} onClick={onSave}>
          {state.saving ? labels.saving : labels.save}
        </button>
        <button type="button" onClick={onDiscard}>discard</button>
        {state.failed ? <p>{labels.saveFailed}</p> : null}
      </div>
    </div>
  )
}

interface SettingsValueFieldProps {
  id: string
  label: string
  hint?: string | undefined
  text: string
  overridden: boolean
  invalid: boolean
  overriddenLabel: string
  resetLabel: string
  invalidLabel: string
  disabled: boolean
  numeric?: boolean
  placeholder?: string | undefined
  onEdit: (text: string) => void
  onReset: () => void
}

/** Test-only substitute for one staged value control. */
export function SettingsValueField({
  id, label, hint, text, overridden, invalid, overriddenLabel, resetLabel, invalidLabel, disabled, numeric, placeholder, onEdit, onReset,
}: SettingsValueFieldProps): ReactNode {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        {...(numeric === true ? { inputMode: 'numeric' as const } : {})}
        onChange={(event) => { onEdit(event.target.value) }}
      />
      <small>{invalid ? invalidLabel : hint}</small>
      {overridden ? <span>{overriddenLabel}</span> : null}
      {overridden ? <button type="button" disabled={disabled} onClick={onReset}>{resetLabel}</button> : null}
    </div>
  )
}

interface SettingsSecretFieldProps {
  id: string
  label: string
  hint: string
  text: string
  configured: boolean
  stateLabel: string
  disabled: boolean
  onEdit: (text: string) => void
}

/**
 * Test-only substitute for one write-only credential control. The stored value
 * never rides a response, so the control renders only the draft.
 */
export function SettingsSecretField({ id, label, hint, text, stateLabel, disabled, onEdit }: SettingsSecretFieldProps): ReactNode {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        value={text}
        disabled={disabled}
        onChange={(event) => { onEdit(event.target.value) }}
      />
      <small>{hint}</small>
      <span>{stateLabel}</span>
    </div>
  )
}

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

function AuthField({
  autoComplete,
  disabled = false,
  error,
  id,
  label,
  minLength,
  onChange,
  placeholder,
  required = true,
  type = 'text',
  value,
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#27352e]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-[#17211d] outline-none transition placeholder:text-[#9aa39e] focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 disabled:cursor-not-allowed disabled:bg-[#f4f6f3] ${
            isPassword ? 'pr-11' : ''
          } ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-[#dfe5df]'
          }`}
          disabled={disabled}
          id={id}
          minLength={minLength}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          type={isPassword && isPasswordVisible ? 'text' : type}
          value={value}
        />
        {isPassword && (
          <button
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#7b8580] hover:text-[#27352e] focus-visible:outline-2 focus-visible:outline-emerald-700"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export default AuthField

import React, { useEffect, useState } from 'react'
import './LoginPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [ripples, setRipples] = useState([])

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleRegisterChange = (e) => {
    const { name, value } = e.target
    setRegisterForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const triggerError = (message, errors = {}) => {
    setError(message)
    setFieldErrors(errors)
    setIsShaking(false)
    requestAnimationFrame(() => setIsShaking(true))
    window.setTimeout(() => setIsShaking(false), 450)
  }

  const createRipple = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const ripple = {
      id: Date.now() + Math.random(),
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      size,
    }
    setRipples((prev) => [...prev, ripple])
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== ripple.id))
    }, 650)
  }

  const switchMode = (nextMode) => {
    if (isLoading || nextMode === mode) return
    setMode(nextMode)
    setError('')
    setFieldErrors({})
    setShowPassword(false)
  }

  const validateLoginForm = () => {
    const errors = {}

    if (!loginForm.email || loginForm.email.trim() === '') {
      errors.email = 'Email or username is required'
    }

    if (!loginForm.password || loginForm.password.trim() === '') {
      errors.password = 'Password is required'
    }

    if (loginForm.email && loginForm.email.includes('@') && !validateEmail(loginForm.email)) {
      errors.email = 'Invalid email format'
    }

    return errors
  }

  const validateRegisterForm = () => {
    const errors = {}

    if (!registerForm.name) errors.name = 'Name is required'
    if (!registerForm.email) errors.email = 'Email is required'
    if (!registerForm.password) errors.password = 'Password is required'
    if (!registerForm.confirmPassword) errors.confirmPassword = 'Please confirm your password'

    if (registerForm.email && !validateEmail(registerForm.email)) {
      errors.email = 'Invalid email format'
    }

    if (registerForm.password && registerForm.password.length < 6) {
      errors.password = 'Minimum 6 characters required'
    }

    if (registerForm.password && registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    return errors
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    const errors = validateLoginForm()
    if (Object.keys(errors).length > 0) {
      triggerError('Please check highlighted fields', errors)
      return
    }

    setIsLoading(true)
    setError('')
    setFieldErrors({})

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      // Add fake delay (1.5 seconds) to show buffering animation
      await new Promise(resolve => setTimeout(resolve, 1500))

      setSuccess(true)
      localStorage.setItem('sm_token', data.token)
      localStorage.setItem('sm_user', JSON.stringify(data.user))

      if (rememberMe) {
        localStorage.setItem('sm_remember', JSON.stringify({ email: loginForm.email }))
      } else {
        localStorage.removeItem('sm_remember')
      }

      setTimeout(() => {
        onLoginSuccess(data.token, data.user)
      }, 800)
    } catch (err) {
      triggerError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    const errors = validateRegisterForm()
    if (Object.keys(errors).length > 0) {
      triggerError('Please check highlighted fields', errors)
      return
    }

    setIsLoading(true)
    setError('')
    setFieldErrors({})

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      setSuccess(true)
      localStorage.setItem('sm_token', data.token)
      localStorage.setItem('sm_user', JSON.stringify(data.user))

      setTimeout(() => {
        onLoginSuccess(data.token, data.user)
      }, 1500)
    } catch (err) {
      triggerError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const remembered = localStorage.getItem('sm_remember')
    if (remembered) {
      const { email } = JSON.parse(remembered)
      setLoginForm((prev) => ({ ...prev, email }))
      setRememberMe(true)
    }
  }, [])

  const getFieldClass = (fieldName) => `input-wrapper ${fieldErrors[fieldName] ? 'error' : ''}`

  return (
    <div className="login-wrapper">
      <div className="login-bg-animated">
        <div className="stadium-lights"></div>
        <div className="pitch-grid"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">
            <span className="title-icon">🏏</span>
            <span className="title-text">IPL Auction Login</span>
          </h1>
          <p className="login-subtitle">Welcome to the Bidding Arena</p>
        </div>

        <div className={`login-card ${success ? 'success-state' : ''} ${isShaking ? 'error-state' : ''}`}>
          {success && (
            <div className="success-overlay">
              <div className="success-checkmark" aria-hidden="true">
                <svg viewBox="0 0 64 64" className="checkmark-svg">
                  <circle cx="32" cy="32" r="30" className="checkmark-circle" />
                  <path d="M18 33 L28 43 L47 22" className="checkmark-path" />
                </svg>
              </div>
              <p className="success-text">Authentication Successful!</p>
            </div>
          )}

          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >
              <span className="tab-icon">🔐</span> Login
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
              type="button"
            >
              <span className="tab-icon">✨</span> Register
            </button>
          </div>

          {error && (
            <div className="error-message-animated">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="auth-form login-form">
              <div className="input-group">
                <label htmlFor="login-email" className="input-label">Email or Username</label>
                <div className={getFieldClass('email')}>
                  <span className="input-icon" aria-hidden="true">👤</span>
                  <input
                    id="login-email"
                    type="text"
                    name="email"
                    placeholder="Enter email or username"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    className="input-field"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              <div className="input-group">
                <div className="password-header">
                  <label htmlFor="login-password" className="input-label">Password</label>
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => triggerError('Password recovery is not configured yet. Please contact admin.')}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className={getFieldClass('password')}>
                  <span className="input-icon" aria-hidden="true">🔒</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    className="input-field"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="checkbox-label">Remember me</label>
              </div>

              <button
                type="submit"
                className={`auth-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
                onClick={createRipple}
              >
                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    className="button-ripple"
                    style={{
                      width: ripple.size,
                      height: ripple.size,
                      left: ripple.x - ripple.size / 2,
                      top: ripple.y - ripple.size / 2,
                    }}
                  />
                ))}
                {isLoading ? (
                  <>
                    <span className="loader"></span>
                    <span className="button-text">Logging in...</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    <span className="button-text">Enter the Arena</span>
                  </>
                )}
              </button>

              <p className="auth-switch-text">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode('register')}
                >
                  Create Account
                </button>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="auth-form register-form">
              <div className="input-group">
                <label htmlFor="register-name" className="input-label">Full Name</label>
                <div className={getFieldClass('name')}>
                  <span className="input-icon" aria-hidden="true">👤</span>
                  <input
                    id="register-name"
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={registerForm.name}
                    onChange={handleRegisterChange}
                    className="input-field"
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="register-email" className="input-label">Email Address</label>
                <div className={getFieldClass('email')}>
                  <span className="input-icon" aria-hidden="true">📧</span>
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    className="input-field"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="register-password" className="input-label">Password</label>
                <div className={getFieldClass('password')}>
                  <span className="input-icon" aria-hidden="true">🔒</span>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    className="input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="register-confirm" className="input-label">Confirm Password</label>
                <div className={getFieldClass('confirmPassword')}>
                  <span className="input-icon">✓</span>
                  <input
                    id="register-confirm"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={registerForm.confirmPassword}
                    onChange={handleRegisterChange}
                    className="input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
                {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                className={`auth-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
                onClick={createRipple}
              >
                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    className="button-ripple"
                    style={{
                      width: ripple.size,
                      height: ripple.size,
                      left: ripple.x - ripple.size / 2,
                      top: ripple.y - ripple.size / 2,
                    }}
                  />
                ))}
                {isLoading ? (
                  <>
                    <span className="loader"></span>
                    <span className="button-text">Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">⭐</span>
                    <span className="button-text">Join the Arena</span>
                  </>
                )}
              </button>

              <p className="auth-switch-text">
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode('login')}
                >
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>

        <div className="login-footer">
          <p className="footer-text">🏏 New Bidding Era 🏆</p>
          <p className="footer-subtext">Experience the thrill of IPL auctions</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

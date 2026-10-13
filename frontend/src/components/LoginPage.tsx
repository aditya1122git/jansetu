import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, RefreshCw, User as UserIcon } from './icons';
import { api } from '../services/api';
import { SystemSettings, User } from '../types';
import { TopBar } from './TopBar';
import { Header } from './Header';
import { Navbar } from './Navbar';
import './LoginPage.css';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  language: 'hi' | 'en';
  setLanguage: (lang: 'hi' | 'en') => void;
  settings: SystemSettings | null;
  sessionExpired?: boolean;
  onGoHome: () => void;
  embedded?: boolean;
}

type AuthMode = 'login' | 'forgot';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, language, setLanguage, settings, sessionExpired = false, onGoHome, embedded = false }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const loginSectionRef = useRef<HTMLElement>(null);

  const scrollToLogin = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copy = language === 'hi' ? {
    title: 'E-Sewa Tarapur में लॉगिन करें', subtitle: 'अपने अधिकृत खाते से साइन इन करें', email: 'ईमेल',
    password: 'पासवर्ड', captcha: 'कैप्चा', login: 'साइन इन करें', forgot: 'पासवर्ड भूल गए?',
    back: 'लॉगिन पर वापस जाएँ', send: 'रीसेट लिंक बनाएँ', reset: 'नया पासवर्ड सेट करें'
  } : {
    title: 'Login to E-Sewa Tarapur', subtitle: 'Sign in with your authorized account', email: 'Email',
    password: 'Password', captcha: 'CAPTCHA', login: 'Sign in', forgot: 'Forgot password?',
    back: 'Back to login', send: 'Send reset link', reset: 'Set new password'
  };

  const clearFeedback = () => { setErrorMsg(null); setSuccessMsg(null); };

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const result = await api.getCaptcha();
      setCaptchaId(result.captchaId);
      setCaptchaSvg(result.svgDataUrl);
      setCaptchaInput('');
    } catch {
      setErrorMsg('Unable to load the security code. Please retry.');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => { loadCaptcha(); }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (!captchaInput.trim()) {
      setErrorMsg('Please Enter CAPTCHA');
      return;
    }
    if (!identifier.trim() || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.login({
        username: identifier.trim(), email: identifier.trim(), password,
        captchaId, captchaCode: captchaInput.trim().toUpperCase()
      });
      onLoginSuccess(result.user);
    } catch (error: any) {
      setErrorMsg(error.message || 'Sign in failed. Please verify your details.');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (!forgotEmail.trim()) return setErrorMsg('Please enter your registered email.');
    setLoading(true);
    try {
      const result = await api.forgotPassword(forgotEmail.trim());
      setSuccessMsg(result.message);
    } catch (error: any) {
      setErrorMsg(error.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    clearFeedback();
    setMode(next);
  };

  return (
    <div className={`login-page${embedded ? ' embedded-login' : ''}`}>
      {!embedded && <>
        <TopBar language={language} setLanguage={setLanguage} settings={settings} />
        <Header
          currentUser={null}
          onLogout={() => undefined}
          language={language}
        />
        <Navbar
          currentUser={null}
          onOpenSection={scrollToLogin}
          language={language}
          onGoHome={onGoHome}
        />
      </>}

      <section ref={loginSectionRef} className="container login-stage">
        <div className="login-shell row g-0">
          <div className="col-12 login-form-pane">
            <div className="login-form-wrap">
              <h2>{mode === 'login' ? copy.title : copy.forgot}</h2>
              <p className="login-subtitle">{mode === 'login' ? copy.subtitle : 'Complete the form below to continue.'}</p>

              {sessionExpired && mode === 'login' && (
                <div className="alert alert-warning login-alert" role="alert">
                  <AlertCircle /> Session expired. Please sign in again.
                </div>
              )}
              {errorMsg && <div className="alert alert-danger login-alert"><AlertCircle /> {errorMsg}</div>}
              {successMsg && <div className="alert alert-success login-alert">{successMsg}</div>}

              {mode === 'login' && (
                <form onSubmit={handleLogin} className="login-form">
                  <label className="form-label" htmlFor="login-email">{copy.email}</label>
                  <div className="login-input-group">
                    <UserIcon /><input id="login-email" className="form-control" type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Enter email" autoComplete="username" />
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label" htmlFor="login-password">{copy.password}</label>
                    <button type="button" className="login-link" onClick={() => switchMode('forgot')}>{copy.forgot}</button>
                  </div>
                  <div className="login-input-group">
                    <Lock /><input id="login-password" className="form-control" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
                    <button type="button" className="login-eye" onClick={() => setShowPassword(value => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff /> : <Eye />}</button>
                  </div>

                  <label className="form-label" htmlFor="captcha-code">{copy.captcha}</label>
                  <div className="login-captcha-row">
                    <div className="login-captcha-image">{captchaSvg ? <img src={captchaSvg} alt="CAPTCHA" /> : <span>{captchaLoading ? 'Loading…' : 'Unavailable'}</span>}</div>
                    <button type="button" className="btn btn-outline-secondary login-refresh" onClick={loadCaptcha} disabled={captchaLoading} aria-label="Refresh CAPTCHA"><RefreshCw className={captchaLoading ? 'animate-spin' : ''} /></button>
                    <input id="captcha-code" className="form-control" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} placeholder="Enter code" maxLength={8} autoComplete="off" />
                  </div>

                  <button className="btn login-submit" disabled={loading} type="submit">
                    {loading ? 'Signing...' : copy.login}
                  </button>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="login-form">
                  <label className="form-label" htmlFor="forgot-email">{copy.email}</label>
                  <div className="login-input-group"><UserIcon /><input id="forgot-email" className="form-control" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Enter email" /></div>
                  <button className="btn login-submit" disabled={loading}>{loading ? 'Sending...' : copy.send}</button>
                  <button type="button" className="login-link mx-auto" onClick={() => switchMode('login')}>{copy.back}</button>
                </form>
              )}

            </div>
          </div>
        </div>
      </section>
      {!embedded && <footer className="login-footer">© {new Date().getFullYear()} E-Sewa Tarapur · Government of Bihar</footer>}
    </div>
  );
};

export default LoginPage;

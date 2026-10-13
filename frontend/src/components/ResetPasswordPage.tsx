import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle, Eye, EyeOff, Lock, Shield } from './icons';
import { api } from '../services/api';
import './LoginPage.css';

interface ResetPasswordPageProps {
  token: string;
  onGoLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token, onGoLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(Boolean(token));
  const [linkValid, setLinkValid] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(token ? null : 'This password reset link is incomplete or invalid.');

  useEffect(() => {
    if (!token) return;
    api.validatePasswordResetToken(token)
      .then(() => setLinkValid(true))
      .catch((error: any) => setErrorMsg(error.message || 'This password reset link is invalid or has expired.'))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    if (!token) return setErrorMsg('This password reset link is incomplete or invalid.');
    if (newPassword.length < 8) return setErrorMsg('New password must contain at least 8 characters.');
    if (newPassword !== confirmPassword) return setErrorMsg('New password and confirmation do not match.');

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setCompleted(true);
      setNewPassword('');
      setConfirmPassword('');
      window.history.replaceState({}, '', '/login');
    } catch (error: any) {
      setErrorMsg(error.message || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page reset-password-page">
      <header className="reset-password-header">
        <div className="reset-password-brand">
          <span className="reset-password-logo"><Shield /></span>
          <span><strong>E-Sewa Tarapur</strong><small>Application &amp; Grievance Management Portal</small></span>
        </div>
      </header>

      <section className="reset-password-stage">
        <div className="reset-password-card">
          {validating ? (
            <div className="reset-password-success"><span className="spinner-border text-primary" /><h1>Verifying secure link</h1><p>Please wait while we check this one-time password reset link.</p></div>
          ) : completed ? (
            <div className="reset-password-success">
              <span className="reset-password-status success"><CheckCircle /></span>
              <h1>Password created successfully</h1>
              <p>Your password has been updated and this reset link is now expired. Sign in with your new password.</p>
              <button type="button" className="btn login-submit" onClick={onGoLogin}>Continue to Login <ArrowRight /></button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <span className="reset-password-status"><Lock /></span>
              <h1>Create New Password</h1>
              <p className="login-subtitle">Choose a strong password for your E-Sewa Tarapur account. This secure link can be used only once.</p>

              {errorMsg && <div className="alert alert-danger login-alert"><AlertCircle /> {errorMsg}</div>}

              <label className="form-label" htmlFor="reset-new-password">New Password</label>
              <div className="login-input-group">
                <Lock />
                <input id="reset-new-password" className="form-control" type={showPassword ? 'text' : 'password'} minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" />
                <button type="button" className="login-eye" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>

              <label className="form-label" htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="login-input-group">
                <Lock />
                <input id="reset-confirm-password" className="form-control" type={showPassword ? 'text' : 'password'} minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" autoComplete="new-password" />
              </div>

              <button className="btn login-submit" disabled={loading || !token || !linkValid} type="submit">
                {loading ? <span className="spinner-border spinner-border-sm" /> : <>Create Password <ArrowRight /></>}
              </button>
              <button type="button" className="login-link mx-auto mt-3" onClick={onGoLogin}>Back to Login</button>
            </form>
          )}
        </div>
      </section>
      <footer className="login-footer">© {new Date().getFullYear()} E-Sewa Tarapur · Secure account recovery</footer>
    </main>
  );
};

export default ResetPasswordPage;

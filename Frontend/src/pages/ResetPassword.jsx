import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout, { AuthField, FormAlert } from '../components/AuthLayout';
import Button from '../components/Button';
import { resetPassword } from '../services/authService';
import { removeAuthToken } from '../services/api';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const errors = {};
  if (!form.password) errors.password = 'Choose a new password';
  else if (form.password.length < 6) errors.password = 'Use at least 6 characters';
  else if (form.password.length > 72) errors.password = 'Use at most 72 characters';
  if (form.confirm !== form.password) errors.confirm = "Passwords don't match";
  const show = (f) => (touched[f] || submitted ? errors[f] : undefined);

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const onBlur = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setIsLoading(true);
    setError('');
    try {
      await resetPassword(token, form.password);
      removeAuthToken(); // any old session on this device should sign in again
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Link incomplete" subtitle="This reset link is missing its code.">
        <p style={{ color: 'var(--text-2)' }}>Open the link from your email again, or request a new one.</p>
        <Link to="/forgot-password">Request a new link →</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <>
          <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      <FormAlert>
        {error && (
          <>
            {error} {error.includes('expired') && <Link to="/forgot-password">Request a new link</Link>}
          </>
        )}
      </FormAlert>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthField
          id="reset-password"
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={onChange}
          onBlur={onBlur}
          error={show('password')}
          hint="6–72 characters"
        />
        <AuthField
          id="reset-confirm"
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={onChange}
          onBlur={onBlur}
          error={show('confirm')}
        />
        <Button type="submit" block disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;

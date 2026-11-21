import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout, { AuthField, FormAlert } from '../components/AuthLayout';
import Button from '../components/Button';
import { login } from '../services/authService';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(
    searchParams.get('expired') ? 'Your session has expired. Please sign in again.' : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const notice = searchParams.get('reset') ? 'Password updated. Sign in with your new password.' : '';

  const errors = validate(form);
  const show = (f) => (touched[f] || submitted ? errors[f] : undefined);
  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };
  const onBlur = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setError('');
    setIsLoading(true);
    try {
      await login(form.email.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track your applications"
      footer={
        <>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </>
      }
    >
      <FormAlert type="success">{notice}</FormAlert>
      <FormAlert>{error}</FormAlert>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthField
          id="login-email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={onChange}
          onBlur={onBlur}
          error={show('email')}
          required
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AuthField
            id="login-password"
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={onChange}
            onBlur={onBlur}
            error={show('password')}
            required
          />
          <Link to="/forgot-password" style={{ alignSelf: 'flex-end', fontSize: '0.875rem', fontWeight: 600 }}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" block disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Login;

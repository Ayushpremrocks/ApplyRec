import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout, { AuthField, FormAlert } from '../components/AuthLayout';
import Button from '../components/Button';
import { signup } from '../services/authService';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup({ email, password, confirmPassword }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Choose a password';
  else if (password.length < 6) errors.password = 'Use at least 6 characters';
  else if (password.length > 72) errors.password = 'Use at most 72 characters';
  if (!confirmPassword) errors.confirmPassword = 'Repeat your password';
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match";
  return errors;
}

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const errors = validateSignup(form);
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
    setIsLoading(true);
    try {
      await signup(form.email.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your applications — it's free"
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <FormAlert>{error}</FormAlert>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthField
          id="signup-email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={onChange}
          onBlur={onBlur}
          error={show('email')}
        />
        <AuthField
          id="signup-password"
          label="Password"
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
          id="signup-confirm"
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={show('confirmPassword')}
        />
        <Button type="submit" block disabled={isLoading}>
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Signup;

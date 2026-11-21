import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout, { AuthField, FormAlert } from '../components/AuthLayout';
import Button from '../components/Button';
import { requestPasswordReset } from '../services/authService';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fieldError = !email.trim() ? 'Enter your email' : !EMAIL.test(email.trim()) ? 'Enter a valid email address' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (fieldError) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await requestPasswordReset(email.trim());
      setSent(res.message);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      {sent ? (
        <>
          <FormAlert type="success">{sent}</FormAlert>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}>
            The link expires in 30 minutes. Check your spam folder if it doesn't arrive.
          </p>
          <Button variant="secondary" block onClick={() => setSent('')}>
            Send another link
          </Button>
        </>
      ) : (
        <>
          <FormAlert>{error}</FormAlert>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AuthField
              id="forgot-email"
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              error={touched ? fieldError : undefined}
            />
            <Button type="submit" block disabled={isLoading}>
              {isLoading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;

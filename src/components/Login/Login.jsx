import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = ({ onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Use the global auth context
  const { currentUser, logout, isAuthenticated } = useAuth();

  // Redirect to homepage if user is authenticated and verified
  useEffect(() => {
    if (isAuthenticated) {
      onBack(); // This will take them back to homepage
    }
  }, [isAuthenticated, onBack]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        // Sign up validation
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match!');
        }
        if (!username || !email || !password) {
          throw new Error('Please fill in all fields!');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long!');
        }

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update the user's display name
        await updateProfile(userCredential.user, {
          displayName: username
        });

        // Send email verification
        await sendEmailVerification(userCredential.user);
        setVerificationSent(true);

        // Reset form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        alert('Account created successfully! Please check your email and click the verification link before signing in.');
        
      } else {
        // Sign in - use email instead of username for Firebase
        if (!email || !password) {
          throw new Error('Please enter email and password!');
        }
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
        }

        // If we get here, user is authenticated and verified
        // The useEffect will handle the redirect
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google login successful:', result.user.email);
      // The useEffect will handle the redirect since Google accounts are automatically verified
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      // Reset form states
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setVerificationSent(false);
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      await sendEmailVerification(currentUser);
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Resend verification error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;
    
    setCheckingVerification(true);
    setError('');
    
    try {
      // Reload user to get latest verification status
      await reload(currentUser);
      
      if (currentUser.emailVerified) {
        alert('Email verified successfully! Welcome to TextToTube!');
        // The useEffect will handle the redirect
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      console.error('Check verification error:', error);
      setError(error.message);
    } finally {
      setCheckingVerification(false);
    }
  };

  // Show verification pending screen if user exists but email not verified
  if (currentUser && !currentUser.emailVerified) {
    return (
      <div className="login-page">
        <div className="login-container">
          <button className="back-button" onClick={handleSignOut}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>

          <div className="login-form-container">
            <div className="login-header">
              <h1 className="app-title">TextToTube</h1>
              <h2>Verify Your Email</h2>
              <p>We've sent a verification link to {currentUser.email}</p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#ff6b6b',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{
                background: 'rgba(57, 255, 20, 0.1)',
                border: '1px solid rgba(57, 255, 20, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 15px', display: 'block' }}>
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', margin: '0 0 10px 0' }}>
                  Check your email inbox
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0' }}>
                  Click the verification link to activate your account
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="submit-btn" 
                  onClick={handleCheckVerification}
                  disabled={checkingVerification}
                >
                  {checkingVerification ? 'Checking...' : 'I\'ve Verified My Email'}
                </button>
                
                <button 
                  className="social-btn" 
                  onClick={handleResendVerification}
                  disabled={loading}
                  style={{ 
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: '#00d4ff'
                  }}
                >
                  {loading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                Didn't receive the email? Check your spam folder or click resend.
              </p>
              <p style={{ margin: '0' }}>
                You can close this tab after clicking the verification link.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Back button */}
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <div className="login-form-container">
          <div className="login-header">
            <h1 className="app-title">TextToTube</h1>
            <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p>{isSignUp ? 'Join us today and start your learning journey' : 'Sign in to continue your learning journey'}</p>
          </div>

          {/* Success message for verification sent */}
          {verificationSent && (
            <div style={{
              background: 'rgba(57, 255, 20, 0.1)',
              border: '1px solid rgba(57, 255, 20, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#39ff14',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Account created! Please check your email and click the verification link.
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#ff6b6b',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="form-input"
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isSignUp ? 'Enter your email' : 'Enter your email'}
                className="form-input"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
                disabled={loading}
                required
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="social-login">
            <button 
              type="button"
              className="social-btn google-btn" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.78 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C15.24 23 17.95 21.92 19.28 20.34L15.71 17.57C14.74 18.22 13.48 18.62 12 18.62C8.91 18.62 6.26 16.65 5.4 13.9H1.67V16.74C2.99 19.36 7.24 23 12 23Z" fill="#34A853"/>
                <path d="M5.4 13.9C5.18 13.25 5.05 12.55 5.05 11.85C5.05 11.15 5.18 10.45 5.4 9.8V6.96H1.67C0.95 8.39 0.55 10.08 0.55 11.85C0.55 13.62 0.95 15.31 1.67 16.74L5.4 13.9Z" fill="#FBBC05"/>
                <path d="M12 4.98C13.67 4.98 15.16 5.54 16.32 6.65L19.5 3.47C17.95 2.02 15.24 0.98 12 0.98C7.24 0.98 2.99 4.62 1.67 7.24L5.4 10.08C6.26 7.33 8.91 5.36 12 5.36V4.98Z" fill="#EA4335"/>
              </svg>
              {loading ? 'Please wait...' : 'Continue with Google'}
            </button>
          </div>

          <div className="toggle-form">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button" 
                className="toggle-btn" 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setUsername('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setVerificationSent(false);
                }}
                disabled={loading}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}!
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
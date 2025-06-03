import React, { useState } from 'react';
import './Login.css';

const Login = ({ onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isSignUp) {
      // Sign up validation
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
      if (!username || !email || !password) {
        alert('Please fill in all fields!');
        return;
      }
      // For now, just show success and redirect to login
      alert('Account created successfully! Please sign in.');
      setIsSignUp(false);
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } else {
      // Sign in - accept any input for now
      if (!username || !password) {
        alert('Please enter username and password!');
        return;
      }
      // Set logged in state to show empty dashboard
      setIsLoggedIn(true);
    }
  };

  const handleGoogleLogin = () => {
    alert('Google login coming soon!');
  };

  const handleGithubLogin = () => {
    alert('GitHub login coming soon!');
  };

  // Show empty dashboard after login
  if (isLoggedIn) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome to your Dashboard!</h1>
          <button className="back-btn" onClick={onBack}>
            Back to Home
          </button>
        </div>
        <div className="dashboard-content">
          <p>Dashboard content will be added here later...</p>
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

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="form-input"
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
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
                />
              </div>
            )}

            <button type="submit" className="submit-btn">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="social-login">
            <button className="social-btn google-btn" onClick={handleGoogleLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.78 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C15.24 23 17.95 21.92 19.28 20.34L15.71 17.57C14.74 18.22 13.48 18.62 12 18.62C8.91 18.62 6.26 16.65 5.4 13.9H1.67V16.74C2.99 19.36 7.24 23 12 23Z" fill="#34A853"/>
                <path d="M5.4 13.9C5.18 13.25 5.05 12.55 5.05 11.85C5.05 11.15 5.18 10.45 5.4 9.8V6.96H1.67C0.95 8.39 0.55 10.08 0.55 11.85C0.55 13.62 0.95 15.31 1.67 16.74L5.4 13.9Z" fill="#FBBC05"/>
                <path d="M12 4.98C13.67 4.98 15.16 5.54 16.32 6.65L19.5 3.47C17.95 2.02 15.24 0.98 12 0.98C7.24 0.98 2.99 4.62 1.67 7.24L5.4 10.08C6.26 7.33 8.91 5.36 12 5.36V4.98Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button className="social-btn github-btn" onClick={handleGithubLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12C0 17.31 3.435 21.795 8.205 23.385C8.805 23.49 9.03 23.13 9.03 22.815C9.03 22.53 9.015 21.585 9.015 20.58C6 21.135 5.22 19.845 4.98 19.17C4.845 18.825 4.26 17.76 3.75 17.475C3.33 17.25 2.73 16.695 3.735 16.68C4.68 16.665 5.355 17.55 5.58 17.91C6.66 19.725 8.385 19.215 9.075 18.9C9.18 18.12 9.495 17.595 9.84 17.295C7.17 16.995 4.38 15.96 4.38 11.37C4.38 10.065 4.845 8.985 5.61 8.145C5.49 7.845 5.07 6.615 5.73 4.965C5.73 4.965 6.735 4.65 9.03 6.195C9.99 5.925 11.01 5.79 12.03 5.79C13.05 5.79 14.07 5.925 15.03 6.195C17.325 4.635 18.33 4.965 18.33 4.965C18.99 6.615 18.57 7.845 18.45 8.145C19.215 8.985 19.68 10.05 19.68 11.37C19.68 15.975 16.875 16.995 14.205 17.295C14.64 17.67 15.015 18.39 15.015 19.515C15.015 21.12 15 22.41 15 22.815C15 23.13 15.225 23.505 15.825 23.385C20.565 21.795 24 17.295 24 12C24 5.37 18.63 0 12 0Z" fill="currentColor"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="toggle-form">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button" 
                className="toggle-btn" 
                onClick={() => setIsSignUp(!isSignUp)}
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
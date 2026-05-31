/* ========================================
   CyneMora — Signup Page
   Cinema-grade registration
   ======================================== */

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "../auth.module.css";

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle, loading, error, clearError } =
    useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Full name is required.");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await signUpWithEmail(email, password, name.trim());
      router.push("/dashboard");
    } catch {
      // Error is handled by auth context
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    clearError();
    setValidationError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      // Error is handled by auth context
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = loading || submitting;
  const displayError = error || validationError;

  return (
    <div className={styles.authPage}>
      {/* Background Effects */}
      <div className={styles.authBg}>
        <div className={styles.authGrid} />
        <div className={styles.authOrb1} />
        <div className={styles.authOrb2} />
      </div>

      {/* Auth Card */}
      <div className={styles.authCard}>
        <Link href="/" className={styles.backLink}>
          ← Back to CyneMora
        </Link>

        {/* Logo */}
        <div className={styles.authLogo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img src="/icon-192x192.png" alt="CyneMora Logo" width={40} height={40} style={{ borderRadius: '10px' }} />
          CyneMora
        </div>
        <p className={styles.authTagline}>
          Cinema-Native Production OS
        </p>

        <h1 className={styles.authTitle}>Create Your Account</h1>

        {/* Google Sign In */}
        <button
          className={styles.googleBtn}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          type="button"
          id="google-signup"
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className={styles.authDivider}>
          <span className={styles.authDividerText}>or</span>
        </div>

        {/* Error Display */}
        {displayError && <div className={styles.authError}>{displayError}</div>}

        {/* Email Form */}
        <form className={styles.authForm} onSubmit={handleEmailSubmit}>
          <div className={styles.authFieldGroup}>
            <label htmlFor="name" className={styles.authLabel}>
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className={styles.authInput}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          <div className={styles.authFieldGroup}>
            <label htmlFor="email" className={styles.authLabel}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.authInput}
              placeholder="director@cynemora.us"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.authFieldGroup}>
            <label htmlFor="password" className={styles.authLabel}>
              Password
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={styles.authInput}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  outline: "none"
                }}
                tabIndex={-1}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <div className={styles.authFieldGroup}>
            <label htmlFor="confirmPassword" className={styles.authLabel}>
              Confirm Password
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className={styles.authInput}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  outline: "none"
                }}
                tabIndex={-1}
              >
                {showConfirmPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.authSubmit}
            disabled={isLoading}
            id="email-signup"
          >
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.authFooter}>
          Already have an account?{" "}
          <Link href="/login" className={styles.authLink}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

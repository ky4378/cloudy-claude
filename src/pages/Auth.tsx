import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useConvex, useQuery } from "convex/react";
import { GlassBackdrop } from "@/components/pilot/GlassBackdrop";
import { PilotLogo } from "@/components/pilot/BrandMark";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

type AuthMode = "signup" | "login";

type Step =
  | { kind: "signIn" }
  | { kind: "reset" }
  | { kind: "resetCode"; email: string }
  | { kind: "verifyEmail"; email: string };

interface AuthProps {
  redirectAfterAuth?: string;
  initialMode?: AuthMode;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

// 0..4 — mirrors the server-side rules (8+ chars, letter, number) plus
// uppercase-mix and symbols as the "good password" stretch goals.
function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function passwordIsValid(password: string) {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

const STRENGTH_TIERS = [
  { label: "Too short", bar: "bg-rose-400", text: "text-rose-500" },
  { label: "Weak", bar: "bg-rose-400", text: "text-rose-500" },
  { label: "Okay", bar: "bg-amber-400", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

// The auth library surfaces its own error strings (InvalidSecret,
// InvalidAccountId, TooManyFailedAttempts, "Account … already exists", …).
// Map them to friendly copy, falling back to a generic message.
function friendlyAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const m = message.toLowerCase();
  if (
    m.includes("invalidsecret") ||
    m.includes("invalid credentials") ||
    m.includes("invalid password") ||
    m.includes("incorrect")
  ) {
    return "Incorrect email or password.";
  }
  if (
    m.includes("toomanyfailedattempts") ||
    m.includes("too many failed attempts")
  ) {
    return "Too many failed attempts. Please wait a few minutes and try again.";
  }
  if (m.includes("invalidaccountid") || m.includes("account not found")) {
    return "No account found for this email.";
  }
  if (m.includes("already exists")) {
    return "An account with this email already exists. Log in instead.";
  }
  if (m.includes("invalid code")) {
    return "The code you entered is incorrect or has expired.";
  }
  if (m.includes("at least 8")) {
    return "Password must be at least 8 characters long.";
  }
  if (m.includes("letter and one number")) {
    return "Password must include at least one letter and one number.";
  }
  return fallback;
}

function Requirement({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span
      className={`flex items-center gap-1 ${ok ? "text-emerald-600" : "text-secondary-text/70"}`}
    >
      <span
        className={`inline-flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold ${
          ok ? "bg-emerald-100 text-emerald-600" : "bg-cream text-secondary-text/70"
        }`}
      >
        {ok ? "✓" : "•"}
      </span>
      {children}
    </span>
  );
}

function Auth({ redirectAfterAuth, initialMode }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, signOut } =
    useAuth();
  const convex = useConvex();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnToParam = searchParams.get("returnTo");
  const redirect = resolveRedirectAfterAuth(
    returnToParam,
    redirectAfterAuth,
  );
  const mode: AuthMode =
    initialMode ?? (searchParams.get("mode") === "login" ? "login" : "signup");

  const business = useQuery(api.businesses.myBusiness);
  const [step, setStep] = useState<Step>({ kind: "signIn" });
  const [resetSuccess, setResetSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{
    label: string;
    to: string;
  } | null>(null);

  const returnToQuery = returnToParam
    ? `?returnTo=${encodeURIComponent(returnToParam)}`
    : "";
  const toSignup = `/signup${returnToQuery}`;
  const toLogin = `/login${returnToQuery}`;

  const score = passwordScore(password);
  const strength = STRENGTH_TIERS[Math.min(score, 4)];
  const passwordsMatch = confirmPassword === "" || confirmPassword === password;

  // Switching between sign-up and log-in resets the in-flight flow.
  useEffect(() => {
    setStep({ kind: "signIn" });
    setAcceptedTerms(false);
    setPassword("");
    setConfirmPassword("");
    setResetCode("");
    setError(null);
    setErrorAction(null);
    setResetSuccess(false);
    setCodeSent(false);
  }, [mode]);

  // Route authenticated users: brand-new accounts (no business profile yet)
  // go straight to the onboarding questionnaire; existing accounts go to
  // their destination. A user who already has a saved business never gets
  // sent back to the questionnaire — even if the returnTo target was
  // /onboarding — they go to their dashboard/calendar instead.
  useEffect(() => {
    // Never auto-navigate while the user is mid password-reset: after a
    // successful reset we show a confirmation and send them to the login
    // page, not into the app. Never auto-navigate while they're in the middle
    // of signing up or logging in (even if somehow they're already authenticated).
    if (step.kind !== "signIn") return;
    if (resetSuccess) return;
    if (isLoading || email || password) return; // user is actively filling a form
    if (authLoading || !isAuthenticated) return;
    if (business === undefined) return; // profile still loading
    const hasBusiness = business !== null;
    const destination = !hasBusiness
      ? "/onboarding"
      : redirect === "/onboarding"
        ? "/dashboard"
        : redirect;
    navigate(destination, { replace: true });
  }, [authLoading, isAuthenticated, business, navigate, redirect, resetSuccess, step.kind, isLoading, email, password]);

  const handleSignUpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setErrorAction(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!acceptedTerms) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy to continue.",
      );
      return;
    }
    if (!passwordIsValid(password)) {
      setError(
        "Password must be at least 8 characters and include a letter and a number.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    try {
      // An account with this email already has a password — they must log in.
      const exists = await convex.query(api.account.emailAccountExists, {
        email: normalizedEmail,
      });
      if (exists) {
        setError("An account with this email already exists. Log in instead.");
        setErrorAction({ label: "Log in", to: toLogin });
        setIsLoading(false);
        return;
      }
      const result = await signIn("password", {
        flow: "signUp",
        email: normalizedEmail,
        password,
        ...(name.trim() !== "" ? { name: name.trim() } : {}),
      });
      // Email verification is required: the account is created and a code
      // was emailed, but no session is started until the code is confirmed.
      if (result && result.signingIn === false) {
        setStep({ kind: "verifyEmail", email: normalizedEmail });
        setIsLoading(false);
        return;
      }
      // Session confirmed — the effect above navigates once auth state lands.
      setIsLoading(false);
    } catch (error) {
      console.error("Sign-up error:", error);
      const message = friendlyAuthError(
        error,
        "Failed to create your account. Please try again.",
      );
      if (message.includes("already exists")) {
        setErrorAction({ label: "Log in", to: toLogin });
      }
      setError(message);
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setErrorAction(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setIsLoading(true);
    try {
      const exists = await convex.query(api.account.emailAccountExists, {
        email: normalizedEmail,
      });
      if (!exists) {
        setError(
          "We couldn't find an account for this email. Create one instead.",
        );
        setErrorAction({ label: "Create account", to: toSignup });
        setIsLoading(false);
        return;
      }
      // Only a correct password creates a session — wrong passwords are
      // rejected server-side against the stored (hashed) credential.
      const result = await signIn("password", {
        flow: "signIn",
        email: normalizedEmail,
        password,
      });
      // Account exists but its email was never verified — a code is sent
      // instead of a session, so route the user through verification.
      if (result && result.signingIn === false) {
        setStep({ kind: "verifyEmail", email: normalizedEmail });
        setIsLoading(false);
        return;
      }
      // Login successful — clear form so navigation effect triggers.
      setEmail("");
      setPassword("");
      setIsLoading(false);
    } catch (error) {
      console.error("Login error:", error);
      setError(friendlyAuthError(error, "Incorrect email or password."));
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setErrorAction(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      const exists = await convex.query(api.account.emailAccountExists, {
        email: normalizedEmail,
      });
      if (!exists) {
        setError(
          "We couldn't find an account for this email. Create one instead.",
        );
        setErrorAction({ label: "Create account", to: toSignup });
        setIsLoading(false);
        return;
      }
      await signIn("password", { flow: "reset", email: normalizedEmail });
      setStep({ kind: "resetCode", email: normalizedEmail });
      setIsLoading(false);
    } catch (error) {
      console.error("Password reset request error:", error);
      const message = friendlyAuthError(
        error,
        "Couldn't send a reset code. Please try again.",
      );
      if (message.includes("No account found")) {
        setError(
          "We couldn't find a password for this account. If you signed up with an email code, log in with your email and password — or create a new account.",
        );
        setErrorAction({ label: "Back to log in", to: toLogin });
      } else {
        setError(message);
      }
      setIsLoading(false);
    }
  };

  const handleResetCodeSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);
    setErrorAction(null);
    if (!passwordIsValid(password)) {
      setError(
        "Password must be at least 8 characters and include a letter and a number.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (resetCode.length < 4) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    // Flag the reset BEFORE the auth call: signIn flips isAuthenticated as
    // soon as it resolves, and the navigation effect must see this guard.
    setResetSuccess(true);
    setIsLoading(true);
    try {
      await signIn("password", {
        flow: "reset-verification",
        email: step.kind === "resetCode" ? step.email : "",
        code: resetCode,
        newPassword: password,
      });
      // Password reset successful — show confirmation, then sign out and
      // go to the login page so they log in with the new password.
      setIsLoading(false);
      setTimeout(() => {
        void signOut().then(() => {
          setStep({ kind: "signIn" });
          setResetSuccess(false);
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setResetCode("");
          navigate(toLogin, { replace: true });
        });
      }, 2500);
    } catch (error) {
      console.error("Password reset error:", error);
      setError(
        friendlyAuthError(
          error,
          "Couldn't reset your password. Please try again.",
        ),
      );
      setIsLoading(false);
      setResetCode("");
      setResetSuccess(false);
    }
  };

  // Confirm the 6-digit email-verification code sent after sign-up (or after
  // logging into an unverified account). On success a session is created and
  // the auth-state effect navigates to onboarding / dashboard.
  const handleVerifyEmailSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);
    setErrorAction(null);
    if (step.kind !== "verifyEmail") return;
    if (resetCode.length < 4) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setIsLoading(true);
    try {
      await signIn("password", {
        flow: "email-verification",
        email: step.email,
        code: resetCode,
      });
      // Session confirmed. Move back to the sign-in step so the navigation
      // effect (which only runs when step.kind === "signIn") sends the user
      // to the onboarding questionnaire or their dashboard. Clear email/password
      // so the navigation effect isn't blocked by the "user is filling a form" guard.
      // Without this the user stays on the verify screen even though they're signed in.
      setStep({ kind: "signIn" });
      setEmail("");
      setPassword("");
      setResetCode("");
      setIsLoading(false);
    } catch (error) {
      console.error("Email verification error:", error);
      setError(
        friendlyAuthError(
          error,
          "The code you entered is incorrect or has expired. Try again.",
        ),
      );
      setIsLoading(false);
      setResetCode("");
    }
  };

  const handleResendVerification = async () => {
    if (step.kind !== "verifyEmail") return;
    setError(null);
    setErrorAction(null);
    setIsLoading(true);
    try {
      // Re-run the sign-up flow for the same email — the account already
      // exists, so the provider emails a fresh verification code.
      await signIn("password", {
        flow: "signUp",
        email: step.email,
        password,
      });
      setCodeSent(true);
      setError(null);
      setIsLoading(false);
    } catch (error) {
      console.error("Resend verification error:", error);
      setError(
        friendlyAuthError(
          error,
          "Couldn't send a new code. Please try again.",
        ),
      );
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    setErrorAction(null);
    try {
      await signIn("anonymous");
      // Session confirmed — the effect above navigates once auth state lands.
      setIsLoading(false);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  const passwordField = (
    field: "password" | "confirm",
    placeholder: string,
    autoComplete: string,
  ) => {
    const value = field === "password" ? password : confirmPassword;
    const onChange = (v: string) =>
      field === "password" ? setPassword(v) : setConfirmPassword(v);
    return (
      <div className="relative">
        <Lock className="absolute top-3 left-3 h-4 w-4 text-secondary-text/70" />
        <Input
          name={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          className="h-11 rounded-xl border-hairline bg-white pl-10 pr-10"
          disabled={isLoading}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-secondary-text/70 transition hover:text-ink"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <GlassBackdrop />

      {/* Auth Content */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="glass-panel w-full max-w-md rounded-3xl pb-0">
          {(step.kind === "signIn" ? (
            <>
              <div className="px-7 pt-8 text-center">
                <button
                  onClick={() => navigate("/")}
                  className="mx-auto block cursor-pointer"
                  aria-label="Back to home"
                >
                  <PilotLogo size="lg" />
                </button>

                <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-cream/70 p-1">
                  <button
                    type="button"
                    onClick={() => navigate(toSignup)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      mode === "signup"
                        ? "bg-white text-ink shadow-sm"
                        : "text-secondary-text hover:text-ink"
                    }`}
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(toLogin)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      mode === "login"
                        ? "bg-white text-ink shadow-sm"
                        : "text-secondary-text hover:text-ink"
                    }`}
                  >
                    Log in
                  </button>
                </div>

                <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">
                  {mode === "login" ? "Welcome back" : "Create your Cloudy account"}
                </h1>
                <p className="mt-1.5 text-sm text-secondary-text">
                  {mode === "login"
                    ? "Your business and 30-day plan are saved to your account — pick up where you left off."
                    : "Create your account — your business and 30-day plan are saved to your account."}
                </p>
              </div>

              {mode === "signup" ? (
                <form onSubmit={handleSignUpSubmit} className="px-7 pt-5">
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                  >
                    Your name{" "}
                    <span className="font-normal normal-case tracking-normal text-secondary-text/70">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <User className="absolute top-3 left-3 h-4 w-4 text-secondary-text/70" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Tan"
                      autoComplete="name"
                      className="h-11 rounded-xl border-hairline bg-white pl-10"
                      disabled={isLoading}
                    />
                  </div>

                  <label
                    htmlFor="email"
                    className="mt-4 mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 h-4 w-4 text-secondary-text/70" />
                    <Input
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      className="h-11 rounded-xl border-hairline bg-white pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                    >
                      Create a password
                    </label>
                    <span
                      className={`mb-1.5 text-[11px] font-semibold ${strength.text}`}
                    >
                      {password ? strength.label : ""}
                    </span>
                  </div>
                  {passwordField(
                    "password",
                    "8+ characters with a letter and a number",
                    "new-password",
                  )}
                  {password.length > 0 && (
                    <>
                      <div className="mt-2 flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < Math.min(score, 4)
                                ? strength.bar
                                : "bg-cream"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                        <Requirement ok={password.length >= 8}>
                          8+ characters
                        </Requirement>
                        <Requirement ok={/[A-Za-z]/.test(password)}>
                          A letter
                        </Requirement>
                        <Requirement ok={/\d/.test(password)}>
                          A number
                        </Requirement>
                      </div>
                    </>
                  )}

                  <label
                    htmlFor="confirm-password"
                    className="mt-4 mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                  >
                    Confirm password
                  </label>
                  {passwordField(
                    "confirm",
                    "Re-enter your password",
                    "new-password",
                  )}
                  {!passwordsMatch && (
                    <p className="mt-1.5 text-xs text-rose-500">
                      Passwords don&apos;t match.
                    </p>
                  )}

                  {error && (
                    <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                      <p>{error}</p>
                      {errorAction && (
                        <Link
                          to={errorAction.to}
                          className="mt-1 inline-block font-semibold text-rose-700 underline-offset-2 hover:underline"
                        >
                          {errorAction.label} →
                        </Link>
                      )}
                    </div>
                  )}

                  <label className="mt-5 flex cursor-pointer items-start gap-2.5">
                    <Checkbox
                      checked={acceptedTerms}
                      onCheckedChange={(value) =>
                        setAcceptedTerms(value === true)
                      }
                      className="mt-0.5 border-hairline bg-white data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                      aria-label="I agree to the Terms & Conditions and Privacy Policy"
                    />
                    <span className="text-xs leading-relaxed text-secondary-text">
                      I agree to Cloudy's{" "}
                      <Link
                        to="/terms"
                        className="font-semibold text-forest-700 underline-offset-2 hover:underline"
                      >
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/privacy"
                        className="font-semibold text-forest-700 underline-offset-2 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <Button
                    type="submit"
                    className="mt-5 h-11 w-full rounded-xl"
                    disabled={
                      isLoading ||
                      !acceptedTerms ||
                      !passwordIsValid(password) ||
                      password !== confirmPassword
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="mt-5">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-hairline" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white/70 px-3 text-xs uppercase tracking-wider text-secondary-text">
                          Or
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 h-11 w-full rounded-xl border-hairline bg-white hover:bg-cream"
                      onClick={handleGuestLogin}
                      disabled={isLoading || !acceptedTerms}
                    >
                      <UserX className="mr-2 h-4 w-4 text-secondary-text" />
                      Continue as guest
                    </Button>
                  </div>
                  <p className="mt-5 pb-6 text-center text-xs leading-relaxed text-secondary-text">
                    <Sparkles className="mr-1 inline size-3.5 text-forest-500" />
                    Try the full product with a one-tap guest account.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} className="px-7 pt-5">
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 h-4 w-4 text-secondary-text/70" />
                    <Input
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      className="h-11 rounded-xl border-hairline bg-white pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setErrorAction(null);
                        setStep({ kind: "reset" });
                      }}
                      className="mb-1.5 text-xs font-semibold text-forest-700 underline-offset-2 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {passwordField("password", "Your password", "current-password")}

                  {error && (
                    <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                      <p>{error}</p>
                      {errorAction && (
                        <Link
                          to={errorAction.to}
                          className="mt-1 inline-block font-semibold text-rose-700 underline-offset-2 hover:underline"
                        >
                          {errorAction.label} →
                        </Link>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="mt-5 h-11 w-full rounded-xl"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Log in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="mt-5 pb-6 text-center text-xs leading-relaxed text-secondary-text">
                    New to Cloudy?{" "}
                    <Link
                      to={toSignup}
                      className="font-semibold text-forest-700 hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </form>
              )}
            </>
          ) : step.kind === "reset" ? (
            <>
              <div className="px-7 pt-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-ink text-white">
                  <KeyRound className="size-5" />
                </div>
                <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">
                  Reset your password
                </h1>
                <p className="mt-1.5 text-sm text-secondary-text">
                  We&apos;ll email you a 6-digit code. Enter it with your new
                  password to sign back in.
                </p>
              </div>
              <form onSubmit={handleResetSubmit} className="px-7 pt-5">
                <label
                  htmlFor="reset-email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-secondary-text/70" />
                  <Input
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    className="h-11 rounded-xl border-hairline bg-white pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
                {error && (
                  <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    <p>{error}</p>
                    {errorAction && (
                      <Link
                        to={errorAction.to}
                        className="mt-1 inline-block font-semibold text-rose-700 underline-offset-2 hover:underline"
                      >
                        {errorAction.label} →
                      </Link>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  className="mt-5 h-11 w-full rounded-xl"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send reset code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep({ kind: "signIn" })}
                  disabled={isLoading}
                  className="mt-2 mb-6 w-full rounded-xl text-secondary-text"
                >
                  Back to log in
                </Button>
              </form>
            </>
          ) : step.kind === "verifyEmail" ? (
            <>
              <div className="px-7 pt-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-ink text-white">
                  <Mail className="size-5" />
                </div>
                <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">
                  Verify your email
                </h1>
                <p className="mt-1.5 text-sm text-secondary-text">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-ink">{step.email}</span>
                  . Enter it below to finish creating your account.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-secondary-text">
                  Didn&apos;t receive it? Check your spam or promotions folder,
                  then tap{" "}
                  <span className="font-semibold text-secondary-text">Resend code</span>
                  .
                </p>
              </div>
              <form
                onSubmit={handleVerifyEmailSubmit}
                className="px-7 pt-5"
              >
                <label
                  htmlFor="verify-code"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                >
                  Verification code
                </label>
                <Input
                  id="verify-code"
                  value={resetCode}
                  onChange={(e) =>
                    setResetCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="h-11 rounded-xl border-hairline bg-white text-center text-lg tracking-[0.3em]"
                  disabled={isLoading}
                  required
                />

                {error && (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">
                    {error}
                  </p>
                )}
                {codeSent && !error && (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700">
                    A new verification code has been sent to your email.
                  </p>
                )}

                <Button
                  type="submit"
                  className="mt-5 h-11 w-full rounded-xl"
                  disabled={isLoading || resetCode.length < 4}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Verify &amp; continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleResendVerification()}
                  disabled={isLoading}
                  className="mt-2 w-full rounded-xl text-secondary-text"
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep({ kind: "signIn" })}
                  disabled={isLoading}
                  className="mt-0 mb-6 w-full rounded-xl text-secondary-text"
                >
                  Use a different email
                </Button>
              </form>
            </>
          ) : step.kind === "resetCode" ? (
            <>
              <div className="px-7 pt-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-ink text-white">
                  <KeyRound className="size-5" />
                </div>
                <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink">
                  Choose a new password
                </h1>
                <p className="mt-1.5 text-sm text-secondary-text">
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-semibold text-ink">{step.email}</span>{" "}
                  and your new password.
                </p>
              </div>
              <form onSubmit={handleResetCodeSubmit} className="px-7 pt-5">
                <label
                  htmlFor="reset-code"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                >
                  Verification code
                </label>
                <Input
                  id="reset-code"
                  value={resetCode}
                  onChange={(e) =>
                    setResetCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="h-11 rounded-xl border-hairline bg-white text-center text-lg tracking-[0.3em]"
                  disabled={isLoading}
                  required
                />

                <label
                  htmlFor="reset-password"
                  className="mt-4 mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                >
                  New password
                </label>
                {passwordField(
                  "password",
                  "8+ characters with a letter and a number",
                  "new-password",
                )}
                {password.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                    <Requirement ok={password.length >= 8}>
                      8+ characters
                    </Requirement>
                    <Requirement ok={/[A-Za-z]/.test(password)}>
                      A letter
                    </Requirement>
                    <Requirement ok={/\d/.test(password)}>
                      A number
                    </Requirement>
                  </div>
                )}

                <label
                  htmlFor="reset-confirm"
                  className="mt-4 mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-text"
                >
                  Confirm new password
                </label>
                {passwordField(
                  "confirm",
                  "Re-enter your new password",
                  "new-password",
                )}
                {!passwordsMatch && (
                  <p className="mt-1.5 text-xs text-rose-500">
                    Passwords don&apos;t match.
                  </p>
                )}

                {error && (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">
                    {error}
                  </p>
                )}
                {resetSuccess && (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-emerald-700">
                      ✓ Password reset successfully!
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">
                      Redirecting you to log in…
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  className="mt-5 h-11 w-full rounded-xl"
                  disabled={
                    isLoading ||
                    resetSuccess ||
                    !passwordIsValid(password) ||
                    password !== confirmPassword ||
                    resetCode.length < 4
                  }
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Set new password
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep({ kind: "reset" })}
                  disabled={isLoading}
                  className="mt-2 mb-6 w-full rounded-xl text-secondary-text"
                >
                  Use a different email
                </Button>
              </form>
            </>
          ) : (
            null
          ))}

          <div className="border-t border-hairline bg-cream/50 px-6 py-4 text-center text-xs text-secondary-text">
            <Link
              to="/privacy"
              className="font-medium text-secondary-text underline-offset-2 hover:text-forest-700 hover:underline"
            >
              Privacy
            </Link>
            <span className="mx-2">·</span>
            <Link
              to="/terms"
              className="font-medium text-secondary-text underline-offset-2 hover:text-forest-700 hover:underline"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}

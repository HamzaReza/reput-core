"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";

// 5 steps: 1=account, 2=otp, 3=information, 4=linkedin, 5=notifications
type Step = 1 | 2 | 3 | 4 | 5;

const MOCK_PROFILES = [
  { initials: "JD", bg: "linear-gradient(135deg, #4ECDC4, #2BABA0)", name: "John Doe", title: "CEO · London, UK" },
  { initials: "JD", bg: "linear-gradient(135deg, #7B6CF6, #5A4BD1)", name: "Jonathan Davies", title: "Financial Analyst · New York, US" },
  { initials: "JD", bg: "linear-gradient(135deg, #FF8C42, #E06A1A)", name: "James Douglas", title: "Marketing Director · Berlin, DE" },
];

const NATIONALITIES = [
  "Afghan","Albanian","Algerian","American","Argentine","Australian","Austrian",
  "Belgian","Brazilian","British","Bulgarian","Canadian","Chilean","Chinese",
  "Colombian","Croatian","Czech","Danish","Dutch","Egyptian","Finnish","French",
  "German","Greek","Hungarian","Indian","Indonesian","Iranian","Iraqi","Irish",
  "Israeli","Italian","Japanese","Jordanian","Kenyan","Korean","Lebanese",
  "Malaysian","Mexican","Moroccan","New Zealander","Nigerian","Norwegian",
  "Pakistani","Peruvian","Philippine","Polish","Portuguese","Romanian","Russian",
  "Saudi","Serbian","Singaporean","South African","Spanish","Swedish","Swiss",
  "Thai","Turkish","Ukranian","Emirati","Venezuelan","Vietnamese",
];

const PROGRESS_TOTAL = 5;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "rgba(13,17,23,0.6)",
  color: "var(--color-foreground)",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--color-foreground)",
  marginBottom: "0.5rem",
};

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div
      className="grid-bg"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", backgroundColor: "var(--color-background)" }}
    >
      <Header />
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5.5rem 1rem 3rem" }}>
        <div style={{ width: "100%", maxWidth: "28rem" }}>
          <div className="glass" style={{ borderRadius: "0.875rem", padding: "2rem" }}>
            <div style={{ display: "flex", gap: "0.375rem", marginBottom: "2rem" }}>
              {Array.from({ length: PROGRESS_TOTAL }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: "0.3rem", borderRadius: "9999px",
                    backgroundColor: i < step ? "#4ECDC4" : "rgba(255,255,255,0.1)",
                    transition: "background-color 0.3s",
                  }}
                />
              ))}
            </div>
            {children}
          </div>
        </div>
      </main>
      <footer style={{ padding: "2rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--color-surface)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
          <p>&copy; 2025 RepuTrust. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3 — personal info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [dob, setDob] = useState("");
  const [keywords, setKeywords] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [avatar, setAvatar] = useState<string>("");

  // Step 4 — LinkedIn
  const [profileIndex, setProfileIndex] = useState(0);

  // Step 5 — notifications
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");

  const advance = () => {
    const next = Math.min(step + 1, 5) as Step;
    // Persist and authenticate as soon as the user reaches the notifications step
    if (next === 5) {
      try {
        localStorage.setItem("reput_authed", "true");
        localStorage.setItem("reput_firstname", firstName.trim());
        localStorage.setItem("reput_lastname", lastName.trim());
        localStorage.setItem("reput_phone", phone.trim());
        localStorage.setItem("reput_profile_email", profileEmail.trim() || email.trim());
        localStorage.setItem("reput_nationality", nationality);
        localStorage.setItem("reput_dob", dob);
        localStorage.setItem("reput_keywords", keywords.trim());
        localStorage.setItem("reput_name", `${firstName.trim()} ${lastName.trim()}`.trim() || "John Doe");
        if (avatar) localStorage.setItem("reput_avatar", avatar);
      } catch {}
    }
    setStep(next);
  };

  const goToDashboard = () => router.push("/dashboard");

  // ── OTP helpers ────────────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError("");
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKey = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length) {
      const next = [...otp];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  const verifyOtp = () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Please enter the 6-digit code."); return; }
    // Accept any 6-digit code for now (backend will validate in production)
    advance();
  };

  // ── Notification permission ────────────────────────────────────────────────
  const requestNotifPermission = async () => {
    if (!("Notification" in window)) {
      setNotifStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      setNotifStatus("granted");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === "granted" ? "granted" : "denied");
  };

  // ── Step 1: Create Account ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <Shell step={step}>
        <h1 className="neon-text" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}>
          Create Account
        </h1>
        <p style={{ textAlign: "center", color: "var(--color-muted)", marginBottom: "1.75rem", fontSize: "0.875rem" }}>
          Find out what the internet says about you
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); setProfileEmail(email); advance(); }}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="your@email.com" required />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="Create a password" required />
          </div>
          <button type="submit" className="glow-button" style={{ width: "100%", fontWeight: 700, padding: "0.75rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}>
            Continue →
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={advance}
            style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", backgroundColor: "transparent", color: "var(--color-foreground)", cursor: "pointer", fontWeight: 500, fontSize: "0.9375rem" }}
          >
            Continue with LinkedIn
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem", color: "var(--color-muted)", fontSize: "0.875rem" }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#4ECDC4", fontWeight: 500, textDecoration: "none" }}>Sign in</a>
        </p>
      </Shell>
    );
  }

  // ── Step 2: OTP Verification ───────────────────────────────────────────────
  if (step === 2) {
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + b.replace(/./g, "•") + c);

    return (
      <Shell step={step}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", backgroundColor: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <svg width="22" height="22" fill="none" stroke="#4ECDC4" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "0.5rem" }}>
            Verify your email
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            We sent a 6-digit code to<br />
            <span style={{ color: "var(--color-foreground)", fontWeight: 500 }}>{maskedEmail}</span>
          </p>
        </div>

        {/* OTP boxes */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1.5rem" }} onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKey(i, e)}
              style={{
                width: "3rem",
                height: "3.5rem",
                textAlign: "center",
                fontSize: "1.5rem",
                fontWeight: 700,
                borderRadius: "0.5rem",
                border: `1px solid ${digit ? "#4ECDC4" : "rgba(255,255,255,0.1)"}`,
                backgroundColor: "rgba(13,17,23,0.6)",
                color: "var(--color-foreground)",
                outline: "none",
                transition: "border-color 0.2s",
                caretColor: "#4ECDC4",
              }}
            />
          ))}
        </div>

        {otpError && (
          <p style={{ textAlign: "center", color: "#FF6B4A", fontSize: "0.8125rem", marginBottom: "1rem" }}>{otpError}</p>
        )}

        <button
          onClick={verifyOtp}
          className="glow-button"
          style={{ width: "100%", fontWeight: 700, padding: "0.75rem", borderRadius: "0.5rem" }}
        >
          Verify Code →
        </button>

        <p style={{ textAlign: "center", marginTop: "1.25rem", color: "var(--color-muted)", fontSize: "0.875rem" }}>
          Didn&apos;t receive it?{" "}
          <button
            onClick={() => setOtp(["", "", "", "", "", ""])}
            style={{ color: "#4ECDC4", fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", padding: 0 }}
          >
            Resend code
          </button>
        </p>
      </Shell>
    );
  }

  // ── Step 3: Information ────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <Shell step={step}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem", textAlign: "center", color: "var(--color-foreground)" }}>
          Information
        </h1>
        <p style={{ textAlign: "center", color: "var(--color-muted)", marginBottom: "1.75rem", fontSize: "0.875rem", lineHeight: 1.55 }}>
          To find out your ReputScore we will need some information about you
        </p>

        <form onSubmit={(e) => { e.preventDefault(); advance(); }} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {/* Profile picture */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <label style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: "5rem", height: "5rem", borderRadius: "50%",
                border: `2px dashed ${avatar ? "#4ECDC4" : "rgba(255,255,255,0.2)"}`,
                backgroundColor: "rgba(13,17,23,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", transition: "border-color 0.2s",
              }}>
                {avatar ? (
                  <img src={avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="28" height="28" fill="none" stroke="rgba(255,255,255,0.3)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.8125rem", color: "#4ECDC4", fontWeight: 500 }}>
                {avatar ? "Change photo" : "Upload photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setAvatar(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} placeholder="Name" required />
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} placeholder="Lastname" required />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="Telephone" />
          <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} style={inputStyle} placeholder="E-mail" required />

          <div style={{ position: "relative" }}>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: "2.5rem", color: nationality ? "var(--color-foreground)" : "rgba(255,255,255,0.35)" }}
              required
            >
              <option value="" disabled hidden>Nationality</option>
              {NATIONALITIES.map((n) => (
                <option key={n} value={n} style={{ backgroundColor: "#0D1117", color: "var(--color-foreground)" }}>{n}</option>
              ))}
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={{ ...inputStyle, colorScheme: "dark", color: dob ? "var(--color-foreground)" : "rgba(255,255,255,0.35)" }}
          />

          <div style={{ position: "relative" }}>
            <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ ...inputStyle, paddingRight: "2.75rem" }} placeholder="Keywords" required />
            <div title="Add terms that might appear alongside your name in negative content, e.g. fraud, bankruptcy, scam"
              style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", cursor: "help", color: "rgba(255,255,255,0.4)", display: "flex" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", marginTop: "0.25rem" }}>
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ width: "1rem", height: "1rem", accentColor: "#4ECDC4", marginTop: "0.15rem", flexShrink: 0 }} required />
            <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              By clicking Verify, you agree to our{" "}
              <a href="#" style={{ color: "#4ECDC4", textDecoration: "none" }}>Terms</a>.{" "}
              Learn how we collect, use and share your data in our{" "}
              <a href="#" style={{ color: "#4ECDC4", textDecoration: "none" }}>Privacy Policy</a>{" "}
              and how we use cookies in our{" "}
              <a href="#" style={{ color: "#4ECDC4", textDecoration: "none" }}>Cookies Policy</a>.
            </span>
          </label>

          <button type="submit" className="glow-button"
            style={{ width: "100%", fontWeight: 700, padding: "0.875rem", borderRadius: "9999px", marginTop: "0.5rem", letterSpacing: "0.06em", fontSize: "0.9375rem" }}>
            VERIFY
          </button>
        </form>
      </Shell>
    );
  }

  // ── Step 4: LinkedIn ───────────────────────────────────────────────────────
  if (step === 4) {
    const prev = MOCK_PROFILES[(profileIndex - 1 + MOCK_PROFILES.length) % MOCK_PROFILES.length];
    const curr = MOCK_PROFILES[profileIndex];
    const next = MOCK_PROFILES[(profileIndex + 1) % MOCK_PROFILES.length];

    return (
      <Shell step={step}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem", textAlign: "center", color: "var(--color-foreground)" }}>
          LinkedIn
        </h1>
        <p style={{ textAlign: "center", color: "var(--color-muted)", marginBottom: "2rem", fontSize: "0.875rem" }}>
          Is this you?
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ flexShrink: 0, opacity: 0.35, transform: "scale(0.82)", transition: "all 0.3s" }}>
            <ProfileCard profile={prev} size={110} />
          </div>
          <div style={{ flexShrink: 0, transition: "all 0.3s" }}>
            <ProfileCard profile={curr} size={148} showName />
          </div>
          <div style={{ flexShrink: 0, opacity: 0.35, transform: "scale(0.82)", transition: "all 0.3s" }}>
            <ProfileCard profile={next} size={110} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setProfileIndex((i) => (i + 1) % MOCK_PROFILES.length)}
            style={{ flex: 1, padding: "0.75rem", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.15)", backgroundColor: "transparent", color: "var(--color-foreground)", fontWeight: 700, fontSize: "0.9375rem", cursor: "pointer", letterSpacing: "0.05em" }}
          >
            NO
          </button>
          <button onClick={advance} className="glow-button"
            style={{ flex: 1, padding: "0.75rem", borderRadius: "9999px", fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "0.05em" }}>
            YES
          </button>
        </div>
      </Shell>
    );
  }

  // ── Step 5: Notifications ──────────────────────────────────────────────────
  return (
    <Shell step={step}>
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", backgroundColor: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
          <svg width="22" height="22" fill="none" stroke="#4ECDC4" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "0.5rem" }}>
          Stay in the loop
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
          Enable desktop notifications to know the moment your ReputScore is ready or a new negative link is found.
        </p>
      </div>

      {notifStatus === "idle" && (
        <>
          <div style={{ borderRadius: "0.75rem", backgroundColor: "rgba(78,205,196,0.05)", border: "1px solid rgba(78,205,196,0.15)", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.625rem", margin: 0, padding: 0, listStyle: "none" }}>
              {["New critical links detected", "ReputScore is ready", "Removal request resolved"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.875rem", color: "var(--color-foreground)" }}>
                  <span style={{ color: "#4ECDC4", flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={requestNotifPermission}
            className="glow-button"
            style={{ width: "100%", fontWeight: 700, padding: "0.75rem", borderRadius: "9999px", marginBottom: "0.75rem" }}
          >
            Enable Notifications
          </button>
          <button
            onClick={goToDashboard}
            style={{ width: "100%", fontWeight: 500, padding: "0.75rem", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "var(--color-muted)", cursor: "pointer", fontSize: "0.9375rem" }}
          >
            Skip for now
          </button>
        </>
      )}

      {notifStatus === "granted" && (
        <>
          <div style={{ textAlign: "center", padding: "1rem 0", marginBottom: "1.75rem" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔔</p>
            <p style={{ fontWeight: 600, color: "#00E676", marginBottom: "0.375rem" }}>Notifications enabled!</p>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              We&apos;ll notify you as soon as your ReputScore is ready.
            </p>
          </div>
          <button onClick={goToDashboard} className="glow-button"
            style={{ width: "100%", fontWeight: 700, padding: "0.75rem", borderRadius: "9999px" }}>
            ACCEPT
          </button>
        </>
      )}

      {notifStatus === "denied" && (
        <>
          <div style={{ textAlign: "center", padding: "1rem 0", marginBottom: "1.75rem" }}>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Notifications were blocked. You&apos;re already signed in — you can enable them any time from your browser settings or under{" "}
              <a href="/settings" style={{ color: "#4ECDC4", textDecoration: "none" }}>Settings</a>.
            </p>
          </div>
          <button onClick={goToDashboard} className="glow-button"
            style={{ width: "100%", fontWeight: 700, padding: "0.75rem", borderRadius: "9999px" }}>
            Continue anyway
          </button>
        </>
      )}
    </Shell>
  );
}

function ProfileCard({ profile, size, showName }: { profile: (typeof MOCK_PROFILES)[0]; size: number; showName?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem" }}>
      <div style={{ width: size, height: size, borderRadius: "0.875rem", background: profile.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
        {profile.initials}
      </div>
      {showName && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "var(--color-foreground)", fontSize: "0.9375rem" }}>{profile.name}</p>
          <p style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>{profile.title}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { isAuthed, getCachedMe, getCachedProfile, ScanDepth } from "@/lib/api";
import { COUNTRY_NAMES } from "@/lib/countries";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "0.625rem",
  border: "1px solid var(--color-border)",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
};

export default function SettingsPage() {
  const router = useRouter();
  const hasLoadedRef = useRef(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [dob, setDob] = useState("");
  const [scanDepth, setScanDepth] = useState<ScanDepth>("Standard");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [showBetaDeleteMsg, setShowBetaDeleteMsg] = useState(false);
  const [showBetaScanMsg, setShowBetaScanMsg] = useState(false);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/login");
      return;
    }
    setAuthed(true);

    const loadProfile = async () => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      try {
        const [user, profile] = await Promise.all([
          getCachedMe(),
          getCachedProfile(),
        ]);
        if (user.name) {
          const parts = user.name.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
        setProfileEmail(user.email || "");
        if (user.phone) setPhone(user.phone);
        if (user.nationality) setNationality(user.nationality);
        if (user.date_of_birth) setDob(user.date_of_birth);
        if (user.scan_depth) setScanDepth(user.scan_depth);
        if (profile) {
          if (profile.keywords?.length) {
            setKeywords(profile.keywords);
          }
        }
      } catch {
        // Fallback to localStorage cache
        try {
          setFirstName(localStorage.getItem("reput_firstname") || "");
          setLastName(localStorage.getItem("reput_lastname") || "");
          setPhone(localStorage.getItem("reput_phone") || "");
          setProfileEmail(localStorage.getItem("reput_profile_email") || "");
          const kw = localStorage.getItem("reput_keywords") || "";
          setKeywords(kw ? kw.split(",").map((s) => s.trim()).filter(Boolean) : []);
        } catch {}
      }
    };
    loadProfile();
  }, [router]);

  if (!authed) return null;

  return (
    <div
      className="grid-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--color-background)",
      }}
    >
      <Header />
      <main style={{ flex: 1, paddingTop: "4.5rem" }}>
        <div
          style={{
            maxWidth: "56rem",
            margin: "0 auto",
            padding: "2rem 1.5rem",
          }}
        >
          <h1
            className="neon-text"
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Settings
          </h1>
          <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>
            Configure your scan preferences, monitored keywords, and
            notification settings.
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Profile Information */}
            <div
              style={{
                borderRadius: "0.75rem",
                padding: "2rem",
                background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 32px rgba(68,121,218,0.28)",
                "--color-foreground": "#ffffff",
                "--color-muted": "rgba(255,255,255,0.72)",
                "--color-border": "rgba(255,255,255,0.3)",
                pointerEvents: "none",
                userSelect: "none",
              } as React.CSSProperties}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "1.5rem",
                }}
              >
                Profile Information
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(10rem, 100%), 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--color-foreground)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={fieldStyle}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--color-foreground)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Lastname
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={fieldStyle}
                      placeholder="Lastname"
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Telephone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={fieldStyle}
                    placeholder="Telephone"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    style={fieldStyle}
                    placeholder="E-mail"
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Nationality
                  </label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    style={{
                      ...fieldStyle,
                      appearance: "none",
                      WebkitAppearance: "none",
                      paddingRight: "2.5rem",
                    }}
                  >
                    <option value="">Select nationality</option>
                    {COUNTRY_NAMES.map((n) => (
                      <option
                        key={n}
                        value={n}
                        style={{ backgroundColor: "#ffffff" }}
                      >
                        {n}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(100,116,139,0.55)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: "absolute",
                      right: "1rem",
                      bottom: "0.75rem",
                      pointerEvents: "none",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Date of Birth
                  </label>
                  <label
                    htmlFor="settings-dob-input"
                    style={{ ...fieldStyle, position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <span style={{ color: dob ? "#1e293b" : "#94a3b8", pointerEvents: "none", fontSize: "0.95rem" }}>
                      {dob
                        ? new Date(dob + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                        : "Select date"}
                    </span>
                    <input
                      id="settings-dob-input"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", padding: 0 }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Scan Settings */}
            <div
              style={{
                borderRadius: "0.75rem",
                padding: "2rem",
                background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 32px rgba(68,121,218,0.28)",
                "--color-foreground": "#ffffff",
                "--color-muted": "rgba(255,255,255,0.72)",
                "--color-border": "rgba(255,255,255,0.3)",
                pointerEvents: "none",
                userSelect: "none",
              } as React.CSSProperties}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "1.5rem",
                }}
              >
                Scan Settings
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Scan Depth
                  </label>
                  <select
                    value={scanDepth}
                    onChange={(e) => setScanDepth(e.target.value as ScanDepth)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.625rem",
                      border: "1px solid rgba(255,255,255,0.3)",
                      backgroundColor: "#ffffff",
                      color: "#1e293b",
                      outline: "none",
                    }}
                  >
                    <option value="Standard">Standard — top 50 results per source</option>
                    <option value="Deep">Deep — top 200 results per source</option>
                    <option value="Thorough">Thorough — full crawl (slower)</option>
                  </select>
                </div>

                {/* <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Auto-Scan Frequency
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.625rem",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "#ffffff",
                      color: "var(--color-foreground)",
                      outline: "none",
                    }}
                  >
                    <option>Off (manual only)</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div> */}
              </div>
            </div>

            {/* Monitored Keywords */}
            <div
              style={{
                borderRadius: "0.75rem",
                padding: "2rem",
                background: "linear-gradient(160deg, #4479DA 0%, #48D4B8 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 32px rgba(68,121,218,0.28)",
                "--color-foreground": "#ffffff",
                "--color-muted": "rgba(255,255,255,0.72)",
                "--color-border": "rgba(255,255,255,0.3)",
                pointerEvents: "none",
                userSelect: "none",
              } as React.CSSProperties}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "0.375rem",
                }}
              >
                Default Keywords
              </h2>
              <p
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.8125rem",
                  marginBottom: "1.25rem",
                }}
              >
                These keywords are pre-filled on every new scan. Add terms like
                your job title, company, or location.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  borderRadius: "0.625rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: "#ffffff",
                  minHeight: "3rem",
                  alignItems: "center",
                  cursor: "text",
                }}
                onClick={() =>
                  (
                    document.getElementById(
                      "settings-keyword-input",
                    ) as HTMLInputElement | null
                  )?.focus()
                }
              >
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "0.5rem",
                      backgroundColor: "#4479DA",
                      color: "#fff",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKeywords((prev) => prev.filter((k) => k !== kw));
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        lineHeight: 1,
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                      aria-label={`Remove ${kw}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="settings-keyword-input"
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" ||
                        e.key === "," ||
                        e.key === "Tab") &&
                      keywordInput.trim()
                    ) {
                      e.preventDefault();
                      const val = keywordInput.replace(/,/g, "").trim();
                      if (val && !keywords.includes(val)) {
                        setKeywords((prev) => [...prev, val]);
                      }
                      setKeywordInput("");
                    } else if (
                      e.key === "Backspace" &&
                      !keywordInput &&
                      keywords.length
                    ) {
                      setKeywords((prev) => prev.slice(0, -1));
                    }
                  }}
                  onBlur={() => {
                    const val = keywordInput.replace(/,/g, "").trim();
                    if (val && !keywords.includes(val)) {
                      setKeywords((prev) => [...prev, val]);
                    }
                    setKeywordInput("");
                  }}
                  placeholder={keywords.length === 0 ? "Type a keyword and press Enter…" : ""}
                  style={{
                    flex: 1,
                    minWidth: "10rem",
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    fontSize: "0.9375rem",
                    color: "#1e293b",
                    padding: "0.25rem 0.5rem",
                  }}
                />
              </div>
            </div>

            {/* Alert Preferences */}
            {/* <div
              className="glass glow-border"
              style={{ borderRadius: "0.75rem", padding: "2rem" }}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "1.5rem",
                }}
              >
                Alert Preferences
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {[
                  {
                    label: "Email me when a new Critical result is found",
                    defaultChecked: true,
                  },
                  {
                    label: "Email me when a new High risk result is found",
                    defaultChecked: true,
                  },
                  {
                    label: "Weekly digest of all scan results",
                    defaultChecked: false,
                  },
                  {
                    label: "Notify me when a removal request is resolved",
                    defaultChecked: true,
                  },
                ].map(({ label, defaultChecked }) => (
                  <label
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                      color: "var(--color-foreground)",
                      fontSize: "0.9375rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      defaultChecked={defaultChecked}
                      style={{
                        width: "1rem",
                        height: "1rem",
                        accentColor: "var(--color-primary)",
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div> */}

            {/* Privacy */}
            {/* <div
              className="glass glow-border"
              style={{ borderRadius: "0.75rem", padding: "2rem" }}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "1.5rem",
                }}
              >
                Privacy & Data
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {[
                  {
                    label: "Store scan history (last 90 days)",
                    defaultChecked: true,
                  },
                  {
                    label:
                      "Allow RepuTrust to use my scan data to improve results",
                    defaultChecked: false,
                  },
                ].map(({ label, defaultChecked }) => (
                  <label
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                      color: "var(--color-foreground)",
                      fontSize: "0.9375rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      defaultChecked={defaultChecked}
                      style={{
                        width: "1rem",
                        height: "1rem",
                        accentColor: "var(--color-primary)",
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div> */}

            {/* Danger Zone */}
            <div
              style={{
                borderRadius: "0.75rem",
                padding: "2rem",
                background: "linear-gradient(160deg, #b91c1c 0%, #ef4444 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 32px rgba(185,28,28,0.28)",
                "--color-foreground": "#ffffff",
                "--color-muted": "rgba(255,255,255,0.72)",
              } as React.CSSProperties}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--color-foreground)",
                  marginBottom: "0.375rem",
                }}
              >
                Danger Zone
              </h2>
              <p
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.8125rem",
                  marginBottom: "1.25rem",
                }}
              >
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {!showBetaDeleteMsg ? (
                <button
                  type="button"
                  onClick={() => setShowBetaDeleteMsg(true)}
                  style={{
                    padding: "0.625rem 1.5rem",
                    borderRadius: "0.625rem",
                    border: "2px solid rgba(255,255,255,0.6)",
                    background: "transparent",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                  }}
                >
                  Delete Account
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <p style={{ color: "#fef2f2", fontWeight: 600, fontSize: "0.9375rem" }}>
                    This account was created specifically for the RepuTrust Beta and cannot be deleted.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBetaDeleteMsg(false)}
                    style={{
                      padding: "0.625rem 1.5rem",
                      borderRadius: "0.625rem",
                      border: "2px solid rgba(255,255,255,0.6)",
                      background: "transparent",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Save */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
              }}
            >
              {showBetaScanMsg ? (
                <div
                  className="glass"
                  style={{
                    borderRadius: "0.75rem",
                    padding: "1.25rem 1.5rem",
                    border: "1px solid var(--color-border)",
                    textAlign: "center",
                    maxWidth: "min(28rem, 100%)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <p style={{ fontSize: "0.9375rem", color: "var(--color-foreground)", fontWeight: 600, margin: 0 }}>
                    During the Beta, each user receives one scan. Recalculating is not available.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowBetaScanMsg(true)}
                  className="glow-button"
                  style={{
                    fontWeight: 700,
                    minWidth: "min(18rem, 100%)",
                    boxSizing: "border-box",
                    padding: "0.75rem 2.75rem",
                    borderRadius: "0.625rem",
                    transition: "all 0.3s",
                  }}
                >
                  Recalculate score
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

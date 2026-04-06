"use client";

import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const NATIONALITIES = [
  "Afghan",
  "Albanian",
  "Algerian",
  "American",
  "Argentine",
  "Australian",
  "Austrian",
  "Belgian",
  "Brazilian",
  "British",
  "Bulgarian",
  "Canadian",
  "Chilean",
  "Chinese",
  "Colombian",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "Egyptian",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Hungarian",
  "Indian",
  "Indonesian",
  "Iranian",
  "Iraqi",
  "Irish",
  "Israeli",
  "Italian",
  "Japanese",
  "Jordanian",
  "Kenyan",
  "Korean",
  "Lebanese",
  "Malaysian",
  "Mexican",
  "Moroccan",
  "New Zealander",
  "Nigerian",
  "Norwegian",
  "Pakistani",
  "Peruvian",
  "Philippine",
  "Polish",
  "Portuguese",
  "Romanian",
  "Russian",
  "Saudi",
  "Serbian",
  "Singaporean",
  "South African",
  "Spanish",
  "Swedish",
  "Swiss",
  "Thai",
  "Turkish",
  "Ukranian",
  "Emirati",
  "Venezuelan",
  "Vietnamese",
];

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
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [dob, setDob] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem("reput_authed") !== "true") {
        router.replace("/auth");
        return;
      }
      setAuthed(true);
      setFirstName(localStorage.getItem("reput_firstname") || "");
      setLastName(localStorage.getItem("reput_lastname") || "");
      setPhone(localStorage.getItem("reput_phone") || "");
      setProfileEmail(localStorage.getItem("reput_profile_email") || "");
      setNationality(localStorage.getItem("reput_nationality") || "");
      setDob(localStorage.getItem("reput_dob") || "");
      const kw = localStorage.getItem("reput_keywords") || "";
      setKeywords(kw ? kw.split(",").map((s) => s.trim()).filter(Boolean) : []);
    } catch {}
  }, [router]);

  const saveChanges = () => {
    try {
      localStorage.setItem("reput_firstname", firstName.trim());
      localStorage.setItem("reput_lastname", lastName.trim());
      localStorage.setItem("reput_phone", phone.trim());
      localStorage.setItem("reput_profile_email", profileEmail.trim());
      localStorage.setItem("reput_nationality", nationality);
      localStorage.setItem("reput_dob", dob);
      localStorage.setItem("reput_keywords", keywords.join(","));
      localStorage.setItem(
        "reput_name",
        `${firstName.trim()} ${lastName.trim()}`.trim(),
      );
    } catch {}
  };

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
                    {NATIONALITIES.map((n) => (
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
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={{ ...fieldStyle, colorScheme: "light" }}
                  />
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
                    <option>Standard — top 50 results per source</option>
                    <option>Deep — top 200 results per source</option>
                    <option>Thorough — full crawl (slower)</option>
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

            {/* Save */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={saveChanges}
                className="glow-button"
                style={{
                  fontWeight: 700,
                  padding: "0.75rem 2rem",
                  borderRadius: "0.625rem",
                  transition: "all 0.3s",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

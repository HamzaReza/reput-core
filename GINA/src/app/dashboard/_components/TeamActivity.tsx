"use client";

const ACTIVITIES = [
  { user: "Sarah Miller", action: "ran a scan for",    target: "Acme Corp",    time: "15m ago", color: "#4479da" },
  { user: "Mike Johnson", action: "exported report for", target: "TechStart",   time: "1h ago",  color: "#22c55e" },
  { user: "Emma Davis",   action: "flagged issues in",  target: "GlobalNews",  time: "2h ago",  color: "#eab308" },
  { user: "David Wilson", action: "created scan for",   target: "Retail Plus", time: "3h ago",  color: "#64748b" },
  { user: "Emma Davis",   action: "approved scan for",  target: "MediaCo",     time: "4h ago",  color: "#a855f7" },
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function TeamActivity() {
  return (
    <div
      className="glass glow-border animate-fade-up"
      style={{ borderRadius: "0.875rem", padding: "1.25rem", animationDelay: "0.35s" }}
    >
      <p
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--color-foreground, #1e293b)",
          margin: "0 0 1rem",
        }}
      >
        Team Activity
      </p>

      <div style={{ position: "relative" }}>
        {ACTIVITIES.map((activity, i) => {
          const isLast = i === ACTIVITIES.length - 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                position: "relative",
                paddingBottom: isLast ? 0 : "1rem",
              }}
            >
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: "32px",
                    bottom: 0,
                    width: "2px",
                    backgroundColor: "var(--color-border, #e2e8f0)",
                  }}
                />
              )}

              {/* Avatar */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: activity.color + "20",
                  color: activity.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  zIndex: 1,
                  border: `1.5px solid ${activity.color}44`,
                }}
              >
                {getInitials(activity.user)}
              </div>

              {/* Text + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-foreground, #1e293b)",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{activity.user}</span>
                  {" "}
                  <span style={{ color: "var(--color-muted, #64748b)" }}>{activity.action}</span>
                  {" "}
                  <span style={{ fontWeight: 600 }}>{activity.target}</span>
                </p>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--color-muted, #64748b)",
                    margin: "0.2rem 0 0",
                  }}
                >
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

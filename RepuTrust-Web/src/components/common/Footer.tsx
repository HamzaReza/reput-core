export default function Footer() {
  return (
    <footer
      style={{
        padding: "2rem 1.5rem",
        borderTop: "1px solid var(--color-border)",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          textAlign: "center",
          color: "var(--color-muted)",
          fontSize: "0.875rem",
        }}
      >
        <p>&copy; 2026 Ealixir. All rights reserved.</p>
      </div>
    </footer>
  );
}

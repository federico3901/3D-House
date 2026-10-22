/* "/" sends visitors to their language: Italian if the browser prefers it, English otherwise. */
const redirect = `(function(){var l=(navigator.languages&&navigator.languages[0])||navigator.language||"it";location.replace(/^it\\b/i.test(l)?"it/":"en/");})();`;

export default function Gate() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", gap: 12 }}>
      <script dangerouslySetInnerHTML={{ __html: redirect }} />
      <p style={{ display: "flex", gap: 16 }}>
        <a href="it/">Italiano</a>
        <a href="en/">English</a>
      </p>
    </main>
  );
}

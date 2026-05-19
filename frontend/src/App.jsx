import { useState, useRef, useCallback } from "react";

const API = "http://localhost:8000";

const BG_OPTIONS = [
  { id: "white", label: "White", color: "#ffffff", border: "#e0e0e0" },
  { id: "black", label: "Black", color: "#0a0a0a", border: "#333" },
];

export default function App() {
  const [dragging, setDragging]   = useState(false);
  const [original, setOriginal]   = useState(null);
  const [result,   setResult]     = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [progress, setProgress]   = useState("");
  const [error,    setError]      = useState("");
  const [bg,       setBg]         = useState("white");
  const [fileName, setFileName]   = useState("");
  const [view,     setView]       = useState("split");
  const [darkUI,   setDarkUI]     = useState(false);   // ← UI theme toggle
  const fileRef       = useRef();
  const resultFileRef = useRef(null);

  // ── derive theme tokens ──────────────────────────────────────────────
  const t = darkUI ? {
    root:        "#111",
    surface:     "#1c1c1e",
    border:      "#2e2e2e",
    borderHover: "#555",
    text:        "#f0efeb",
    textMuted:   "#888",
    textFaint:   "#555",
    dropBg:      "#1c1c1e",
    dropBorder:  "#333",
    btnSecBg:    "#1c1c1e",
    btnSecColor: "#ccc",
    btnSecBorder:"#333",
    errorBg:     "#2a1a1a",
    errorBorder: "#6b2020",
    errorText:   "#ff7c7c",
    accent:      "#f0efeb",
    accentText:  "#111",
  } : {
    root:        "#f7f6f3",
    surface:     "#ffffff",
    border:      "#ebe9e3",
    borderHover: "#bbb",
    text:        "#111",
    textMuted:   "#777",
    textFaint:   "#aaa",
    dropBg:      "#fff",
    dropBorder:  "#d0cfc8",
    btnSecBg:    "#fff",
    btnSecColor: "#333",
    btnSecBorder:"#ddd",
    errorBg:     "#fff3f3",
    errorBorder: "#ffcdd2",
    errorText:   "#c62828",
    accent:      "#111",
    accentText:  "#fff",
  };

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError("");
    setResult(null);
    setOriginal(URL.createObjectURL(file));
    setFileName(file.name);
    setLoading(true);
    setProgress("Analysing image…");

    const form = new FormData();
    form.append("file",       file);
    form.append("background", bg);
    form.append("threshold",  0.5); // fixed default, no longer user-adjustable

    try {
      setProgress("Removing background…");
      const res = await fetch(`${API}/remove-background`, { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      resultFileRef.current = blob;
      setResult(URL.createObjectURL(blob));
      setProgress("");
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }, [bg]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const download = () => {
    if (!resultFileRef.current) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(resultFileRef.current);
    a.download = `removed_bg_${fileName || "image"}.png`;
    a.click();
  };

  const reset = () => {
    setOriginal(null); setResult(null);
    setError(""); setFileName(""); setView("split");
    resultFileRef.current = null;
  };

  return (
    <div style={{ ...styles.root, background: t.root, color: t.text }}>

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>
            <span style={{ ...styles.logoIcon, color: t.text }}>✦</span>
            <span style={{ ...styles.logoText, color: t.text }}>ClearCut</span>
          </div>

          {/* Dark / Light toggle */}
          <button
            onClick={() => setDarkUI(d => !d)}
            style={{
              ...styles.themeToggle,
              background: t.surface,
              border: `1.5px solid ${t.border}`,
              color: t.text,
            }}
            title="Toggle UI theme"
          >
            {darkUI ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
        <p style={{ ...styles.tagline, color: t.textMuted }}>
          Remove backgrounds in one click · Powered by your own model
        </p>
      </header>

      <main style={styles.main}>

        {/* ── Upload zone ── */}
        {!original && (
          <div
            style={{
              ...styles.dropzone,
              background: t.dropBg,
              borderColor: dragging ? t.accent : t.dropBorder,
              ...(dragging ? { background: darkUI ? "#222" : "#fafaf8" } : {}),
            }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => processFile(e.target.files[0])} />
            <div style={{ ...styles.dropIcon, color: t.textFaint }}>⬆</div>
            <p style={{ ...styles.dropTitle, color: t.text }}>Drop your image here</p>
            <p style={{ ...styles.dropSub, color: t.textMuted }}>or click to browse · PNG, JPG, WEBP</p>
          </div>
        )}

        {/* ── Controls (background only) ── */}
        <div style={{ ...styles.controls, background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={styles.controlGroup}>
            <label style={{ ...styles.label, color: t.textMuted }}>Background</label>
            <div style={styles.bgRow}>
              {BG_OPTIONS.map(opt => {
                const active = bg === opt.id;
                return (
                  <button key={opt.id}
                    style={{
                      ...styles.bgBtn,
                      border: `1.5px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accent : t.surface,
                      color: active ? t.accentText : t.text,
                    }}
                    onClick={() => setBg(opt.id)}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 16, height: 16,
                        borderRadius: 4,
                        background: opt.color,
                        border: `1.5px solid ${opt.border}`,
                        flexShrink: 0,
                        verticalAlign: "middle",
                      }}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            ...styles.error,
            background: t.errorBg,
            border: `1px solid ${t.errorBorder}`,
            color: t.errorText,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ ...styles.loadingBox, background: t.surface, border: `1px solid ${t.border}` }}>
            <div style={{ ...styles.spinner, borderTopColor: t.accent }} />
            <span style={{ ...styles.loadingText, color: t.textMuted }}>{progress}</span>
          </div>
        )}

        {/* ── Result panel ── */}
        {(original && !loading) && (
          <div style={styles.resultSection}>
            {/* View toggle */}
            <div style={styles.viewToggle}>
              {["split", "original", "result"].map(v => {
                const active = view === v;
                return (
                  <button key={v}
                    style={{
                      ...styles.toggleBtn,
                      border: `1.5px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accent : t.surface,
                      color: active ? t.accentText : t.textMuted,
                    }}
                    onClick={() => setView(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                );
              })}
            </div>

            {/* Canvas */}
            <div style={styles.canvasRow}>
              {(view === "split" || view === "original") && (
                <div style={{ ...styles.imgCard, background: t.surface, border: `1px solid ${t.border}` }}>
                  <div style={{ ...styles.imgLabel, color: t.textFaint }}>Original</div>
                  <img src={original} alt="original" style={styles.imgPreview} />
                </div>
              )}
              {(view === "split" || view === "result") && result && (
                <div style={{ ...styles.imgCard, background: t.surface, border: `1px solid ${t.border}` }}>
                  <div style={{ ...styles.imgLabel, color: t.textFaint }}>Result</div>
                  <img src={result} alt="result" style={styles.imgPreview} />
                </div>
              )}
              {(view === "split" || view === "result") && !result && (
                <div style={{
                  ...styles.imgCard, ...styles.imgCardEmpty,
                  background: t.surface, border: `1px solid ${t.border}`,
                }}>
                  <p style={{ color: t.textFaint, fontSize: 14 }}>Process an image to see result</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button
                style={{ ...styles.btnSecondary, background: t.btnSecBg, color: t.btnSecColor, border: `1.5px solid ${t.btnSecBorder}` }}
                onClick={reset}
              >
                ← New Image
              </button>
              <button
                style={{ ...styles.btnSecondary, background: t.btnSecBg, color: t.btnSecColor, border: `1.5px solid ${t.btnSecBorder}` }}
                onClick={() => processFile(fileRef.current?.files[0] || null)}
                disabled={!fileName}
              >
                ↺ Re-process
              </button>
              {result && (
                <button style={{ ...styles.btnPrimary, background: t.accent, color: t.accentText }} onClick={download}>
                  ⬇ Download PNG
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={{ ...styles.footer, color: t.textFaint }}>
        Built with your trained U-Net model · FastAPI + React
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { accent-color: #111; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 16px 40px",
    transition: "background 0.25s, color 0.25s",
  },
  header: {
    textAlign: "center",
    padding: "52px 0 28px",
    width: "100%",
    maxWidth: 820,
    animation: "fadeUp 0.6s ease both",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 10,
    position: "relative",
  },
  logo: {
    display: "flex", alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    fontSize: 28, lineHeight: 1,
  },
  logoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 34, fontWeight: 600, letterSpacing: "-0.5px",
  },
  themeToggle: {
    position: "absolute",
    right: 0,
    padding: "7px 16px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
    letterSpacing: "0.01em",
  },
  tagline: {
    fontSize: 14, fontWeight: 400, letterSpacing: "0.01em",
  },
  main: {
    width: "100%", maxWidth: 820,
    display: "flex", flexDirection: "column", gap: 24,
    animation: "fadeUp 0.7s ease 0.1s both",
  },
  dropzone: {
    border: "2px dashed",
    borderRadius: 16,
    padding: "64px 32px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  },
  dropIcon: { fontSize: 36, marginBottom: 4 },
  dropTitle: { fontSize: 18, fontWeight: 600 },
  dropSub:   { fontSize: 13 },
  controls: {
    borderRadius: 14,
    padding: "22px 26px",
    display: "flex",
    gap: 32,
    flexWrap: "wrap",
    transition: "background 0.25s, border-color 0.25s",
  },
  controlGroup: {
    display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200,
  },
  label: {
    fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em",
  },
  bgRow: { display: "flex", gap: 8 },
  bgBtn: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "7px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13, fontWeight: 500,
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  error: {
    borderRadius: 10, padding: "12px 16px", fontSize: 13,
  },
  loadingBox: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
    borderRadius: 14, padding: "32px",
    transition: "background 0.25s",
  },
  spinner: {
    width: 24, height: 24,
    border: "2.5px solid #e0ddd7",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { fontSize: 14 },
  resultSection: {
    display: "flex", flexDirection: "column", gap: 18,
    animation: "fadeUp 0.4s ease both",
  },
  viewToggle: { display: "flex", gap: 6 },
  toggleBtn: {
    padding: "7px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13, fontWeight: 500,
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  canvasRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  imgCard: {
    flex: 1, minWidth: 260,
    borderRadius: 14,
    overflow: "hidden",
    display: "flex", flexDirection: "column",
    transition: "background 0.25s, border-color 0.25s",
  },
  imgCardEmpty: {
    alignItems: "center", justifyContent: "center", minHeight: 200,
  },
  imgLabel: {
    fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.08em",
    padding: "10px 14px 0",
  },
  imgPreview: {
    width: "100%", display: "block", borderRadius: "0 0 12px 12px",
  },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnPrimary: {
    padding: "11px 28px",
    border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "opacity 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  btnSecondary: {
    padding: "11px 22px",
    borderRadius: 10,
    fontSize: 14, fontWeight: 500, cursor: "pointer",
    transition: "border-color 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  footer: {
    marginTop: 48, fontSize: 12,
  },
};
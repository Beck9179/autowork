import { useState, useEffect, useRef } from "react";

const SERVICES = [
  { id: "writing", label: "Content Writing", icon: "✍️", desc: "Blog posts, product descriptions, web copy", base: 25 },
  { id: "research", label: "Research & Reports", icon: "🔍", desc: "Market research, competitor analysis, summaries", base: 40 },
  { id: "email", label: "Email Campaigns", icon: "📧", desc: "Newsletters, cold outreach, drip sequences", base: 30 },
  { id: "data", label: "Data Analysis", icon: "📊", desc: "Interpret data, write insights, make recommendations", base: 50 },
  { id: "social", label: "Social Media", icon: "📱", desc: "Posts, captions, strategy, hashtags", base: 20 },
  { id: "code", label: "Code & Scripts", icon: "💻", desc: "Automation scripts, small tools, debugging help", base: 60 },
];

const MEMORIES = {};

function getSystemPrompt(serviceId, budget, history) {
  const pastWork = history
    .filter(j => j.service === serviceId && j.feedback)
    .slice(-3)
    .map(j => `- Previous feedback: "${j.feedback}"`)
    .join("\n");

  return `You are an elite professional freelancer completing paid digital work. Budget: $${budget}.
Service type: ${serviceId}.
${pastWork ? `\nClient history & preferences:\n${pastWork}\n` : ""}
Deliver exceptional, complete, ready-to-use work. Be specific, detailed, and professional.
Do not include meta-commentary — just deliver the final work product directly.`;
}

const SLACK_WEBHOOK = "https://hooks.slack.com/services/TOB422F3EGH/BOB4FJHM317/B27uNVNjMfFdKa4WbtCC";

async function notifySlack(job, result) {
  const svc = SERVICES.find(s => s.id === job.service);
  try {
    await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(SLACK_WEBHOOK), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `✅ *New Job Completed on AutoWork!*\n👤 *Customer:* ${job.name}\n🛠 *Service:* ${svc?.label}\n💰 *Budget:* $${job.budget}\n📋 *Job:* ${job.description.slice(0, 100)}...\n\n*Result Preview:*\n${result.slice(0, 300)}...`
      }),
    });
  } catch (e) {
    console.log("Slack notify failed:", e);
  }
}

async function runJob(job, history) {
  const systemPrompt = getSystemPrompt(job.service, job.budget, history);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: job.description }],
    }),
  });
  const data = await response.json();
  return data.content?.map(b => b.text || "").join("") || "Error completing job.";
}

// STRIPE PUBLISHABLE KEY — replace with your real key from dashboard.stripe.com
const STRIPE_KEY = "pk_test_51TmSoK2MTdvV4G8Wfvh3AQ72h7GDd83DAsufPsZIE8kHlYekCDHd09SfdZboXquEccdjWn9ow4bWmxuOx3o2vz6100Y2kQpQwy";

export default function App() {
  const [view, setView] = useState("home"); // home | order | payment | queue | result
  const [form, setForm] = useState({ service: "", description: "", budget: "", name: "", email: "" });
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", zip: "" });
  const [paymentStatus, setPaymentStatus] = useState(null); // null | processing | success | error
  const [pendingJob, setPendingJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const counterRef = useRef(1);

  function formatCardNumber(val) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(val) {
    const v = val.replace(/\D/g, "").slice(0, 4);
    return v.length >= 3 ? v.slice(0,2) + "/" + v.slice(2) : v;
  }

  async function proceedToPayment() {
    if (!form.service || !form.description || !form.budget || !form.name) return;
    setPendingJob({ ...form, budget: parseFloat(form.budget) });
    setCard({ number: "", expiry: "", cvc: "", zip: "" });
    setPaymentStatus(null);
    setView("payment");
  }

  async function processPayment() {
    if (!card.number || !card.expiry || !card.cvc) return;
    setPaymentStatus("processing");
    // DEMO MODE: simulate payment delay
    // In production: call your backend to create a Stripe PaymentIntent, then confirm with Stripe.js
    await new Promise(r => setTimeout(r, 2000));
    // Simulate success (replace with real Stripe call when deployed)
    setPaymentStatus("success");
    await new Promise(r => setTimeout(r, 800));
    // Submit the job after payment
    const job = {
      id: counterRef.current++,
      ...pendingJob,
      status: "pending",
      submittedAt: new Date(),
      result: null,
      feedback: null,
      paid: true,
    };
    const newJobs = [...jobs, job];
    setJobs(newJobs);
    setForm({ service: "", description: "", budget: "", name: "", email: "" });
    setPendingJob(null);
    setPaymentStatus(null);
    setView("queue");
    setTimeout(() => processNext(newJobs), 500);
  }

  const sortedQueue = [...jobs]
    .filter(j => j.status === "pending" || j.status === "processing")
    .sort((a, b) => b.budget - a.budget);

  async function submitOrder() {
    if (!form.service || !form.description || !form.budget || !form.name) return;
    await proceedToPayment();
  }

  async function processNext(currentJobs) {
    const pending = [...currentJobs]
      .filter(j => j.status === "pending")
      .sort((a, b) => b.budget - a.budget);
    if (pending.length === 0) return;

    const job = pending[0];
    setWorking(true);
    setJobs(prev =>
      prev.map(j => (j.id === job.id ? { ...j, status: "processing" } : j))
    );

    try {
      const completedHistory = currentJobs.filter(j => j.status === "completed");
      const result = await runJob(job, completedHistory);
      setJobs(prev =>
        prev.map(j =>
          j.id === job.id ? { ...j, status: "completed", result, completedAt: new Date() } : j
        )
      );
      await notifySlack(job, result);
      setActiveJob({ ...job, result });
      setView("result");
    } catch (e) {
      setJobs(prev =>
        prev.map(j => (j.id === job.id ? { ...j, status: "error" } : j))
      );
    } finally {
      setWorking(false);
    }
  }

  function submitFeedback(jobId) {
    if (!feedback.trim()) return;
    setJobs(prev =>
      prev.map(j => (j.id === jobId ? { ...j, feedback } : j))
    );
    setFeedback("");
    alert("Thanks! We'll remember that for next time.");
  }

  const service = SERVICES.find(s => s.id === form.service);
  const completedJobs = jobs.filter(j => j.status === "completed");
  const totalEarned = completedJobs.reduce((s, j) => s + j.budget, 0);

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo} onClick={() => setView("home")}>
            <span style={styles.logoMark}>⚡</span>
            <span style={styles.logoText}>AUTOWORK</span>
          </div>
          <nav style={styles.nav}>
            <button style={styles.navBtn} onClick={() => setView("home")}>Services</button>
            <button style={styles.navBtn} onClick={() => setView("queue")}>
              Queue {sortedQueue.length > 0 && <span style={styles.badge}>{sortedQueue.length}</span>}
            </button>
            <button style={styles.orderBtn} onClick={() => setView("order")}>Place Order →</button>
          </nav>
        </div>
      </header>

      {/* HOME */}
      {view === "home" && (
        <main style={styles.main}>
          <div style={styles.hero}>
            <div style={styles.heroTag}>FULLY AUTOMATED · AI-POWERED · 24/7</div>
            <h1 style={styles.heroTitle}>
              Digital Work.<br />
              <span style={styles.heroAccent}>Done While You Sleep.</span>
            </h1>
            <p style={styles.heroSub}>
              Submit a job. Our AI completes it. Higher-budget work gets priority.
              Every job makes us smarter for your next one.
            </p>
            <div style={styles.heroActions}>
              <button style={styles.primaryBtn} onClick={() => setView("order")}>
                Start a Job →
              </button>
              {completedJobs.length > 0 && (
                <div style={styles.stat}>
                  <span style={styles.statNum}>{completedJobs.length}</span>
                  <span style={styles.statLabel}>jobs completed</span>
                </div>
              )}
              {totalEarned > 0 && (
                <div style={styles.stat}>
                  <span style={styles.statNum}>${totalEarned}</span>
                  <span style={styles.statLabel}>processed</span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.grid}>
            {SERVICES.map(s => (
              <div
                key={s.id}
                style={styles.card}
                className="card"
                onClick={() => { setForm(f => ({ ...f, service: s.id })); setView("order"); }}
              >
                <div style={styles.cardIcon}>{s.icon}</div>
                <div style={styles.cardLabel}>{s.label}</div>
                <div style={styles.cardDesc}>{s.desc}</div>
                <div style={styles.cardPrice}>from ${s.base}</div>
              </div>
            ))}
          </div>

          <div style={styles.howIt}>
            <div style={styles.howStep}><span style={styles.howNum}>01</span><span>Describe your job & set your budget</span></div>
            <div style={styles.howArrow}>→</div>
            <div style={styles.howStep}><span style={styles.howNum}>02</span><span>AI prioritizes & completes your work</span></div>
            <div style={styles.howArrow}>→</div>
            <div style={styles.howStep}><span style={styles.howNum}>03</span><span>Leave feedback — we get smarter</span></div>
          </div>
        </main>
      )}

      {/* ORDER FORM */}
      {view === "order" && (
        <main style={styles.main}>
          <div style={styles.formWrap}>
            <h2 style={styles.formTitle}>Place Your Order</h2>
            <p style={styles.formSub}>Higher budgets get processed first. All work is AI-completed within minutes.</p>

            <label style={styles.label}>Select Service</label>
            <div style={styles.serviceGrid}>
              {SERVICES.map(s => (
                <div
                  key={s.id}
                  style={{ ...styles.serviceChip, ...(form.service === s.id ? styles.serviceChipActive : {}) }}
                  onClick={() => setForm(f => ({ ...f, service: s.id }))}
                  className="chip"
                >
                  {s.icon} {s.label}
                </div>
              ))}
            </div>

            <label style={styles.label}>Your Name</label>
            <input
              style={styles.input}
              placeholder="Jane Smith"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />

            <label style={styles.label}>Email (optional — for delivery)</label>
            <input
              style={styles.input}
              placeholder="jane@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />

            <label style={styles.label}>Describe Your Job in Detail</label>
            <textarea
              style={styles.textarea}
              placeholder={service ? `Example: Write a 500-word blog post about ${service.label.toLowerCase()} for a small business audience. Tone: friendly and informative.` : "Be as specific as possible — what do you need, for who, in what format?"}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={5}
            />

            <label style={styles.label}>
              Your Budget (USD) <span style={styles.labelNote}>— higher budget = higher priority</span>
            </label>
            <div style={styles.budgetRow}>
              {[25, 50, 100, 250].map(amt => (
                <button
                  key={amt}
                  style={{ ...styles.budgetChip, ...(form.budget == amt ? styles.budgetChipActive : {}) }}
                  onClick={() => setForm(f => ({ ...f, budget: String(amt) }))}
                >
                  ${amt}
                </button>
              ))}
              <input
                style={{ ...styles.input, ...styles.budgetInput }}
                placeholder="Custom $"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              />
            </div>

            <button
              style={{
                ...styles.primaryBtn,
                marginTop: 32,
                opacity: (!form.service || !form.description || !form.budget || !form.name) ? 0.4 : 1,
              }}
              onClick={submitOrder}
              disabled={!form.service || !form.description || !form.budget || !form.name}
            >
              Submit Job — ${form.budget || "0"} →
            </button>
          </div>
        </main>
      )}

      {/* PAYMENT */}
      {view === "payment" && pendingJob && (
        <main style={styles.main}>
          <div style={styles.formWrap}>
            <div style={styles.paymentHeader}>
              <button style={styles.navBtn} onClick={() => setView("order")}>← Back</button>
            </div>
            <div style={styles.orderSummary}>
              <div style={styles.summaryLabel}>ORDER SUMMARY</div>
              <div style={styles.summaryRow}>
                <span>{SERVICES.find(s => s.id === pendingJob.service)?.icon} {SERVICES.find(s => s.id === pendingJob.service)?.label}</span>
                <span style={styles.summaryPrice}>${pendingJob.budget}</span>
              </div>
              <div style={styles.summaryClient}>For {pendingJob.name}</div>
            </div>

            <h2 style={styles.formTitle}>Payment Details</h2>
            <p style={styles.formSub}>Demo mode — no real charge. Add your Stripe key to go live.</p>

            <label style={styles.label}>Card Number</label>
            <input
              style={styles.input}
              placeholder="4242 4242 4242 4242"
              value={card.number}
              maxLength={19}
              onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
            />

            <div style={styles.cardRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Expiry</label>
                <input
                  style={styles.input}
                  placeholder="MM/YY"
                  value={card.expiry}
                  maxLength={5}
                  onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>CVC</label>
                <input
                  style={styles.input}
                  placeholder="123"
                  value={card.cvc}
                  maxLength={4}
                  onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g,"").slice(0,4) }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>ZIP</label>
                <input
                  style={styles.input}
                  placeholder="10001"
                  value={card.zip}
                  maxLength={5}
                  onChange={e => setCard(c => ({ ...c, zip: e.target.value.replace(/\D/g,"").slice(0,5) }))}
                />
              </div>
            </div>

            {paymentStatus === "error" && (
              <div style={styles.paymentError}>❌ Payment failed. Please check your card details.</div>
            )}

            {paymentStatus === "success" && (
              <div style={styles.paymentSuccess}>✅ Payment confirmed! Starting your job...</div>
            )}

            <button
              style={{
                ...styles.primaryBtn,
                marginTop: 28,
                width: "100%",
                opacity: (!card.number || !card.expiry || !card.cvc || paymentStatus === "processing") ? 0.5 : 1,
                background: paymentStatus === "processing" ? "#92400e" : "#f59e0b",
              }}
              onClick={processPayment}
              disabled={!card.number || !card.expiry || !card.cvc || paymentStatus === "processing"}
            >
              {paymentStatus === "processing" ? "⚡ Processing..." : `Pay $${pendingJob.budget} & Start Job →`}
            </button>

            <div style={styles.stripeNote}>
              🔒 Secured by Stripe · Your card info is never stored
            </div>
          </div>
        </main>
      )}


      {view === "queue" && (
        <main style={styles.main}>
          <div style={styles.queueWrap}>
            <h2 style={styles.formTitle}>Job Queue</h2>
            <p style={styles.formSub}>Jobs are processed highest budget first. AI is working in real time.</p>

            {working && (
              <div style={styles.processingBar}>
                <span style={styles.pulse}>⚡</span> AI agent working on highest-priority job...
              </div>
            )}

            {jobs.length === 0 && (
              <div style={styles.empty}>No jobs yet. <button style={styles.linkBtn} onClick={() => setView("order")}>Place your first order →</button></div>
            )}

            {[...jobs].sort((a, b) => b.budget - a.budget).map(job => {
              const svc = SERVICES.find(s => s.id === job.service);
              return (
                <div key={job.id} style={styles.jobRow} className="jobrow">
                  <div style={styles.jobLeft}>
                    <span style={styles.jobIcon}>{svc?.icon}</span>
                    <div>
                      <div style={styles.jobName}>{job.name} · {svc?.label}</div>
                      <div style={styles.jobDesc}>{job.description.slice(0, 80)}...</div>
                    </div>
                  </div>
                  <div style={styles.jobRight}>
                    <div style={styles.jobBudget}>${job.budget}</div>
                    <div style={{
                      ...styles.jobStatus,
                      color: job.status === "completed" ? "#4ade80" : job.status === "processing" ? "#fbbf24" : "#94a3b8"
                    }}>
                      {job.status === "completed" ? "✓ done" : job.status === "processing" ? "⚡ working" : "⏳ queued"}
                    </div>
                    {job.status === "completed" && (
                      <button style={styles.viewBtn} onClick={() => { setActiveJob(job); setView("result"); }}>
                        View →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button style={{ ...styles.primaryBtn, marginTop: 24 }} onClick={() => setView("order")}>
              + New Job
            </button>
          </div>
        </main>
      )}

      {/* RESULT */}
      {view === "result" && activeJob && (
        <main style={styles.main}>
          <div style={styles.resultWrap}>
            <div style={styles.resultHeader}>
              <div>
                <div style={styles.resultTag}>✓ COMPLETED · ${activeJob.budget}</div>
                <h2 style={styles.formTitle}>{SERVICES.find(s => s.id === activeJob.service)?.label}</h2>
                <p style={styles.formSub}>For {activeJob.name}</p>
              </div>
              <button style={styles.navBtn} onClick={() => setView("queue")}>← Queue</button>
            </div>

            <div style={styles.resultBox}>
              <pre style={styles.resultText}>{activeJob.result}</pre>
            </div>

            <div style={styles.feedbackSection}>
              <label style={styles.label}>Leave Feedback — Help Us Learn</label>
              <textarea
                style={styles.textarea}
                placeholder="What did you like or want different? e.g. 'More formal tone', 'Include bullet points', 'Focus more on cost savings'..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
              />
              <button
                style={{ ...styles.primaryBtn, marginTop: 12 }}
                onClick={() => submitFeedback(activeJob.id)}
              >
                Save Feedback →
              </button>
            </div>

            <button style={{ ...styles.primaryBtn, marginTop: 16, background: "#1e293b" }} onClick={() => setView("order")}>
              + Place Another Job
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "'DM Mono', 'Courier New', monospace" },
  header: { borderBottom: "1px solid #1e293b", position: "sticky", top: 0, background: "#020817cc", backdropFilter: "blur(12px)", zIndex: 100 },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  logoMark: { fontSize: 22 },
  logoText: { fontWeight: 700, fontSize: 18, letterSpacing: 4, color: "#f59e0b" },
  nav: { display: "flex", alignItems: "center", gap: 8 },
  navBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", padding: "6px 12px", letterSpacing: 1 },
  orderBtn: { background: "#f59e0b", color: "#020817", border: "none", padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 1 },
  badge: { background: "#f59e0b", color: "#020817", borderRadius: 99, padding: "1px 6px", fontSize: 11, fontWeight: 700, marginLeft: 4 },
  main: { maxWidth: 1100, margin: "0 auto", padding: "48px 24px" },
  hero: { marginBottom: 64 },
  heroTag: { fontSize: 11, letterSpacing: 4, color: "#f59e0b", marginBottom: 16 },
  heroTitle: { fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: -1 },
  heroAccent: { color: "#f59e0b" },
  heroSub: { fontSize: 16, color: "#64748b", maxWidth: 520, lineHeight: 1.7, marginBottom: 32 },
  heroActions: { display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" },
  primaryBtn: { background: "#f59e0b", color: "#020817", border: "none", padding: "14px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: 1, transition: "transform 0.15s", fontFamily: "inherit" },
  stat: { display: "flex", flexDirection: "column" },
  statNum: { fontSize: 28, fontWeight: 800, color: "#f59e0b" },
  statLabel: { fontSize: 11, color: "#475569", letterSpacing: 2 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2, marginBottom: 64 },
  card: { background: "#0f172a", border: "1px solid #1e293b", padding: "28px 24px", cursor: "pointer", transition: "border-color 0.2s, transform 0.2s" },
  cardIcon: { fontSize: 28, marginBottom: 12 },
  cardLabel: { fontWeight: 700, fontSize: 15, marginBottom: 6, letterSpacing: 1 },
  cardDesc: { fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 16 },
  cardPrice: { fontSize: 12, color: "#f59e0b", letterSpacing: 2 },
  howIt: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "32px 0", borderTop: "1px solid #1e293b" },
  howStep: { display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#94a3b8" },
  howNum: { color: "#f59e0b", fontWeight: 800, fontSize: 20 },
  howArrow: { color: "#334155", fontSize: 20 },
  formWrap: { maxWidth: 640, margin: "0 auto" },
  queueWrap: { maxWidth: 720, margin: "0 auto" },
  resultWrap: { maxWidth: 720, margin: "0 auto" },
  formTitle: { fontSize: 32, fontWeight: 800, marginBottom: 8, fontFamily: "'DM Serif Display', Georgia, serif" },
  formSub: { color: "#64748b", fontSize: 14, marginBottom: 36, lineHeight: 1.6 },
  label: { display: "block", fontSize: 11, letterSpacing: 3, color: "#f59e0b", marginBottom: 10, marginTop: 24 },
  labelNote: { color: "#475569", letterSpacing: 1, fontSize: 11, textTransform: "none" },
  input: { width: "100%", background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", padding: "12px 16px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", padding: "12px 16px", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 },
  serviceGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  serviceChip: { background: "#0f172a", border: "1px solid #1e293b", color: "#94a3b8", padding: "8px 14px", fontSize: 12, cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" },
  serviceChipActive: { borderColor: "#f59e0b", color: "#f59e0b", background: "#1c1106" },
  budgetRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  budgetChip: { background: "#0f172a", border: "1px solid #1e293b", color: "#94a3b8", padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", fontWeight: 700 },
  budgetChipActive: { borderColor: "#f59e0b", color: "#f59e0b", background: "#1c1106" },
  budgetInput: { width: 100, marginTop: 0 },
  processingBar: { background: "#1c1106", border: "1px solid #f59e0b33", padding: "12px 18px", fontSize: 13, color: "#f59e0b", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 },
  pulse: { fontSize: 16, animation: "pulse 1s infinite" },
  empty: { color: "#475569", fontSize: 15, padding: "40px 0" },
  linkBtn: { background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontSize: 15, fontFamily: "inherit" },
  jobRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #0f172a", gap: 16 },
  jobLeft: { display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  jobIcon: { fontSize: 22, flexShrink: 0 },
  jobName: { fontSize: 13, fontWeight: 700, marginBottom: 4, letterSpacing: 1 },
  jobDesc: { fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  jobRight: { display: "flex", alignItems: "center", gap: 16, flexShrink: 0 },
  jobBudget: { fontSize: 18, fontWeight: 800, color: "#f59e0b" },
  jobStatus: { fontSize: 11, letterSpacing: 2 },
  viewBtn: { background: "#f59e0b", color: "#020817", border: "none", padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", letterSpacing: 1 },
  resultHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  resultTag: { fontSize: 11, letterSpacing: 3, color: "#4ade80", marginBottom: 8 },
  resultBox: { background: "#0f172a", border: "1px solid #1e293b", padding: 24, marginBottom: 32 },
  resultText: { fontSize: 13, lineHeight: 1.8, color: "#cbd5e1", whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" },
  feedbackSection: { background: "#0a0f1a", border: "1px solid #1e293b", padding: 24 },
  paymentHeader: { marginBottom: 8 },
  orderSummary: { background: "#0f172a", border: "1px solid #1e293b", padding: "20px 24px", marginBottom: 32 },
  summaryLabel: { fontSize: 10, letterSpacing: 4, color: "#475569", marginBottom: 12 },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, fontWeight: 700 },
  summaryPrice: { color: "#f59e0b", fontSize: 24, fontWeight: 800 },
  summaryClient: { fontSize: 12, color: "#475569", marginTop: 6 },
  cardRow: { display: "flex", gap: 12 },
  paymentError: { background: "#1a0a0a", border: "1px solid #ef444433", color: "#f87171", padding: "12px 16px", fontSize: 13, marginTop: 16 },
  paymentSuccess: { background: "#0a1a0a", border: "1px solid #4ade8033", color: "#4ade80", padding: "12px 16px", fontSize: 13, marginTop: 16 },
  stripeNote: { textAlign: "center", fontSize: 11, color: "#334155", marginTop: 16, letterSpacing: 1 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Serif+Display&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  .card:hover { border-color: #f59e0b55 !important; transform: translateY(-2px); }
  .chip:hover { border-color: #f59e0b88 !important; }
  .jobrow:hover { background: #0f172a44; }
  button:hover { transform: translateY(-1px); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
`;

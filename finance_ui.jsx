import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Fonts & global styles injected once ──────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --surface:   #161b22;
      --surface2:  #1c2330;
      --border:    #2a3441;
      --gold:      #c9a84c;
      --gold-dim:  #8a6f30;'
      --green:     #3fb68b;
      --red:       #e05c5c;
      --text:      #e6edf3;
      --muted:     #7d8da8;
      --font-disp: 'Playfair Display', serif;
      --font-mono: 'DM Mono', monospace;
      --font-body: 'DM Sans', sans-serif;
    }

    body { background: var(--bg); color: var(--text); font-family: var(--font-body); }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-gold {
      0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.0); }
      50%       { box-shadow: 0 0 0 6px rgba(201,168,76,0.12); }
    }
    @keyframes shimmer {
      from { background-position: -200% center; }
      to   { background-position:  200% center; }
    }
    .fade-up { animation: fadeUp 0.45s ease both; }
    .fade-up-1 { animation-delay: 0.05s; }
    .fade-up-2 { animation-delay: 0.10s; }
    .fade-up-3 { animation-delay: 0.15s; }
    .fade-up-4 { animation-delay: 0.20s; }

    input, select {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 14px;
      padding: 10px 14px;
      width: 100%;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    input:focus, select:focus {
      border-color: var(--gold-dim);
      box-shadow: 0 0 0 3px rgba(201,168,76,0.10);
    }
    input::placeholder { color: var(--muted); }
    select option { background: var(--surface); }
  `}</style>
);

// ── Data ──────────────────────────────────────────────────────────────────────
const EXPENSE_CATS = ["Food","Rent","Transport","Entertainment","Health","Shopping","Utilities","Other"];
const INCOME_CATS  = ["Salary","Freelance","Gift","Investment","Other"];

const SEED = (() => {
  const rows = [];
  const months = ["2025-12","2026-01","2026-02","2026-03"];
  const incomeRows = [
    ["Salary",45000,"Monthly salary"],["Freelance",8200,"Web project"],
    ["Investment",3100,"Dividends"],["Gift",2000,"Birthday"],
  ];
  const expRows = [
    ["Rent",12000,"Monthly rent"],["Food",4700,"Groceries"],
    ["Transport",1600,"Metro & cab"],["Utilities",2100,"Electricity"],
    ["Entertainment",1400,"Streaming"],["Shopping",3100,"Clothes"],
    ["Health",900,"Pharmacy"],["Other",700,"Misc"],
  ];
  months.forEach(m => {
    incomeRows.forEach(([cat,amt,desc]) => {
      const v = +(amt*(0.9+Math.random()*0.2)).toFixed(2);
      rows.push({ id: Math.random().toString(36).slice(2), date:`${m}-0${Math.ceil(Math.random()*9+1)}`, type:"income",  category:cat, amount:v, description:desc });
    });
    expRows.forEach(([cat,amt,desc]) => {
      const v = +(amt*(0.85+Math.random()*0.3)).toFixed(2);
      rows.push({ id: Math.random().toString(36).slice(2), date:`${m}-${10+Math.ceil(Math.random()*19)}`, type:"expense", category:cat, amount:v, description:desc });
    });
  });
  return rows.sort((a,b)=>a.date.localeCompare(b.date));
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
const today = () => new Date().toISOString().slice(0,10);

const PIE_COLORS = ["#c9a84c","#3fb68b","#e05c5c","#5b9bd5","#a78bfa","#f59e0b","#34d399","#f87171"];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, delay }) {
  return (
    <div className={`fade-up fade-up-${delay}`} style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "22px 24px",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform:"uppercase", color:"var(--muted)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily:"var(--font-mono)", fontSize: 24, fontWeight:500, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function AddModal({ onAdd, onClose }) {
  const [type, setType]   = useState("expense");
  const [form, setForm]   = useState({ date: today(), category:"", amount:"", description:"" });
  const [err,  setErr]    = useState("");

  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;

  function submit() {
    if (!form.category) return setErr("Pick a category.");
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) return setErr("Enter a valid amount.");
    onAdd({ ...form, type, amount: +form.amount, id: Math.random().toString(36).slice(2) });
    onClose();
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)"
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:18, padding:32, width:"min(460px, 95vw)",
        animation:"fadeUp .3s ease",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ fontFamily:"var(--font-disp)", fontSize:22, color:"var(--gold)" }}>New Transaction</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        {/* Type toggle */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
          {["income","expense"].map(t => (
            <button key={t} onClick={()=>{ setType(t); setForm(f=>({...f,category:""})); }} style={{
              padding:"10px", borderRadius:10, border:"1px solid",
              borderColor: type===t ? (t==="income"?"var(--green)":"var(--red)") : "var(--border)",
              background: type===t ? (t==="income"?"rgba(63,182,139,0.12)":"rgba(224,92,92,0.12)") : "transparent",
              color: type===t ? (t==="income"?"var(--green)":"var(--red)") : "var(--muted)",
              fontFamily:"var(--font-body)", fontWeight:500, fontSize:14, cursor:"pointer",
              textTransform:"capitalize", transition:"all .18s",
            }}>{t}</button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:"var(--muted)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"var(--muted)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Amount (₹)</label>
              <input type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
            </div>
          </div>

          <div>
            <label style={{ fontSize:11, color:"var(--muted)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              <option value="">Select…</option>
              {cats.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize:11, color:"var(--muted)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Description</label>
            <input placeholder="Optional note…" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
        </div>

        {err && <div style={{ color:"var(--red)", fontSize:13, marginTop:10 }}>⚠ {err}</div>}

        <button onClick={submit} style={{
          marginTop:22, width:"100%", padding:"13px",
          background: "linear-gradient(135deg, var(--gold-dim), var(--gold))",
          border:"none", borderRadius:10, color:"#0d1117",
          fontFamily:"var(--font-body)", fontWeight:600, fontSize:15, cursor:"pointer",
          letterSpacing:".04em", transition:"opacity .18s",
        }}
        onMouseOver={e=>e.target.style.opacity=".88"}
        onMouseOut={e=>e.target.style.opacity="1"}
        >Save Transaction</button>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", fontFamily:"var(--font-mono)", fontSize:13 }}>
      <div style={{ color:"var(--muted)", marginBottom:4 }}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{ color:p.color }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [txns,    setTxns]    = useState(SEED);
  const [tab,     setTab]     = useState("dashboard");
  const [modal,   setModal]   = useState(false);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");

  // ── Derived stats ──
  const totalIncome  = txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount, 0);
  const totalExpense = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? ((balance/totalIncome)*100).toFixed(1) : "0.0";

  // ── Monthly bar data ──
  const monthlyMap = {};
  txns.forEach(t => {
    const m = t.date.slice(0,7);
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, Income:0, Expense:0 };
    monthlyMap[m][t.type==="income"?"Income":"Expense"] += t.amount;
  });
  const barData = Object.values(monthlyMap).sort((a,b)=>a.month.localeCompare(b.month)).map(d=>({
    ...d,
    month: new Date(d.month+"-01").toLocaleDateString("en",{month:"short",year:"2-digit"})
  }));

  // ── Pie data ──
  const pieMap = {};
  txns.filter(t=>t.type==="expense").forEach(t => {
    pieMap[t.category] = (pieMap[t.category]||0) + t.amount;
  });
  const pieData = Object.entries(pieMap).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));

  // ── Monthly summary table ──
  const summaryRows = Object.values(monthlyMap).sort((a,b)=>b.month.localeCompare(a.month)).map(d=>({
    month: d.month,
    label: new Date(d.month+"-01").toLocaleDateString("en",{month:"long", year:"numeric"}),
    income:  d.Income,
    expense: d.Expense,
    net: d.Income - d.Expense,
  }));

  // ── Filtered transactions ──
  const filtered = txns
    .filter(t => filter==="all" || t.type===filter)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>b.date.localeCompare(a.date));

  function addTxn(txn) {
    setTxns(prev=>[...prev, txn]);
  }
  function deleteTxn(id) {
    setTxns(prev=>prev.filter(t=>t.id!==id));
  }

  const NAV = ["dashboard","transactions","charts","summary"];

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight:"100vh", background:"var(--bg)" }}>

        {/* ── Sidebar ── */}
        <div style={{
          position:"fixed", left:0, top:0, bottom:0, width:220,
          background:"var(--surface)", borderRight:"1px solid var(--border)",
          display:"flex", flexDirection:"column", padding:"28px 0", zIndex:50,
        }}>
          {/* Logo */}
          <div style={{ padding:"0 24px 28px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontFamily:"var(--font-disp)", fontSize:20, color:"var(--gold)", lineHeight:1.2 }}>Finance<br/>Tracker</div>
            <div style={{ fontSize:11, color:"var(--muted)", marginTop:4, letterSpacing:".06em" }}>PERSONAL LEDGER</div>
          </div>

          {/* Nav */}
          <nav style={{ padding:"20px 12px", flex:1, display:"flex", flexDirection:"column", gap:4 }}>
            {NAV.map(n => (
              <button key={n} onClick={()=>setTab(n)} style={{
                background: tab===n ? "rgba(201,168,76,0.10)" : "transparent",
                border: "none",
                borderRadius: 9,
                borderLeft: tab===n ? "3px solid var(--gold)" : "3px solid transparent",
                color: tab===n ? "var(--gold)" : "var(--muted)",
                fontFamily:"var(--font-body)", fontSize:14, fontWeight: tab===n?500:400,
                padding:"10px 14px", cursor:"pointer", textAlign:"left",
                textTransform:"capitalize", transition:"all .18s", letterSpacing:".02em",
              }}>{n === "dashboard" ? "📊 Dashboard" : n==="transactions" ? "📋 Transactions" : n==="charts" ? "📈 Charts" : "📅 Summary"}</button>
            ))}
          </nav>

          {/* Add button */}
          <div style={{ padding:"0 12px" }}>
            <button onClick={()=>setModal(true)} style={{
              width:"100%", padding:"12px",
              background:"linear-gradient(135deg,var(--gold-dim),var(--gold))",
              border:"none", borderRadius:10, color:"#0d1117",
              fontFamily:"var(--font-body)", fontWeight:600, fontSize:14,
              cursor:"pointer", letterSpacing:".04em",
              transition:"opacity .18s", animation:"pulse-gold 3s infinite",
            }}
            onMouseOver={e=>e.currentTarget.style.opacity=".85"}
            onMouseOut={e=>e.currentTarget.style.opacity="1"}
            >+ Add Transaction</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ marginLeft:220, padding:"36px 40px", minHeight:"100vh" }}>

          {/* ── DASHBOARD ── */}
          {tab==="dashboard" && (
            <div>
              <div className="fade-up" style={{ marginBottom:32 }}>
                <h1 style={{ fontFamily:"var(--font-disp)", fontSize:32, color:"var(--text)" }}>Good day 👋</h1>
                <p style={{ color:"var(--muted)", fontSize:14, marginTop:4 }}>Here's your financial overview.</p>
              </div>

              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:36 }}>
                <StatCard delay={1} label="Total Balance"   value={fmt(balance)}       color={balance>=0?"var(--green)":"var(--red)"} sub={`Savings rate ${savingsRate}%`} />
                <StatCard delay={2} label="Total Income"    value={fmt(totalIncome)}    color="var(--green)"  sub={`${txns.filter(t=>t.type==="income").length} entries`} />
                <StatCard delay={3} label="Total Expenses"  value={fmt(totalExpense)}   color="var(--red)"    sub={`${txns.filter(t=>t.type==="expense").length} entries`} />
                <StatCard delay={4} label="Transactions"    value={txns.length}         color="var(--gold)"   sub="All time" />
              </div>

              {/* Charts row */}
              <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:20 }}>
                <div className="fade-up fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:24 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:20 }}>Monthly Overview</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} barGap={4}>
                      <XAxis dataKey="month" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fill:"var(--muted)",fontSize:11,fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false} tickFormatter={v=>"₹"+Math.round(v/1000)+"k"} />
                      <Tooltip content={<CustomTooltip/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
                      <Bar dataKey="Income"  fill="var(--green)" radius={[4,4,0,0]} />
                      <Bar dataKey="Expense" fill="var(--red)"   radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="fade-up fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:24 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:20 }}>Expense Breakdown</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v)=>fmt(v)} contentStyle={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,fontFamily:"var(--font-mono)",fontSize:12}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px", marginTop:8 }}>
                    {pieData.slice(0,5).map((d,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--muted)" }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:PIE_COLORS[i%PIE_COLORS.length], display:"inline-block" }}/>
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent txns */}
              <div className="fade-up fade-up-4" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:24, marginTop:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase" }}>Recent Transactions</div>
                  <button onClick={()=>setTab("transactions")} style={{ background:"none", border:"none", color:"var(--gold)", fontSize:12, cursor:"pointer" }}>View all →</button>
                </div>
                {txns.slice(-6).reverse().map(t=>(
                  <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background: t.type==="income"?"rgba(63,182,139,0.12)":"rgba(224,92,92,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                        {t.type==="income"?"↑":"↓"}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:500 }}>{t.category}</div>
                        <div style={{ fontSize:12, color:"var(--muted)" }}>{t.date}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:15, color: t.type==="income"?"var(--green)":"var(--red)" }}>
                      {t.type==="income"?"+":"-"}{fmt(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {tab==="transactions" && (
            <div>
              <div className="fade-up" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
                <div>
                  <h1 style={{ fontFamily:"var(--font-disp)", fontSize:28 }}>Transactions</h1>
                  <p style={{ color:"var(--muted)", fontSize:13, marginTop:3 }}>{filtered.length} records</p>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <input style={{ width:200 }} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
                  <select style={{ width:130 }} value={filter} onChange={e=>setFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>

              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"110px 80px 130px 1fr 130px 40px", gap:0, padding:"12px 20px", borderBottom:"1px solid var(--border)", fontSize:11, color:"var(--muted)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  <span>Date</span><span>Type</span><span>Category</span><span>Description</span><span style={{textAlign:"right"}}>Amount</span><span/>
                </div>
                {filtered.length===0 && (
                  <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>No transactions found.</div>
                )}
                {filtered.map((t,i)=>(
                  <div key={t.id} className={i<8?"fade-up":""} style={{
                    display:"grid", gridTemplateColumns:"110px 80px 130px 1fr 130px 40px",
                    gap:0, padding:"13px 20px", borderBottom:"1px solid var(--border)",
                    alignItems:"center", transition:"background .15s",
                  }}
                  onMouseOver={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}
                  >
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)" }}>{t.date}</span>
                    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:20, background: t.type==="income"?"rgba(63,182,139,0.12)":"rgba(224,92,92,0.12)", color: t.type==="income"?"var(--green)":"var(--red)", textAlign:"center", width:"fit-content" }}>{t.type}</span>
                    <span style={{ fontSize:13 }}>{t.category}</span>
                    <span style={{ fontSize:13, color:"var(--muted)", paddingRight:16 }}>{t.description||"—"}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color: t.type==="income"?"var(--green)":"var(--red)" }}>
                      {t.type==="income"?"+":"-"}{fmt(t.amount)}
                    </span>
                    <button onClick={()=>deleteTxn(t.id)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:16, padding:4, transition:"color .15s" }}
                      onMouseOver={e=>e.currentTarget.style.color="var(--red)"}
                      onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CHARTS ── */}
          {tab==="charts" && (
            <div>
              <div className="fade-up" style={{ marginBottom:28 }}>
                <h1 style={{ fontFamily:"var(--font-disp)", fontSize:28 }}>Charts</h1>
                <p style={{ color:"var(--muted)", fontSize:13, marginTop:3 }}>Visual breakdown of your finances.</p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
                <div className="fade-up fade-up-1" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:28 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:20 }}>Monthly Income vs Expense</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} barGap={6}>
                      <XAxis dataKey="month" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"var(--muted)",fontSize:11,fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false} tickFormatter={v=>"₹"+Math.round(v/1000)+"k"}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                      <Legend wrapperStyle={{fontSize:12,color:"var(--muted)"}}/>
                      <Bar dataKey="Income"  fill="var(--green)" radius={[5,5,0,0]}/>
                      <Bar dataKey="Expense" fill="var(--red)"   radius={[5,5,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="fade-up fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:28 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:20 }}>Expense by Category</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={95} paddingAngle={3} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:"var(--muted)",strokeWidth:.8}}>
                        {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,fontFamily:"var(--font-mono)",fontSize:12}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category bar */}
              <div className="fade-up fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:28 }}>
                <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:20 }}>Spending by Category — All Time</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {pieData.map((d,i)=>{
                    const pct = (d.value / totalExpense * 100).toFixed(1);
                    return (
                      <div key={d.name}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:13 }}>{d.name}</span>
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:"var(--muted)" }}>{fmt(d.value)} · {pct}%</span>
                        </div>
                        <div style={{ height:6, background:"var(--border)", borderRadius:99 }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:PIE_COLORS[i%PIE_COLORS.length], borderRadius:99, transition:"width .8s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── SUMMARY ── */}
          {tab==="summary" && (
            <div>
              <div className="fade-up" style={{ marginBottom:28 }}>
                <h1 style={{ fontFamily:"var(--font-disp)", fontSize:28 }}>Monthly Summary</h1>
                <p style={{ color:"var(--muted)", fontSize:13, marginTop:3 }}>Income, expenses and net balance per month.</p>
              </div>

              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"14px 24px", borderBottom:"1px solid var(--border)", fontSize:11, color:"var(--muted)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  <span>Month</span><span style={{textAlign:"right"}}>Income</span><span style={{textAlign:"right"}}>Expenses</span><span style={{textAlign:"right"}}>Net Balance</span>
                </div>
                {summaryRows.map((r,i)=>(
                  <div key={r.month} className={`fade-up`} style={{
                    display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr",
                    padding:"16px 24px", borderBottom:"1px solid var(--border)",
                    transition:"background .15s",
                  }}
                  onMouseOver={e=>e.currentTarget.style.background="var(--surface2)"}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}
                  >
                    <span style={{ fontFamily:"var(--font-disp)", fontSize:15 }}>{r.label}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color:"var(--green)" }}>+{fmt(r.income)}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color:"var(--red)" }}>-{fmt(r.expense)}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color: r.net>=0?"var(--gold)":"var(--red)", fontWeight:500 }}>
                      {r.net>=0?"+":""}{fmt(r.net)}
                    </span>
                  </div>
                ))}
                {/* Totals row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"16px 24px", background:"rgba(201,168,76,0.05)", borderTop:"2px solid var(--border)" }}>
                  <span style={{ fontFamily:"var(--font-disp)", fontSize:15, color:"var(--gold)" }}>All Time</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color:"var(--green)", fontWeight:500 }}>+{fmt(totalIncome)}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color:"var(--red)", fontWeight:500 }}>-{fmt(totalExpense)}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:14, textAlign:"right", color: balance>=0?"var(--gold)":"var(--red)", fontWeight:600 }}>
                    {balance>=0?"+":""}{fmt(balance)}
                  </span>
                </div>
              </div>

              {/* Savings rate banner */}
              <div className="fade-up fade-up-2" style={{ marginTop:20, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:24, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6 }}>Overall Savings Rate</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:36, color: +savingsRate>=20?"var(--green)":+savingsRate>=0?"var(--gold)":"var(--red)" }}>{savingsRate}%</div>
                </div>
                <div style={{ textAlign:"right", color:"var(--muted)", fontSize:13, maxWidth:260 }}>
                  {+savingsRate>=20 ? "🎉 Excellent! You're saving more than 20% of your income." :
                   +savingsRate>=10 ? "👍 Good start. Aim for 20%+ for financial security." :
                   +savingsRate>=0  ? "⚠️ Low savings rate. Try reducing non-essential expenses." :
                                      "🚨 Spending exceeds income. Review your budget immediately."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && <AddModal onAdd={addTxn} onClose={()=>setModal(false)} />}
    </>
  );
}

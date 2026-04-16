/* =============================================
   base.js — Shared utilities for all pages
   AQI Intelligence System
   ============================================= */

// ── AQI Helpers ─────────────────────────────

const AQI = {
  buckets: {
    Good: { color: "#639922", bg: "#EAF3DE", range: "0-50" },
    Satisfactory: { color: "#1D9E75", bg: "#E1F5EE", range: "51-100" },
    Moderate: { color: "#EF9F27", bg: "#FAEEDA", range: "101-200" },
    Poor: { color: "#D85A30", bg: "#FDF0EA", range: "201-300" },
    "Very Poor": { color: "#A32D2D", bg: "#FAEAEA", range: "301-400" },
    Severe: { color: "#2C2C2A", bg: "#E8E6DF", range: "401+" },
  },

  getColor(bucket) {
    return this.buckets[bucket]?.color ?? "#888780";
  },

  getBg(bucket) {
    return this.buckets[bucket]?.bg ?? "#F1EFE8";
  },

  getBucket(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Satisfactory";
    if (aqi <= 200) return "Moderate";
    if (aqi <= 300) return "Poor";
    if (aqi <= 400) return "Very Poor";
    return "Severe";
  },

  cssClass(bucket) {
    const map = {
      Good: "good",
      Satisfactory: "satisfactory",
      Moderate: "moderate",
      Poor: "poor",
      "Very Poor": "very-poor",
      Severe: "severe",
    };
    return map[bucket] ?? "";
  },
};

// ── Plotly Default Config ────────────────────

const PLOTLY_CONFIG = {
  displayModeBar: true,
  modeBarButtonsToRemove: [
    "select2d",
    "lasso2d",
    "autoScale2d",
    "hoverClosestCartesian",
    "hoverCompareCartesian",
    "toggleSpikelines",
  ],
  responsive: true,
  displaylogo: false,
};

const PLOTLY_LAYOUT_BASE = {
  font: {
    family: "'DM Sans', system-ui, sans-serif",
    color: "#5A5A58",
    size: 12,
  },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  margin: { t: 30, r: 20, b: 40, l: 50 },
  xaxis: {
    gridcolor: "#E2DFD8",
    linecolor: "#E2DFD8",
    tickcolor: "#E2DFD8",
    zerolinecolor: "#E2DFD8",
  },
  yaxis: {
    gridcolor: "#E2DFD8",
    linecolor: "#E2DFD8",
    tickcolor: "#E2DFD8",
    zerolinecolor: "#E2DFD8",
  },
  legend: {
    bgcolor: "rgba(255,255,255,0.8)",
    bordercolor: "#E2DFD8",
    borderwidth: 1,
  },
};

// ── API Helpers ──────────────────────────────

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Month Names ──────────────────────────────

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ── Number Formatting ────────────────────────

function fmt(val, dec = 1) {
  if (val === null || val === undefined) return "-";
  return Number(val).toFixed(dec);
}

function fmtPct(val, dec = 1) {
  if (val === null || val === undefined) return "-";
  const sign = val > 0 ? "+" : "";
  return `${sign}${Number(val).toFixed(dec)}%`;
}

// ── DOM Helpers ──────────────────────────────

function el(id) {
  return document.getElementById(id);
}
function qs(sel) {
  return document.querySelector(sel);
}
function qsa(sel) {
  return document.querySelectorAll(sel);
}

function show(id) {
  const e = el(id);
  if (e) e.style.display = "";
}
function hide(id) {
  const e = el(id);
  if (e) e.style.display = "none";
}

function setHtml(id, html) {
  const e = el(id);
  if (e) e.innerHTML = html;
}

function setText(id, text) {
  const e = el(id);
  if (e) e.textContent = text;
}

// ── Toast Notifications ──────────────────────

function showToast(message, type = "info") {
  const existing = qs(".toast");
  if (existing) existing.remove();

  const colors = {
    info: "#1D9E75",
    error: "#E24B4A",
    warning: "#EF9F27",
    success: "#639922",
  };

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #2C2C2A;
        color: #fff;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        border-left: 3px solid ${colors[type] ?? colors.info};
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.2s ease;
        max-width: 320px;
        font-family: 'DM Sans', sans-serif;
    `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Inline styles for toast animation ────────
const toastStyle = document.createElement("style");
toastStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(20px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }
`;
document.head.appendChild(toastStyle);

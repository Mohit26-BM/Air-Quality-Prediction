/* =============================================
   validation.js — Validation page
   ============================================= */

const MONTH_NAMES = [
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

// ── Static data ───────────────────────────────

// Five-city alignment (from section 10.2)
const ALIGNMENT_DATA = [
  {
    city: "Delhi",
    trainWinter: 356.7,
    cpcbWinter: 311.1,
    trainMonsoon: 136.0,
    cpcbMonsoon: 84.1,
  },
  {
    city: "Mumbai",
    trainWinter: 159.1,
    cpcbWinter: 136.7,
    trainMonsoon: 68.1,
    cpcbMonsoon: 43.4,
  },
  {
    city: "Chennai",
    trainWinter: 119.5,
    cpcbWinter: 84.6,
    trainMonsoon: 106.7,
    cpcbMonsoon: 66.3,
  },
  {
    city: "Kolkata",
    trainWinter: 260.2,
    cpcbWinter: 171.8,
    trainMonsoon: 59.4,
    cpcbMonsoon: 46.5,
  },
  {
    city: "Bengaluru",
    trainWinter: 104.4,
    cpcbWinter: 87.6,
    trainMonsoon: 87.8,
    cpcbMonsoon: 53.5,
  },
];

// Annual comparison (from section 10.3)
const ANNUAL_COMPARISON = [
  { city: "Delhi", train: 259.2, cpcb: 209.1 },
  { city: "Mumbai", train: 105.6, cpcb: 91.2 },
  { city: "Chennai", train: 113.7, cpcb: 71.8 },
  { city: "Kolkata", train: 141.2, cpcb: 100.9 },
  { city: "Bengaluru", train: 94.2, cpcb: 73.9 },
];

// SHAP agreement (from section 10.4)
const SHAP_AGREEMENT = [
  {
    pollutant: "PM2.5",
    winterPct: 89.3,
    monsoonPct: 14.5,
    expected: "Winter",
    agrees: true,
  },
  {
    pollutant: "PM10",
    winterPct: 98.3,
    monsoonPct: 46.8,
    expected: "Winter",
    agrees: true,
  },
  {
    pollutant: "NO2",
    winterPct: 26.4,
    monsoonPct: 85.5,
    expected: "Monsoon",
    agrees: true,
  },
  {
    pollutant: "CO",
    winterPct: 1.7,
    monsoonPct: 72.6,
    expected: "Monsoon",
    agrees: true,
  },
  {
    pollutant: "Ozone",
    winterPct: 17.4,
    monsoonPct: 79.0,
    expected: "Monsoon",
    agrees: true,
  },
];

// Delhi Nov-Dec severity (from section 10.5)
const WINTER_SEVERITY = {
  train: { mean: 386.3, median: 381.0, p75: 438.0, max: 716.0 },
  cpcb: { mean: 333.4, median: 346.0, p75: 393.0, max: 494.0 },
};

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const defaultCity = "Delhi";
  renderSeasonalChart(defaultCity);
  renderDiffChart(defaultCity);
  renderAlignmentTable();
  renderProminenceCharts();
  renderAgreementTable();
  renderAnnualComparison();
  renderWinterSeverity();

  document.getElementById("val-city-select").addEventListener("change", (e) => {
    const city = e.target.value;
    setText(
      "seasonal-subtitle",
      `Training 2015–2020 vs CPCB 2024 — ${city} monthly mean AQI`,
    );
    renderSeasonalChart(city);
    renderDiffChart(city);
  });
});

// ── Seasonal comparison line chart ───────────
function renderSeasonalChart(city) {
  Plotly.purge("seasonal-chart");

  const cityData = VALIDATION_DATA[city];
  if (!cityData) return;

  const trainVals = MONTH_NAMES.map((_, i) => cityData[i + 1]?.train ?? null);
  const cpcbVals = MONTH_NAMES.map((_, i) => cityData[i + 1]?.cpcb ?? null);

  const traces = [
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Training 2015–20",
      x: MONTH_NAMES,
      y: trainVals,
      line: { color: "#1D9E75", width: 2.5 },
      marker: { color: "#1D9E75", size: 7 },
      connectgaps: true,
      hovertemplate: "<b>%{x}</b><br>Training: %{y:.1f}<extra></extra>",
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: "CPCB 2024",
      x: MONTH_NAMES,
      y: cpcbVals,
      line: { color: "#EF9F27", width: 2.5, dash: "dot" },
      marker: {
        color: "#EF9F27",
        size: 7,
        symbol: "square",
      },
      connectgaps: true,
      hovertemplate: "<b>%{x}</b><br>CPCB 2024: %{y:.1f}<extra></extra>",
    },
  ];

  // Shading
  const shapes = [
    {
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: 9.5,
      x1: 11.5,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(29,158,117,0.06)",
      line: { width: 0 },
    },
    {
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: -0.5,
      x1: 1.5,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(29,158,117,0.06)",
      line: { width: 0 },
    },
    {
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: 5.5,
      x1: 7.5,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(239,159,39,0.06)",
      line: { width: 0 },
    },
  ];

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    shapes,
    annotations: [
      {
        x: 10.5,
        yref: "paper",
        y: 0.97,
        text: "Winter",
        showarrow: false,
        font: { size: 9, color: "#1D9E75" },
      },
      {
        x: 6.5,
        yref: "paper",
        y: 0.97,
        text: "Monsoon",
        showarrow: false,
        font: { size: 9, color: "#EF9F27" },
      },
    ],
    margin: { t: 20, r: 20, b: 40, l: 55 },
    showlegend: true,
    legend: { orientation: "h", y: -0.2 },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Mean AQI", font: { size: 11 } },
    },
  };

  Plotly.newPlot("seasonal-chart", traces, layout, PLOTLY_CONFIG);
}

// ── Monthly difference bar ────────────────────
function renderDiffChart(city) {
  Plotly.purge("diff-chart");

  const cityData = VALIDATION_DATA[city];
  if (!cityData) return;

  const diffs = MONTH_NAMES.map((_, i) => {
    const d = cityData[i + 1];
    return d ? d.cpcb - d.train : null;
  });

  const colors = diffs.map(
    (v) =>
      v === null
        ? "#E2DFD8"
        : v < 0
          ? "#1D9E75" // improvement — teal
          : "#E24B4A", // worse — red
  );

  const trace = {
    type: "bar",
    x: MONTH_NAMES,
    y: diffs,
    marker: { color: colors, opacity: 0.85 },
    hovertemplate: "<b>%{x}</b><br>Difference: %{y:+.1f} AQI<extra></extra>",
    text: diffs.map((v) =>
      v !== null ? (v > 0 ? "+" : "") + v.toFixed(1) : "",
    ),
    textposition: "outside",
    textfont: { size: 9, color: "#888780" },
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 20, r: 20, b: 40, l: 55 },
    shapes: [
      {
        type: "line",
        x0: -0.5,
        x1: 11.5,
        y0: 0,
        y1: 0,
        xref: "x",
        yref: "y",
        line: { color: "#C0BDB6", width: 1.5 },
      },
    ],
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "CPCB 2024 − Training (AQI)", font: { size: 11 } },
      zeroline: false,
    },
  };

  Plotly.newPlot("diff-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── Five-city alignment table ─────────────────
function renderAlignmentTable() {
  const tbody = document.getElementById("alignment-body");
  tbody.innerHTML = ALIGNMENT_DATA.map((row) => {
    const trainAligned = row.trainWinter > row.trainMonsoon;
    const cpcbAligned = row.cpcbWinter > row.cpcbMonsoon;
    const aligned = trainAligned === cpcbAligned;

    return `<tr>
            <td><strong>${row.city}</strong></td>
            <td class="text-right mono">${row.trainWinter.toFixed(1)}</td>
            <td class="text-right mono">${row.cpcbWinter.toFixed(1)}</td>
            <td class="text-right mono">${row.trainMonsoon.toFixed(1)}</td>
            <td class="text-right mono">${row.cpcbMonsoon.toFixed(1)}</td>
            <td class="text-right">
                <span style="color:${aligned ? "var(--teal-400)" : "var(--red-400)"};
                             font-weight:600;font-size:0.85rem">
                    ${aligned ? "✓ YES" : "✗ NO"}
                </span>
            </td>
        </tr>`;
  }).join("");
}

// ── Prominence charts (winter + monsoon) ──────
function renderProminenceCharts() {
  const pollutants = SHAP_AGREEMENT.map((r) => r.pollutant);

  // Winter chart
  Plotly.newPlot(
    "prominence-winter-chart",
    [
      {
        type: "bar",
        x: pollutants,
        y: SHAP_AGREEMENT.map((r) => r.winterPct),
        marker: { color: "#1D9E75", opacity: 0.85 },
        hovertemplate:
          "<b>%{x}</b><br>Winter: %{y:.1f}% of days<extra></extra>",
        text: SHAP_AGREEMENT.map((r) => r.winterPct.toFixed(0) + "%"),
        textposition: "outside",
        textfont: { size: 10 },
      },
    ],
    {
      ...PLOTLY_LAYOUT_BASE,
      margin: { t: 10, r: 20, b: 40, l: 40 },
      yaxis: {
        ...PLOTLY_LAYOUT_BASE.yaxis,
        title: { text: "% of days", font: { size: 10 } },
        range: [0, 115],
      },
    },
    PLOTLY_CONFIG,
  );

  // Monsoon chart
  Plotly.newPlot(
    "prominence-monsoon-chart",
    [
      {
        type: "bar",
        x: pollutants,
        y: SHAP_AGREEMENT.map((r) => r.monsoonPct),
        marker: { color: "#EF9F27", opacity: 0.85 },
        hovertemplate:
          "<b>%{x}</b><br>Monsoon: %{y:.1f}% of days<extra></extra>",
        text: SHAP_AGREEMENT.map((r) => r.monsoonPct.toFixed(0) + "%"),
        textposition: "outside",
        textfont: { size: 10 },
      },
    ],
    {
      ...PLOTLY_LAYOUT_BASE,
      margin: { t: 10, r: 20, b: 40, l: 40 },
      yaxis: {
        ...PLOTLY_LAYOUT_BASE.yaxis,
        title: { text: "% of days", font: { size: 10 } },
        range: [0, 115],
      },
    },
    PLOTLY_CONFIG,
  );
}

// ── SHAP agreement table ──────────────────────
function renderAgreementTable() {
  const wrap = document.getElementById("agreement-table-wrap");
  wrap.innerHTML = SHAP_AGREEMENT.map(
    (row) => `
        <div class="agreement-row">
            <span class="agreement-pollutant">${row.pollutant}</span>
            <span style="font-size:0.72rem;color:var(--text-muted)">
                → ${row.expected}
            </span>
            <span class="agreement-check ${row.agrees ? "yes" : "no"}">
                ${row.agrees ? "✓ YES" : "✗ NO"}
            </span>
        </div>`,
  ).join("");
}

// ── Annual comparison grouped bar ─────────────
function renderAnnualComparison() {
  const cities = ANNUAL_COMPARISON.map((r) => r.city);
  const trains = ANNUAL_COMPARISON.map((r) => r.train);
  const cpcbs = ANNUAL_COMPARISON.map((r) => r.cpcb);
  const pcts = ANNUAL_COMPARISON.map((r) =>
    (((r.cpcb - r.train) / r.train) * 100).toFixed(1),
  );

  const traces = [
    {
      type: "bar",
      name: "Training 2015–20",
      x: cities,
      y: trains,
      marker: { color: "#1D9E75", opacity: 0.85 },
      hovertemplate: "<b>%{x}</b><br>Training mean: %{y:.1f}<extra></extra>",
    },
    {
      type: "bar",
      name: "CPCB 2024",
      x: cities,
      y: cpcbs,
      marker: { color: "#EF9F27", opacity: 0.85 },
      hovertemplate: "<b>%{x}</b><br>CPCB 2024 mean: %{y:.1f}<extra></extra>",
      text: pcts.map((p) => p + "%"),
      textposition: "outside",
      textfont: { size: 9, color: "#888780" },
    },
  ];

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    barmode: "group",
    margin: { t: 30, r: 20, b: 40, l: 55 },
    showlegend: true,
    legend: { orientation: "h", y: -0.2 },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Mean AQI", font: { size: 11 } },
    },
  };

  Plotly.newPlot("annual-comparison-chart", traces, layout, PLOTLY_CONFIG);
}

// ── Delhi Nov-Dec severity grouped bar ────────
function renderWinterSeverity() {
  const metrics = ["Mean", "Median", "75th pct", "Max"];
  const trainV = [
    WINTER_SEVERITY.train.mean,
    WINTER_SEVERITY.train.median,
    WINTER_SEVERITY.train.p75,
    WINTER_SEVERITY.train.max,
  ];
  const cpcbV = [
    WINTER_SEVERITY.cpcb.mean,
    WINTER_SEVERITY.cpcb.median,
    WINTER_SEVERITY.cpcb.p75,
    WINTER_SEVERITY.cpcb.max,
  ];

  const traces = [
    {
      type: "bar",
      name: "Training 2015–20",
      x: metrics,
      y: trainV,
      marker: { color: "#1D9E75", opacity: 0.85 },
      hovertemplate: "<b>%{x}</b><br>Training: %{y:.1f}<extra></extra>",
      text: trainV.map((v) => v.toFixed(0)),
      textposition: "outside",
      textfont: { size: 9 },
    },
    {
      type: "bar",
      name: "CPCB 2024",
      x: metrics,
      y: cpcbV,
      marker: { color: "#EF9F27", opacity: 0.85 },
      hovertemplate: "<b>%{x}</b><br>CPCB 2024: %{y:.1f}<extra></extra>",
      text: cpcbV.map((v) => v.toFixed(0)),
      textposition: "outside",
      textfont: { size: 9 },
    },
  ];

  // AQI threshold reference lines
  const shapes = [300, 400].map((val) => ({
    type: "line",
    xref: "paper",
    yref: "y",
    x0: 0,
    x1: 1,
    y0: val,
    y1: val,
    line: {
      color: val === 300 ? "#EF9F27" : "#E24B4A",
      width: 1,
      dash: "dot",
    },
  }));

  const annotations = [
    {
      x: 1,
      y: 305,
      xref: "paper",
      yref: "y",
      text: "Poor",
      showarrow: false,
      font: { size: 9, color: "#EF9F27" },
      xanchor: "right",
    },
    {
      x: 1,
      y: 405,
      xref: "paper",
      yref: "y",
      text: "Very Poor",
      showarrow: false,
      font: { size: 9, color: "#E24B4A" },
      xanchor: "right",
    },
  ];

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    barmode: "group",
    shapes,
    annotations,
    margin: { t: 20, r: 20, b: 40, l: 55 },
    showlegend: true,
    legend: { orientation: "h", y: -0.2 },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "AQI", font: { size: 11 } },
    },
    title: {
      text: "Delhi — November & December",
      font: { size: 11, color: "#888780" },
      x: 0.5,
      y: 0.98,
    },
  };

  Plotly.newPlot("winter-severity-chart", traces, layout, PLOTLY_CONFIG);
}

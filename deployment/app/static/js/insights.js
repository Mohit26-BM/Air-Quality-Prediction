/* =============================================
   insights.js — Model Insights page
   ============================================= */

// ── Seasonal SHAP data (hardcoded from notebook) ──
const SHAP_SEASONAL = {
  winter: {
    "PM2.5": 42.81,
    "PM2.5_lag1": 27.51,
    PM10: 9.2,
    CO: 4.42,
    city_aqi_mean: 3.44,
    O3: 2.5,
    NO2: 1.14,
  },
  monsoon: {
    "PM2.5": 40.94,
    "PM2.5_lag1": 31.47,
    PM10: 8.8,
    CO: 7.39,
    city_aqi_mean: 3.68,
    O3: 3.34,
    NO2: 1.06,
  },
};

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderLeaderboard("r2");
  renderShapBar();
  renderShapCategory();
  renderShapSeasonal();

  // Tab switching
  document.querySelectorAll(".lb-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".lb-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderLeaderboard(btn.dataset.metric);
    });
  });
});

// ── Model leaderboard chart ───────────────────
function renderLeaderboard(metric) {
  const chartEl = document.getElementById("leaderboard-chart");
  const higherBetter = metric === "r2";
  const sorted = [...MODEL_METRICS].sort((a, b) =>
    higherBetter
      ? Number(b[metric]) - Number(a[metric])
      : Number(a[metric]) - Number(b[metric]),
  );

  const labels = sorted.map((m) => m.model);
  const values = sorted.map((m) => Number(m[metric]));
  const maxValue = Math.max(...values);
  const colors = sorted.map((m) => {
    if (m.final) return "#1D9E75";
    if (m.baseline) return "#888780";
    return "#E1F5EE";
  });
  const borders = sorted.map((m) => {
    if (m.final) return "#085041";
    if (m.baseline) return "#C0BDB6";
    return "#1D9E75";
  });

  const metricLabels = {
    r2: "R2 Score (higher is better)",
    mae: "MAE - ug/m3 (lower is better)",
    rmse: "RMSE - ug/m3 (lower is better)",
  };

  const trace = {
    type: "bar",
    orientation: "h",
    x: values,
    y: labels,
    cliponaxis: false,
    marker: {
      color: colors,
      line: { color: borders, width: 1.5 },
    },
    text: values.map((v) => (metric === "r2" ? v.toFixed(4) : v.toFixed(2))),
    textposition: "outside",
    textfont: { size: 10, color: "#5A5A58" },
    hovertemplate:
      "<b>%{y}</b><br>" + metricLabels[metric] + ": %{x}<extra></extra>",
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 80, b: 30, l: 160 },
    bargap: 0.28,
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      type: "linear",
      title: { text: metricLabels[metric], font: { size: 11 } },
      range: metric === "r2" ? [0, 1.05] : [0, maxValue * 1.15],
      autorange: false,
      fixedrange: true,
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      type: "category",
      tickfont: { size: 11 },
      gridcolor: "transparent",
      autorange: "reversed",
      fixedrange: true,
    },
    shapes:
      metric === "r2"
        ? [
            {
              type: "line",
              x0: 0.9,
              x1: 0.9,
              y0: -0.5,
              y1: labels.length - 0.5,
              xref: "x",
              yref: "y",
              line: { color: "#EF9F27", width: 1, dash: "dot" },
            },
          ]
        : [],
    annotations:
      metric === "r2"
        ? [
            {
              x: 0.905,
              y: 0.5,
              xref: "x",
              yref: "paper",
              text: "R2=0.90",
              showarrow: false,
              font: { size: 9, color: "#EF9F27" },
            },
          ]
        : [],
  };

  Plotly.purge(chartEl);
  chartEl.innerHTML = "";
  Plotly.newPlot(chartEl, [trace], layout, PLOTLY_CONFIG);

  // Render table
  renderLeaderboardTable();
}

// ── Leaderboard table ─────────────────────────
function renderLeaderboardTable() {
  const tbody = document.getElementById("leaderboard-body");
  const sorted = [...MODEL_METRICS].sort((a, b) => b.r2 - a.r2);

  tbody.innerHTML = sorted
    .map((m) => {
      const typeLabel = m.final
        ? '<span class="aqi-badge satisfactory">Final</span>'
        : m.baseline
          ? '<span class="aqi-badge" style="background:var(--gray-400)">Baseline</span>'
          : '<span class="aqi-badge" style="background:var(--gray-100);color:var(--gray-600)">ML</span>';

      const rowClass = m.final ? "highlight" : "";

      return `<tr class="${rowClass}">
            <td><strong>${m.model}</strong></td>
            <td class="text-right mono">${m.r2.toFixed(4)}</td>
            <td class="text-right mono">${m.mae.toFixed(2)}</td>
            <td class="text-right mono">${m.rmse.toFixed(2)}</td>
            <td class="text-right">${typeLabel}</td>
        </tr>`;
    })
    .join("");
}

// ── SHAP global bar ───────────────────────────
function renderShapBar() {
  // Top 15 by SHAP value
  const top15 = [...SHAP_GLOBAL].sort((a, b) => b.shap - a.shap).slice(0, 15);

  const sorted = [...top15].sort((a, b) => a.shap - b.shap);

  const categoryColors = {
    pollutant: "#1D9E75",
    lag: "#EF9F27",
    rolling: "#D85A30",
    temporal: "#639922",
    spatial: "#888780",
  };

  const trace = {
    type: "bar",
    orientation: "h",
    x: sorted.map((f) => f.shap),
    y: sorted.map((f) => f.feature.replace(/_/g, " ")),
    marker: {
      color: sorted.map((f) => categoryColors[f.category] ?? "#888780"),
      opacity: 0.88,
    },
    text: sorted.map((f) => f.shap.toFixed(2)),
    textposition: "outside",
    textfont: { size: 9, color: "#888780" },
    hovertemplate:
      "<b>%{y}</b><br>" +
      "Mean |SHAP|: %{x:.4f}<br>" +
      "Rank: " +
      sorted.map((f) => f.rank).join("<br>Rank: ") +
      "<extra></extra>",
    customdata: sorted.map((f) => ({
      rank: f.rank,
      category: f.category,
    })),
    hovertemplate:
      "<b>%{y}</b><br>" +
      "Mean |SHAP|: %{x:.4f}<br>" +
      "Rank #%{customdata.rank} | %{customdata.category}" +
      "<extra></extra>",
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 60, b: 30, l: 160 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      title: { text: "Mean |SHAP| value", font: { size: 11 } },
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      tickfont: { size: 10 },
      gridcolor: "transparent",
    },
  };

  Plotly.newPlot("shap-bar-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── SHAP by category ──────────────────────────
function renderShapCategory() {
  const categoryTotals = {};
  SHAP_GLOBAL.forEach((f) => {
    categoryTotals[f.category] = (categoryTotals[f.category] || 0) + f.shap;
  });

  const categoryColors = {
    pollutant: "#1D9E75",
    lag: "#EF9F27",
    rolling: "#D85A30",
    temporal: "#639922",
    spatial: "#888780",
  };

  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const labels = sorted.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
  const values = sorted.map(([, v]) => v);
  const colors = sorted.map(([k]) => categoryColors[k] ?? "#888780");

  const trace = {
    type: "bar",
    x: labels,
    y: values,
    marker: { color: colors, opacity: 0.88 },
    text: values.map((v) => v.toFixed(1)),
    textposition: "outside",
    textfont: { size: 10 },
    hovertemplate: "<b>%{x}</b><br>Total SHAP: %{y:.2f}<extra></extra>",
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 20, r: 20, b: 40, l: 50 },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Total |SHAP|", font: { size: 11 } },
    },
  };

  Plotly.newPlot("shap-category-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── SHAP seasonal comparison ──────────────────
function renderShapSeasonal() {
  const features = Object.keys(SHAP_SEASONAL.winter);
  const winter = features.map((f) => SHAP_SEASONAL.winter[f]);
  const monsoon = features.map((f) => SHAP_SEASONAL.monsoon[f]);
  const labels = features.map((f) => f.replace(/_/g, " "));

  const traces = [
    {
      type: "bar",
      name: "Winter (Nov–Feb)",
      x: labels,
      y: winter,
      marker: { color: "#1D9E75", opacity: 0.85 },
      hovertemplate: "<b>%{x}</b><br>Winter SHAP: %{y:.2f}<extra></extra>",
    },
    {
      type: "bar",
      name: "Monsoon (Jul–Aug)",
      x: labels,
      y: monsoon,
      marker: { color: "#EF9F27", opacity: 0.85 },
      hovertemplate: "<b>%{x}</b><br>Monsoon SHAP: %{y:.2f}<extra></extra>",
    },
  ];

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    barmode: "group",
    margin: { t: 10, r: 20, b: 60, l: 50 },
    showlegend: true,
    legend: { orientation: "h", y: -0.35, font: { size: 10 } },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      tickangle: -30,
      tickfont: { size: 9 },
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Mean |SHAP|", font: { size: 10 } },
    },
  };

  Plotly.newPlot("shap-seasonal-chart", traces, layout, PLOTLY_CONFIG);
}

/* =============================================
   dashboard.js — Dashboard page
   ============================================= */

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();

  document.getElementById("refresh-btn").addEventListener("click", () => {
    const btn = document.getElementById("refresh-btn");
    btn.classList.add("refreshing");
    loadDashboard().finally(() => {
      btn.classList.remove("refreshing");
    });
  });
});

// ── Load all dashboard data ───────────────────
async function loadDashboard() {
  try {
    const data = await apiGet("/api/dashboard");
    renderSummaryCards(data);
    renderBucketChart(data.bucket_counts);
    renderCityChart(data.city_counts);
    renderTable(data.recent);
    setText("last-updated", "Updated " + new Date().toLocaleTimeString());
  } catch (err) {
    showToast("Failed to load dashboard data", "error");
    console.error(err);
  }
}

// ── Summary cards ─────────────────────────────
function renderSummaryCards(data) {
  setText("stat-total", data.total || "0");
  setText("stat-avg-aqi", data.avg_aqi ? data.avg_aqi.toFixed(1) : "—");

  // Top city
  const cityEntries = Object.entries(data.city_counts || {});
  if (cityEntries.length) {
    const top = cityEntries.sort((a, b) => b[1] - a[1])[0];
    setText("stat-top-city", top[0]);
    setText(
      "stat-top-city-count",
      `${top[1]} quer${top[1] === 1 ? "y" : "ies"}`,
    );
  }

  // Top bucket
  const bucketEntries = Object.entries(data.bucket_counts || {});
  if (bucketEntries.length) {
    const top = bucketEntries.sort((a, b) => b[1] - a[1])[0];
    const bucket = el("stat-top-bucket");
    if (bucket) {
      bucket.textContent = top[0];
      bucket.style.color = AQI.getColor(top[0]);
    }
  }
}

// ── AQI bucket donut ──────────────────────────
function renderBucketChart(bucketCounts) {
  if (!bucketCounts || !Object.keys(bucketCounts).length) return;

  const order = [
    "Good",
    "Satisfactory",
    "Moderate",
    "Poor",
    "Very Poor",
    "Severe",
  ];
  const labels = order.filter((b) => bucketCounts[b] !== undefined);
  const values = labels.map((b) => bucketCounts[b]);
  const colors = labels.map((b) => AQI.getColor(b));

  const total = values.reduce((a, b) => a + b, 0);

  const trace = {
    type: "pie",
    labels,
    values,
    marker: { colors, line: { color: "#FFFFFF", width: 1.5 } },
    hole: 0.5,
    sort: false,
    hovertemplate:
      "<b>%{label}</b><br>%{value} predictions<br>%{percent}<extra></extra>",
    textinfo: "label+percent",
    textfont: { size: 11 },
    direction: "clockwise",
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 20, b: 10, l: 20 },
    showlegend: false,
    annotations: [
      {
        text: `<b>${total}</b><br>total`,
        x: 0.5,
        y: 0.5,
        showarrow: false,
        font: { size: 13, color: "#085041" },
        align: "center",
      },
    ],
  };

  Plotly.newPlot("bucket-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── City query bar chart ──────────────────────
function renderCityChart(cityCounts) {
  if (!cityCounts || !Object.keys(cityCounts).length) return;

  const sorted = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const cities = sorted.map(([c]) => c);
  const counts = sorted.map(([, v]) => v);

  const trace = {
    type: "bar",
    orientation: "h",
    x: counts,
    y: cities,
    marker: { color: "#1D9E75", opacity: 0.85 },
    text: counts.map(String),
    textposition: "outside",
    textfont: { size: 10, color: "#888780" },
    hovertemplate: "<b>%{y}</b><br>%{x} predictions<extra></extra>",
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 50, b: 30, l: 100 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      title: { text: "Query count", font: { size: 10 } },
      dtick: 1,
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      tickfont: { size: 10 },
      gridcolor: "transparent",
      autorange: "reversed",
    },
  };

  Plotly.newPlot("city-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── Recent predictions table ──────────────────
function renderTable(rows) {
  const loading = document.getElementById("table-loading");
  const empty = document.getElementById("table-empty");
  const wrap = document.getElementById("table-wrap");
  const tbody = document.getElementById("predictions-body");

  loading.style.display = "none";

  if (!rows || rows.length === 0) {
    empty.style.display = "flex";
    wrap.style.display = "none";
    return;
  }

  empty.style.display = "none";
  wrap.style.display = "";

  tbody.innerHTML = rows
    .map((row, idx) => {
      const bucket = row.aqi_bucket || "—";
      const color = AQI.getColor(bucket);
      const badgeCls = AQI.cssClass(bucket);

      // Format created_at
      const createdAt = row.created_at
        ? new Date(row.created_at).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      // SHAP value with sign
      const shapVal =
        row.top_shap_value !== null
          ? (parseFloat(row.top_shap_value) > 0 ? "+" : "") +
            parseFloat(row.top_shap_value).toFixed(2)
          : "—";
      const shapColor =
        parseFloat(row.top_shap_value) > 0
          ? "var(--coral-400)"
          : "var(--green-400)";

      return `<tr>
            <td class="text-muted" style="font-size:0.78rem">
                ${row.id}
            </td>
            <td><strong>${row.city || "—"}</strong></td>
            <td class="mono" style="font-size:0.8rem">
                ${row.query_date || "—"}
            </td>
            <td class="text-right">
                <span style="font-family:var(--font-display);
                             font-size:1.1rem;font-weight:600;
                             color:${color}">
                    ${row.predicted_aqi ?? "—"}
                </span>
            </td>
            <td>
                <span class="aqi-badge ${badgeCls}">${bucket}</span>
            </td>
            <td class="mono" style="font-size:0.78rem">
                ${row.top_feature || "—"}
            </td>
            <td class="text-right">
                <span style="font-family:var(--font-mono);
                             font-size:0.8rem;color:${shapColor}">
                    ${shapVal}
                </span>
            </td>
            <td class="explanation-cell">
                ${row.explanation || "—"}
            </td>
            <td class="time-cell">${createdAt}</td>
        </tr>`;
    })
    .join("");
}

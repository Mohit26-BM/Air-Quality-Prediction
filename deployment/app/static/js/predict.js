/* =============================================
   predict.js — Predict page
   ============================================= */

// ── City averages from Flask ─────────────────
// CITY_MONTHLY injected via Jinja in template

const INPUTS = {
  pm25: "inp-pm25",
  pm10: "inp-pm10",
  no: "inp-no",
  no2: "inp-no2",
  nox: "inp-nox",
  nh3: "inp-nh3",
  co: "inp-co",
  so2: "inp-so2",
  o3: "inp-o3",
  benzene: "inp-benzene",
  toluene: "inp-toluene",
};

// ── Fill city average ────────────────────────
document.getElementById("fill-avg-btn").addEventListener("click", () => {
  const city = document.getElementById("city-select").value;
  const month =
    new Date(document.getElementById("date-input").value).getMonth() + 1;

  // Find monthly data for city + month
  const key = `${city}_${month}`;
  const data = CITY_MONTHLY[city]?.[month];

  if (data) {
    el("inp-pm25").value = data.mean_pm25 ?? 60;
    el("inp-pm10").value = data.mean_pm10 ?? 100;
    el("inp-no2").value = data.mean_no2 ?? 30;
    // Estimate others from ratios if not available
    const pm25 = parseFloat(el("inp-pm25").value);
    el("inp-no").value = (pm25 * 0.12).toFixed(1);
    el("inp-nox").value = (pm25 * 0.25).toFixed(1);
    el("inp-nh3").value = (pm25 * 0.15).toFixed(1);
    el("inp-co").value = (pm25 * 0.012).toFixed(2);
    el("inp-so2").value = (pm25 * 0.1).toFixed(1);
    el("inp-o3").value = (pm25 * 0.3).toFixed(1);
    el("inp-benzene").value = (pm25 * 0.015).toFixed(2);
    el("inp-toluene").value = (pm25 * 0.04).toFixed(2);
    showToast(`Filled with ${city} averages for month ${month}`, "success");
  } else {
    showToast("No monthly data available for this city/month", "warning");
  }
});

// ── Predict ──────────────────────────────────
document.getElementById("predict-btn").addEventListener("click", runPrediction);

async function runPrediction() {
  const btn = document.getElementById("predict-btn");
  const btnText = document.getElementById("predict-btn-text");

  // Loading state
  btn.classList.add("loading");
  btnText.textContent = "Running...";

  const city = document.getElementById("city-select").value;
  const date = document.getElementById("date-input").value;

  const payload = {
    city,
    date,
    pm25: parseFloat(el("inp-pm25").value) || 0,
    pm10: parseFloat(el("inp-pm10").value) || 0,
    no: parseFloat(el("inp-no").value) || 0,
    no2: parseFloat(el("inp-no2").value) || 0,
    nox: parseFloat(el("inp-nox").value) || 0,
    nh3: parseFloat(el("inp-nh3").value) || 0,
    co: parseFloat(el("inp-co").value) || 0,
    so2: parseFloat(el("inp-so2").value) || 0,
    o3: parseFloat(el("inp-o3").value) || 0,
    benzene: parseFloat(el("inp-benzene").value) || 0,
    toluene: parseFloat(el("inp-toluene").value) || 0,
  };

  try {
    const data = await apiPost("/api/predict", payload);
    console.log("API response:", data);

    if (!data.success) {
      showToast(data.error || "Prediction failed", "error");
      return;
    }

    renderResults(data, city, date);
  } catch (err) {
    showToast("Request failed — check Flask server", "error");
    console.error(err);
  } finally {
    btn.classList.remove("loading");
    btnText.textContent = "Run Prediction";
  }
}

// ── Render Results ───────────────────────────
function renderResults(data, city, date) {
  document.getElementById("result-empty").style.display = "none";
  document.getElementById("result-panel").style.display = "block";
  const { aqi, bucket, color, advice, explanation, top_features } = data;

  // ── AQI value
  const aqiEl = el("result-aqi-value");
  aqiEl.textContent = aqi.toFixed(1);
  aqiEl.style.color = color;

  // City + date label
  const dateFormatted = new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  setText("result-city-date", `${city}  ·  ${dateFormatted}`);

  // ── AQI card border
  el("result-aqi-card").style.borderColor = color;

  // ── Bucket badge
  const badge = el("result-bucket-badge");
  badge.textContent = bucket;
  badge.style.background = color;

  // ── Progress bar (capped at 500)
  const pct = Math.min((aqi / 500) * 100, 100);
  const bar = el("result-aqi-bar");
  bar.style.background = color;
  // Delay so CSS transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.width = `${pct}%`;
    });
  });

  // ── Advice card
  const adviceCard = el("advice-card");
  adviceCard.style.borderColor = color;
  el("advice-icon").style.background = `${color}20`;
  el("advice-icon").style.color = color;
  setText("advice-text", advice);

  // ── Explanation
  setText("explanation-text", explanation);

  // ── SHAP chart
  renderShapChart(top_features);

  // ── Input summary table
  renderInputSummary(data.all_features || top_features);
}

// ── SHAP Chart ───────────────────────────────
function renderShapChart(features) {
  const sorted = [...features].sort((a, b) => a[1] - b[1]);
  const names = sorted.map((f) => f[0].replace(/_/g, " "));
  const values = sorted.map((f) => f[1]);
  const colors = values.map((v) => (v > 0 ? "#D85A30" : "#639922"));

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 80, b: 10, l: 160 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      title: { text: "SHAP value (impact on AQI)", font: { size: 11 } },
      zeroline: true,
      zerolinecolor: "#C0BDB6",
      zerolinewidth: 1.5,
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      tickfont: { size: 11 },
      gridcolor: "transparent",
    },
  };

  const trace = {
    type: "bar",
    orientation: "h",
    x: values,
    y: names,
    marker: {
      color: colors,
      line: { color: "rgba(255,255,255,0.2)", width: 0.5 },
    },
    hovertemplate: "<b>%{y}</b><br>SHAP: %{x:+.2f}<extra></extra>",
    text: values.map((v) => (v > 0 ? "+" : "") + v.toFixed(2)),
    textposition: "outside",
    textfont: { size: 10, color: "#888780" },
  };

  Plotly.newPlot("shap-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── Input Summary Table ───────────────────────
function renderInputSummary(top_features) {
  const shapMap = {};
  top_features.forEach(([name, val]) => {
    shapMap[name] = val;
  });

  const rows = [
    ["PM2.5", el("inp-pm25").value, "PM2.5"],
    ["PM10", el("inp-pm10").value, "PM10"],
    ["NO₂", el("inp-no2").value, "NO2"],
    ["NO", el("inp-no").value, "NO"],
    ["NOx", el("inp-nox").value, "NOx"],
    ["NH₃", el("inp-nh3").value, "NH3"],
    ["CO", el("inp-co").value, "CO"],
    ["SO₂", el("inp-so2").value, "SO2"],
    ["O₃", el("inp-o3").value, "O3"],
    ["Benzene", el("inp-benzene").value, "Benzene"],
    ["Toluene", el("inp-toluene").value, "Toluene"],
  ];

  const tbody = el("input-summary-body");
  tbody.innerHTML = rows
    .map(([label, value, key]) => {
      const shap = shapMap[key];
      let shapCell = '<td class="text-right text-muted">—</td>';
      if (shap !== undefined) {
        const cls = shap > 0 ? "impact-positive" : "impact-negative";
        const sign = shap > 0 ? "+" : "";
        shapCell = `<td class="text-right">
                <span class="${cls}">${sign}${shap.toFixed(2)}</span>
            </td>`;
      }
      return `<tr>
            <td><strong>${label}</strong></td>
            <td class="text-right mono">${value}</td>
            ${shapCell}
        </tr>`;
    })
    .join("");
}

const WHAT_IF_CONFIG = [
  { key: "pm25", label: "PM2.5", dataKey: "mean_pm25", decimals: 0, max: 350 },
  { key: "pm10", label: "PM10", dataKey: "mean_pm10", decimals: 0, max: 450 },
  { key: "no2", label: "NO2", dataKey: "mean_no2", decimals: 0, max: 180 },
  { key: "co", label: "CO", dataKey: "mean_co", decimals: 2, max: 5 },
  { key: "o3", label: "O3", dataKey: "mean_o3", decimals: 0, max: 220 },
  { key: "so2", label: "SO2", dataKey: "mean_so2", decimals: 0, max: 180 },
];

const state = {
  baselineValues: null,
  baselinePrediction: null,
};

const debouncedPreview = debounce(() => {
  updateScenarioPrediction(false);
}, 220);

document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  initialiseWhatIfLab();
});

function bindControls() {
  el("whatif-city").addEventListener("change", initialiseWhatIfLab);
  el("whatif-month").addEventListener("change", initialiseWhatIfLab);

  el("whatif-intensity").addEventListener("input", () => {
    setText("intensity-value", `${el("whatif-intensity").value}%`);
    syncPresetState(null);
    applyIntensityToSliders();
    debouncedPreview();
  });

  WHAT_IF_CONFIG.forEach((item) => {
    el(`slider-${item.key}`).addEventListener("input", () => {
      updateSliderLabel(item);
      syncPresetState(null);
      debouncedPreview();
    });
  });

  qsa(".preset-chip").forEach((button) => {
    button.addEventListener("click", () => {
      el("whatif-intensity").value = button.dataset.intensity;
      setText("intensity-value", `${button.dataset.intensity}%`);
      syncPresetState(button);
      applyIntensityToSliders();
      updateScenarioPrediction(false);
    });
  });

  el("load-baseline-btn").addEventListener("click", () => {
    syncPresetState(qs('.preset-chip[data-intensity="100"]'));
    el("whatif-intensity").value = 100;
    setText("intensity-value", "100%");
    applyBaselineToSliders();
    updateScenarioPrediction(false);
  });

  el("reset-scenario-btn").addEventListener("click", () => {
    el("whatif-city").value = "Delhi";
    el("whatif-month").value = "11";
    syncPresetState(qs('.preset-chip[data-intensity="100"]'));
    initialiseWhatIfLab();
  });
}

async function initialiseWhatIfLab() {
  syncPresetState(qs('.preset-chip[data-intensity="100"]'));
  el("whatif-intensity").value = 100;
  setText("intensity-value", "100%");
  state.baselineValues = computeBaselineScenario(
    el("whatif-city").value,
    Number(el("whatif-month").value),
  );
  applyBaselineToSliders();
  await updateScenarioPrediction(true);
}

function computeBaselineScenario(city, month) {
  const years = Object.entries(CITY_MONTHLY?.[city] ?? {}).filter(
    ([year]) => year !== "0",
  );
  const sources = years.length
    ? years
    : Object.entries(CITY_MONTHLY?.[city] ?? {});
  const aggregate = {};

  WHAT_IF_CONFIG.forEach((item) => {
    const values = sources
      .map(([, months]) => months?.[month]?.[item.dataKey])
      .filter((value) => Number.isFinite(value));
    aggregate[item.key] = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : fallbackValue(item.key);
  });

  return {
    pm25: aggregate.pm25,
    pm10: aggregate.pm10,
    no2: aggregate.no2,
    co: aggregate.co,
    o3: aggregate.o3,
    so2: aggregate.so2,
  };
}

function fallbackValue(key) {
  const fallback = {
    pm25: 90,
    pm10: 160,
    no2: 40,
    co: 1.4,
    o3: 35,
    so2: 14,
  };
  return fallback[key];
}

function applyBaselineToSliders() {
  WHAT_IF_CONFIG.forEach((item) => {
    const slider = el(`slider-${item.key}`);
    slider.value = clampValue(state.baselineValues[item.key], slider);
    updateSliderLabel(item);
  });
}

function applyIntensityToSliders() {
  const multiplier = Number(el("whatif-intensity").value) / 100;
  WHAT_IF_CONFIG.forEach((item) => {
    const slider = el(`slider-${item.key}`);
    slider.value = clampValue(
      state.baselineValues[item.key] * multiplier,
      slider,
    );
    updateSliderLabel(item);
  });
}

function clampValue(value, slider) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  return Math.min(max, Math.max(min, value));
}

function updateSliderLabel(item) {
  const value = Number(el(`slider-${item.key}`).value);
  const formatted =
    item.decimals > 0 ? value.toFixed(item.decimals) : value.toFixed(0);
  setText(`value-${item.key}`, formatted);
}

function readSliderValues() {
  return WHAT_IF_CONFIG.reduce((acc, item) => {
    acc[item.key] = Number(el(`slider-${item.key}`).value);
    return acc;
  }, {});
}

function buildPayload(values) {
  const city = el("whatif-city").value;
  const month = String(el("whatif-month").value).padStart(2, "0");
  const pm25 = values.pm25;

  return {
    city,
    date: `2019-${month}-15`,
    pm25: values.pm25,
    pm10: values.pm10,
    no: Number((pm25 * 0.12).toFixed(1)),
    no2: values.no2,
    nox: Number((pm25 * 0.25).toFixed(1)),
    nh3: Number((pm25 * 0.15).toFixed(1)),
    co: values.co,
    so2: values.so2,
    o3: values.o3,
    benzene: Number((pm25 * 0.015).toFixed(2)),
    toluene: Number((pm25 * 0.04).toFixed(2)),
  };
}

async function updateScenarioPrediction(refreshBaseline) {
  const currentValues = readSliderValues();

  try {
    if (refreshBaseline || !state.baselinePrediction) {
      state.baselinePrediction = await apiPost(
        "/api/predict-preview",
        buildPayload(state.baselineValues),
      );
    }

    const scenarioPrediction = await apiPost(
      "/api/predict-preview",
      buildPayload(currentValues),
    );

    renderPredictionSummary(scenarioPrediction);
    renderBaselineSummary(currentValues, scenarioPrediction);
    renderComparisonChart(currentValues);
    renderDriverChart(scenarioPrediction.top_features || []);
  } catch (error) {
    showToast(
      "Preview prediction failed. Please try another scenario.",
      "error",
    );
  }
}

function renderPredictionSummary(prediction) {
  setText(
    "result-context",
    `${el("whatif-city").value} | ${MONTHS_FULL[Number(el("whatif-month").value) - 1]}`,
  );
  setText("whatif-aqi", fmt(prediction.aqi, 1));
  setText("whatif-bucket", prediction.bucket);
  setText("whatif-advice", prediction.advice);
  setText("whatif-explanation", prediction.explanation);

  const badge = el("whatif-bucket");
  badge.className = `aqi-badge ${AQI.cssClass(prediction.bucket)}`;

  const delta = prediction.aqi - state.baselinePrediction.aqi;
  const direction =
    delta > 0 ? "higher than" : delta < 0 ? "lower than" : "aligned with";
  setText(
    "whatif-delta",
    delta === 0
      ? "Scenario AQI matches the city-month baseline."
      : `${fmt(Math.abs(delta), 1)} AQI points ${direction} the city-month baseline.`,
  );

  const fill = el("whatif-meter-fill");
  fill.style.width = `${Math.min((prediction.aqi / 500) * 100, 100)}%`;
  fill.style.background = AQI.getColor(prediction.bucket);
}

function renderBaselineSummary(currentValues, scenarioPrediction) {
  setText("baseline-aqi", fmt(state.baselinePrediction.aqi, 1));
  setText(
    "baseline-delta",
    `${fmt(scenarioPrediction.aqi - state.baselinePrediction.aqi, 1)} AQI`,
  );
  setText("baseline-badge", state.baselinePrediction.bucket);
  el("baseline-badge").style.color = AQI.getColor(
    state.baselinePrediction.bucket,
  );

  setHtml(
    "baseline-list",
    WHAT_IF_CONFIG.map((item) => {
      const baselineValue =
        item.decimals > 0
          ? state.baselineValues[item.key].toFixed(item.decimals)
          : state.baselineValues[item.key].toFixed(0);
      const scenarioValue =
        item.decimals > 0
          ? currentValues[item.key].toFixed(item.decimals)
          : currentValues[item.key].toFixed(0);
      return `
        <div class="baseline-item">
          <span class="baseline-item-label">${item.label}</span>
          <span class="baseline-item-value">${baselineValue} -> ${scenarioValue}</span>
        </div>
      `;
    }).join(""),
  );
}

function renderComparisonChart(currentValues) {
  const labels = WHAT_IF_CONFIG.map((item) => item.label);
  const baselineSeries = WHAT_IF_CONFIG.map(
    (item) => state.baselineValues[item.key],
  );
  const scenarioSeries = WHAT_IF_CONFIG.map((item) => currentValues[item.key]);

  const traces = [
    {
      type: "bar",
      name: "Baseline",
      x: labels,
      y: baselineSeries,
      marker: { color: "#C9C5BC" },
    },
    {
      type: "bar",
      name: "Scenario",
      x: labels,
      y: scenarioSeries,
      marker: { color: "#1D9E75" },
    },
  ];

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    barmode: "group",
    margin: { t: 18, r: 20, b: 56, l: 52 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      tickangle: -20,
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Relative concentration level", font: { size: 11 } },
    },
    legend: {
      ...PLOTLY_LAYOUT_BASE.legend,
      orientation: "h",
      y: -0.22,
    },
  };

  Plotly.newPlot("whatif-comparison-chart", traces, layout, PLOTLY_CONFIG);
}

function renderDriverChart(topFeatures) {
  const cleaned = [...topFeatures]
    .slice(0, 5)
    .reverse()
    .map(([feature, value]) => ({
      feature: feature.replace(/_/g, " "),
      value: Number(value),
    }));

  const trace = {
    type: "bar",
    orientation: "h",
    x: cleaned.map((item) => item.value),
    y: cleaned.map((item) => item.feature),
    marker: {
      color: cleaned.map((item) => (item.value >= 0 ? "#D85A30" : "#1D9E75")),
    },
    text: cleaned.map((item) => item.value.toFixed(2)),
    textposition: "outside",
    cliponaxis: false,
    hovertemplate: "<b>%{y}</b><br>Impact: %{x:.2f}<extra></extra>",
  };

  const maxMagnitude = Math.max(
    ...cleaned.map((item) => Math.abs(item.value)),
    1,
  );
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 18, r: 46, b: 30, l: 150 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      range: [-maxMagnitude * 1.2, maxMagnitude * 1.2],
      zeroline: true,
      zerolinecolor: "#C0BDB6",
      title: { text: "SHAP contribution", font: { size: 11 } },
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      gridcolor: "transparent",
    },
  };

  Plotly.newPlot("whatif-driver-chart", [trace], layout, PLOTLY_CONFIG);
}

function syncPresetState(activeButton) {
  qsa(".preset-chip").forEach((button) => {
    button.classList.toggle("active", button === activeButton);
  });
}

function debounce(fn, wait) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

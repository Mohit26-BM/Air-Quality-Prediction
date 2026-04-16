/* =============================================
   explorer.js — City Explorer
   Multi-city (up to 3), year filter,
   radar chart, heatmap
   ============================================= */

// ── City colour palette ──────────────────────
const CITY_COLORS = ["#1D9E75", "#EF9F27", "#E24B4A"];

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

// ── State ────────────────────────────────────
let selectedCities = ["Delhi"];
let selectedYear = 0;

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderCityTags();
  renderAll();

  document.getElementById("year-select").addEventListener("change", (e) => {
    selectedYear = parseInt(e.target.value);
    renderAll();
  });

  document.getElementById("city-add-select").addEventListener("change", (e) => {
    const city = e.target.value;
    if (!city) return;
    if (selectedCities.includes(city)) {
      showToast(`${city} is already selected`, "warning");
    } else if (selectedCities.length >= 3) {
      showToast("Maximum 3 cities - remove one first", "warning");
    } else {
      selectedCities.push(city);
      renderCityTags();
      renderAll();
    }
    e.target.value = "";
  });
});

// ── City tag management ───────────────────────
function renderCityTags() {
  const container = document.getElementById("city-tags");
  container.innerHTML = selectedCities
    .map((city, idx) => {
      return `
        <span class="city-tag city-color-${idx}">
            ${city}
            ${
              selectedCities.length > 1
                ? `<button class="city-tag-remove" type="button" data-city="${city}" aria-label="Remove ${city}">x</button>`
                : ""
            }
        </span>`;
    })
    .join("");
}

function removeCity(city) {
  if (selectedCities.length <= 1) return;
  selectedCities = selectedCities.filter((c) => c !== city);
  renderCityTags();
  renderAll();
}

document.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".city-tag-remove");
  if (!removeButton) return;
  removeCity(removeButton.dataset.city);
});

// ── Get data for city + year + month ─────────
function getMonthData(city, year, month) {
  return CITY_MONTHLY?.[city]?.[year]?.[month] ?? null;
}

function getYearMonthlyArray(city, year, key) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = getMonthData(city, year, i + 1);
    return d ? (d[key] ?? null) : null;
  });
}

// ── Update year dropdown (single city only) ──
function updateYearDropdown() {
  const city = selectedCities[0];
  const years = Object.keys(CITY_MONTHLY[city] || {})
    .map(Number)
    .sort((a, b) => a - b);

  const select = document.getElementById("year-select");
  const current = parseInt(select.value);

  select.innerHTML = "";

  // Always add All Years first
  const allOpt = document.createElement("option");
  allOpt.value = "0";
  allOpt.text = "All Years";
  select.appendChild(allOpt);

  // Add only years that exist for this city
  years
    .filter((y) => y !== 0)
    .forEach((year) => {
      const opt = document.createElement("option");
      opt.value = year;
      opt.text = String(year);
      select.appendChild(opt);
    });

  // Restore selected year if still valid, else reset to 0
  if (years.includes(current)) {
    select.value = current;
  } else {
    select.value = "0";
    selectedYear = 0;
  }
}

// ── Render all ───────────────────────────────
function renderAll() {
  // ── Option C: lock to All Years in compare mode ──
  const yearSelect = document.getElementById("year-select");
  if (selectedCities.length > 1) {
    // Force All Years, disable dropdown
    selectedYear = 0;
    yearSelect.value = "0";
    yearSelect.disabled = true;
    yearSelect.title =
      "Year filter disabled in comparison mode - showing all-years averages";
  } else {
    // Single city: update dropdown to show available years only
    yearSelect.disabled = false;
    yearSelect.title = "";
    updateYearDropdown();
  }

  const yearLabel =
    selectedYear === 0 ? "All Years (2015-2020)" : String(selectedYear);

  setText("trend-subtitle", `Mean AQI by month - ${yearLabel}`);
  setText("table-city-label", `${selectedCities[0]} | ${yearLabel}`);

  renderProfileCards();
  renderTrendChart();
  renderRadarChart();
  renderHeatmapChart();
  renderPollutantCharts();
  renderPollutantPie();
  renderMonthlyTable();
}

// ── Profile cards ─────────────────────────────
function renderProfileCards() {
  const container = document.getElementById("profile-row");

  container.innerHTML = selectedCities
    .map((city, idx) => {
      const color = CITY_COLORS[idx];
      const profile = CITY_PROFILES[city] || {};

      // Mean AQI for selected year
      const monthlyAqis = getYearMonthlyArray(
        city,
        selectedYear,
        "mean_aqi",
      ).filter((v) => v !== null);
      const meanAqi = monthlyAqis.length
        ? monthlyAqis.reduce((a, b) => a + b, 0) / monthlyAqis.length
        : profile.mean_aqi || 0;

      const bucket = AQI.getBucket(meanAqi);
      const badgeCls = AQI.cssClass(bucket);

      // Best + worst month for this year
      const allMonths = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        aqi: getMonthData(city, selectedYear, i + 1)?.mean_aqi ?? null,
      })).filter((m) => m.aqi !== null);

      const bestMonth = allMonths.length
        ? MONTH_NAMES[
            allMonths.reduce((a, b) => (a.aqi < b.aqi ? a : b)).month - 1
          ]
        : MONTH_NAMES[(profile.best_month || 1) - 1];
      const worstMonth = allMonths.length
        ? MONTH_NAMES[
            allMonths.reduce((a, b) => (a.aqi > b.aqi ? a : b)).month - 1
          ]
        : MONTH_NAMES[(profile.worst_month || 1) - 1];

      const yearLabel = selectedYear === 0 ? "2015-2020" : String(selectedYear);

      return `
        <div class="profile-card city-color-${idx}">
            <div class="profile-card-top">
                <div>
                    <div class="profile-city-name">${city}</div>
                    <div class="profile-city-year">${yearLabel}</div>
                    <span class="aqi-badge ${badgeCls} profile-badge">
                        ${bucket}
                    </span>
                </div>
                <div class="profile-aqi-side">
                    <div class="profile-aqi-value city-color-${idx}">
                        ${meanAqi.toFixed(1)}
                    </div>
                    <div class="profile-aqi-label">Mean AQI</div>
                </div>
            </div>
            <div class="profile-stats">
                <div class="profile-stat">
                    <span class="profile-stat-label">Best Month</span>
                    <span class="profile-stat-value">${bestMonth}</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-label">Worst Month</span>
                    <span class="profile-stat-value">${worstMonth}</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-label">Data Points</span>
                    <span class="profile-stat-value">${allMonths.length} months</span>
                </div>
            </div>
        </div>`;
    })
    .join("");
}

// ── Monthly AQI trend line ────────────────────
function renderTrendChart() {
  const traces = selectedCities.map((city, idx) => ({
    type: "scatter",
    mode: "lines+markers",
    name: city,
    x: MONTH_NAMES,
    y: getYearMonthlyArray(city, selectedYear, "mean_aqi"),
    line: {
      color: CITY_COLORS[idx],
      width: 2.5,
      dash: idx === 0 ? "solid" : idx === 1 ? "dot" : "dash",
    },
    marker: { color: CITY_COLORS[idx], size: 7 },
    hovertemplate: "<b>%{x}</b><br>AQI: %{y:.1f}<extra>" + city + "</extra>",
    connectgaps: true,
  }));

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    shapes: [
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
    ],
    annotations: [
      {
        x: 10.5,
        yref: "paper",
        y: 0.98,
        text: "Winter",
        showarrow: false,
        font: { size: 9, color: "#1D9E75" },
      },
      {
        x: 6.5,
        yref: "paper",
        y: 0.98,
        text: "Monsoon",
        showarrow: false,
        font: { size: 9, color: "#EF9F27" },
      },
    ],
    margin: { t: 20, r: 20, b: 40, l: 50 },
    showlegend: selectedCities.length > 1,
    legend: { orientation: "h", y: -0.2 },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Mean AQI", font: { size: 11 } },
    },
  };

  Plotly.newPlot("trend-chart", traces, layout, PLOTLY_CONFIG);

  // Legend dots
  const legendEl = document.getElementById("trend-legend");
  legendEl.innerHTML = selectedCities
    .map(
      (city, idx) => `
        <div class="legend-item">
            <div class="legend-dot"
                 style="background:${CITY_COLORS[idx]}"></div>
            ${city}
        </div>`,
    )
    .join("");
}

// ── Radar chart ───────────────────────────────
function renderRadarChart() {
  const pollutants = ["PM2.5", "PM10", "NO2", "CO", "O3", "SO2"];
  const keys = [
    "mean_pm25",
    "mean_pm10",
    "mean_no2",
    "mean_co",
    "mean_o3",
    "mean_so2",
  ];

  function getCityMeans(city) {
    return keys.map((key) => {
      const vals = Array.from(
        { length: 12 },
        (_, i) => getMonthData(city, selectedYear, i + 1)?.[key] ?? null,
      ).filter((v) => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
  }

  const allMeans = selectedCities.map(getCityMeans);

  // Only normalise when multiple cities
  // Single city: show absolute values
  const useNormalised = selectedCities.length > 1;
  const maxPerPollutant = keys.map((_, pi) =>
    Math.max(...allMeans.map((m) => m[pi]), 1),
  );

  const traces = selectedCities.map((city, idx) => {
    const means = allMeans[idx];
    const rVals = useNormalised
      ? means.map((v, pi) =>
          maxPerPollutant[pi] > 0 ? (v / maxPerPollutant[pi]) * 100 : 0,
        )
      : means;

    const r = [...rVals, rVals[0]];
    const theta = [...pollutants, pollutants[0]];

    // Hover shows actual value always
    const hoverVals = [...means, means[0]];

    return {
      type: "scatterpolar",
      r,
      theta,
      fill: "toself",
      name: city,
      line: { color: CITY_COLORS[idx], width: 2 },
      fillcolor: CITY_COLORS[idx] + "22",
      // Custom hover with actual μg/m³ values
      customdata: hoverVals,
      hovertemplate:
        "<b>%{theta}</b><br>" +
        "Mean: %{customdata:.1f} μg/m³" +
        (useNormalised ? "<br>Relative: %{r:.1f}%" : "") +
        "<extra>" +
        city +
        "</extra>",
    };
  });

  const radialRange = useNormalised ? [0, 105] : undefined;
  const tickSuffix = useNormalised ? "%" : "";

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    polar: {
      bgcolor: "transparent",
      radialaxis: {
        visible: true,
        range: radialRange,
        tickfont: { size: 9, color: "#888780" },
        gridcolor: "#E2DFD8",
        linecolor: "#E2DFD8",
        ticksuffix: tickSuffix,
      },
      angularaxis: {
        tickfont: { size: 11 },
        gridcolor: "#E2DFD8",
        linecolor: "#E2DFD8",
      },
    },
    margin: { t: 20, r: 40, b: 20, l: 40 },
    showlegend: selectedCities.length > 1,
    legend: { orientation: "h", y: -0.05 },
  };

  Plotly.newPlot("radar-chart", traces, layout, PLOTLY_CONFIG);
}
// ── Heatmap ───────────────────────────────────
function renderHeatmapChart() {
  // Show heatmap for primary city only (first selected)
  const city = selectedCities[0];
  const color = CITY_COLORS[0];

  const zValues = Array.from({ length: 12 }, (_, i) => {
    const d = getMonthData(city, selectedYear, i + 1);
    return d?.mean_aqi ?? null;
  });

  // Single-row heatmap
  const trace = {
    type: "heatmap",
    z: [zValues],
    x: MONTH_NAMES,
    y: [city],
    colorscale: [
      [0, "#EAF3DE"],
      [0.1, "#E1F5EE"],
      [0.2, "#1D9E75"],
      [0.4, "#EF9F27"],
      [0.6, "#D85A30"],
      [0.8, "#A32D2D"],
      [1.0, "#2C2C2A"],
    ],
    showscale: true,
    colorbar: {
      title: { text: "AQI", side: "right", font: { size: 10 } },
      thickness: 12,
      len: 0.8,
      tickfont: { size: 9 },
    },
    hovertemplate: "<b>%{x}</b><br>Mean AQI: %{z:.1f}<extra></extra>",
    zmin: 0,
    zmax: 500,
  };

  // If multiple cities, show stacked heatmap rows.
  if (selectedCities.length > 1) {
    const allZ = selectedCities.map((c) =>
      Array.from(
        { length: 12 },
        (_, i) => getMonthData(c, selectedYear, i + 1)?.mean_aqi ?? null,
      ),
    );
    trace.z = allZ;
    trace.y = selectedCities;
  }

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 20, r: 80, b: 40, l: 100 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      tickfont: { size: 11 },
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      tickfont: { size: 11 },
      gridcolor: "transparent",
    },
  };

  Plotly.newPlot("heatmap-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── Combined grouped bar: PM2.5, PM10, NO2 ───
function renderPollutantCharts() {
  const pollutants = [
    { key: "mean_pm25", label: "PM2.5", color: "#1D9E75" },
    { key: "mean_pm10", label: "PM10", color: "#EF9F27" },
    { key: "mean_no2", label: "NO₂", color: "#D85A30" },
  ];

  // When multiple cities selected — one trace group per city
  // When single city — one trace per pollutant
  let traces = [];

  if (selectedCities.length === 1) {
    // Single city: 3 pollutant bars per month
    const city = selectedCities[0];
    traces = pollutants.map((p) => ({
      type: "bar",
      name: p.label,
      x: MONTH_NAMES,
      y: getYearMonthlyArray(city, selectedYear, p.key),
      marker: { color: p.color, opacity: 0.85 },
      hovertemplate:
        "<b>%{x}</b><br>" +
        p.label +
        ": %{y:.1f} μg/m³<extra>" +
        city +
        "</extra>",
    }));
  } else {
    // Multiple cities: PM2.5 only, one trace per city
    // (3 pollutants × 3 cities = 9 bars gets too crowded)
    traces = selectedCities.map((city, idx) => ({
      type: "bar",
      name: city + " PM2.5",
      x: MONTH_NAMES,
      y: getYearMonthlyArray(city, selectedYear, "mean_pm25"),
      marker: { color: CITY_COLORS[idx], opacity: 0.85 },
      hovertemplate:
        "<b>%{x}</b><br>PM2.5: %{y:.1f} μg/m³" + "<extra>" + city + "</extra>",
    }));
  }

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    barmode: "group",
    margin: { t: 10, r: 20, b: 40, l: 55 },
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.22,
      font: { size: 10 },
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "μg/m³", font: { size: 11 } },
    },
  };

  Plotly.newPlot("pollutant-bar-chart", traces, layout, PLOTLY_CONFIG);
}

// ── Pollutant composition pie ─────────────────
// Annual mean concentration share - primary city
function renderPollutantPie() {
  const city = selectedCities[0];
  const keys = [
    { key: "mean_pm25", label: "PM2.5" },
    { key: "mean_pm10", label: "PM10" },
    { key: "mean_no2", label: "NO2" },
    { key: "mean_co", label: "CO" },
    { key: "mean_o3", label: "O3" },
    { key: "mean_so2", label: "SO2" },
  ];

  // Annual mean per pollutant
  const values = keys.map(({ key }) => {
    const vals = Array.from(
      { length: 12 },
      (_, i) => getMonthData(city, selectedYear, i + 1)?.[key] ?? null,
    ).filter((v) => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  const labels = keys.map((k) => k.label);
  const colors = [
    "#1D9E75",
    "#085041",
    "#EF9F27",
    "#D85A30",
    "#639922",
    "#888780",
  ];

  const yearLabel = selectedYear === 0 ? "All Years" : String(selectedYear);

  const trace = {
    type: "pie",
    labels,
    values,
    marker: { colors, line: { color: "#FFFFFF", width: 1.5 } },
    hovertemplate:
      "<b>%{label}</b><br>" +
      "Mean: %{value:.1f} ug/m3<br>" +
      "Share: %{percent}<extra></extra>",
    textinfo: "label+percent",
    textfont: { size: 11 },
    hole: 0.35,
    sort: true,
    direction: "clockwise",
  };

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 20, b: 10, l: 20 },
    showlegend: false,
    annotations: [
      {
        text: `${city}<br><span style="font-size:10px">${yearLabel}</span>`,
        x: 0.5,
        y: 0.5,
        showarrow: false,
        font: { size: 12, color: "#085041" },
        align: "center",
      },
    ],
  };

  Plotly.newPlot("pollutant-pie-chart", [trace], layout, PLOTLY_CONFIG);
}

// ── Monthly table (primary city only) ─────────
function renderMonthlyTable() {
  const city = selectedCities[0];
  const cityData = CITY_MONTHLY?.[city]?.[selectedYear] || {};

  setText(
    "table-city-label",
    `${city} | ${selectedYear === 0 ? "All Years" : selectedYear}`,
  );

  // Update bar chart subtitle
  const barSub = document.getElementById("pollutant-bar-subtitle");
  if (barSub) {
    barSub.textContent =
      selectedCities.length === 1
        ? "PM2.5, PM10, NO2 mean concentrations - ug/m3"
        : "PM2.5 comparison across selected cities - ug/m3";
  }

  const tbody = document.getElementById("monthly-table-body");
  tbody.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const d = cityData[m] || null;
    const aqi = d?.mean_aqi ?? null;
    const pm25 = d?.mean_pm25 ?? null;
    const pm10 = d?.mean_pm10 ?? null;
    const no2 = d?.mean_no2 ?? null;
    const co = d?.mean_co ?? null;
    const o3 = d?.mean_o3 ?? null;
    const so2 = d?.mean_so2 ?? null;
    const bucket = aqi !== null ? AQI.getBucket(aqi) : null;
    const color = bucket ? AQI.getColor(bucket) : "#888780";
    const dash = "-";

    return `<tr>
            <td><strong>${MONTH_NAMES[i]}</strong></td>
            <td class="text-right mono">
                ${aqi !== null ? aqi.toFixed(1) : dash}
            </td>
            <td class="text-right">
                ${
                  bucket
                    ? `<span class="month-cat"
                              style="background:${color}">${bucket}</span>`
                    : dash
                }
            </td>
            <td class="text-right mono">
                ${pm25 !== null ? pm25.toFixed(1) : dash}
            </td>
            <td class="text-right mono">
                ${pm10 !== null ? pm10.toFixed(1) : dash}
            </td>
            <td class="text-right mono">
                ${no2 !== null ? no2.toFixed(1) : dash}
            </td>
            <td class="text-right mono">
                ${co !== null ? co.toFixed(2) : dash}
            </td>
            <td class="text-right mono">
                ${o3 !== null ? o3.toFixed(1) : dash}
            </td>
            <td class="text-right mono">
                ${so2 !== null ? so2.toFixed(1) : dash}
            </td>
        </tr>`;
  }).join("");
}

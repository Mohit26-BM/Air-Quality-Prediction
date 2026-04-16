/* =============================================
   index.js - Home page
   ============================================= */

document.addEventListener("DOMContentLoaded", () => {
  bindScrollLinks();
  renderCityBarChart();
});

function bindScrollLinks() {
  qsa("[data-scroll-target]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.dataset.scrollTarget;
      const target = el(targetId);

      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderCityBarChart() {
  const sorted = Object.entries(CITY_PROFILES).sort(
    (a, b) => b[1].mean_aqi - a[1].mean_aqi,
  );

  const cities = sorted.map(([city]) => city);
  const values = sorted.map(([, profile]) => profile.mean_aqi);
  const colors = values.map((value) => AQI.getColor(AQI.getBucket(value)));
  const buckets = values.map((value) => AQI.getBucket(value));

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    margin: { t: 10, r: 20, b: 120, l: 60 },
    xaxis: {
      ...PLOTLY_LAYOUT_BASE.xaxis,
      tickangle: -45,
      tickfont: { size: 11 },
    },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: "Mean AQI", font: { size: 11 } },
    },
    shapes: [
      {
        type: "line",
        x0: -0.5,
        x1: cities.length - 0.5,
        y0: 100,
        y1: 100,
        line: { color: "#EF9F27", width: 1, dash: "dot" },
      },
      {
        type: "line",
        x0: -0.5,
        x1: cities.length - 0.5,
        y0: 200,
        y1: 200,
        line: { color: "#D85A30", width: 1, dash: "dot" },
      },
    ],
    annotations: [
      {
        x: cities.length - 1,
        y: 105,
        text: "Satisfactory / Moderate boundary",
        showarrow: false,
        font: { size: 10, color: "#EF9F27" },
        xanchor: "right",
      },
      {
        x: cities.length - 1,
        y: 205,
        text: "Moderate / Poor boundary",
        showarrow: false,
        font: { size: 10, color: "#D85A30" },
        xanchor: "right",
      },
    ],
  };

  const trace = {
    type: "bar",
    x: cities,
    y: values,
    marker: {
      color: colors,
      line: { color: "rgba(255,255,255,0.3)", width: 0.5 },
    },
    customdata: buckets,
    hovertemplate:
      "<b>%{x}</b><br>" +
      "Mean AQI: %{y:.1f}<br>" +
      "Category: %{customdata}<extra></extra>",
    text: values.map((value) => value.toFixed(0)),
    textposition: "outside",
    textfont: { size: 9, color: "#888780" },
  };

  Plotly.newPlot("city-bar-chart", [trace], layout, {
    ...PLOTLY_CONFIG,
    modeBarButtonsToRemove: [...PLOTLY_CONFIG.modeBarButtonsToRemove, "pan2d"],
  });
}

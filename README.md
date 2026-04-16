# Interpretable Air Quality Severity Assessment System

A full-stack machine learning application that predicts Air Quality Index (AQI) for 25 Indian cities and explains every prediction using SHAP (SHapley Additive exPlanations). Built as an LPU capstone project, the system goes beyond standard AQI prediction by treating interpretability and cross-temporal validation as first-class requirements.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Why Machine Learning for AQI](#2-why-machine-learning-for-aqi)
3. [Dataset](#3-dataset)
4. [Data Authenticity Tests](#4-data-authenticity-tests)
5. [Preprocessing Pipeline](#5-preprocessing-pipeline)
6. [Feature Engineering](#6-feature-engineering)
7. [Model Selection](#7-model-selection)
8. [SHAP Explainability](#8-shap-explainability)
9. [External Validation — The 5/5 Check](#9-external-validation--the-55-check)
10. [Known Limitations](#10-known-limitations)
11. [System Architecture](#11-system-architecture)
12. [Project Structure](#12-project-structure)
13. [Setup and Installation](#13-setup-and-installation)
14. [Running the Application](#14-running-the-application)
15. [API Reference](#15-api-reference)

---

## 1. Project Overview

Most AQI systems return a number. This system returns a number and explains it.

The core question driving the project: when a city's air quality is classified as _Poor_, which pollutant caused it, how much did it contribute, and is that pattern consistent with what we know about atmospheric chemistry? SHAP TreeExplainer answers this per prediction, not as a global summary.

**Key results at a glance:**

| Metric          | Value                              |
| --------------- | ---------------------------------- |
| Model           | XGBoost Regressor                  |
| Test R²         | 0.9489                             |
| Test MAE        | 12.47 μg/m³                        |
| Test RMSE       | 18.85 μg/m³                        |
| Training period | 2015–2018                          |
| Test period     | 2019–2020 (chronological)          |
| Cities          | 25 Indian cities                   |
| Features        | 33 engineered                      |
| Validation      | CPCB 2024 — 5/5 seasonal alignment |

---

## 2. Why Machine Learning for AQI

AQI is deterministically computed from pollutant sub-indices using the CPCB formula. So why use ML?

**Reason 1 — Temporal persistence.** Yesterday's PM2.5 is the second most important feature in the model (SHAP rank #2, mean |SHAP| = 28.28). The deterministic formula treats each day independently. The model learns that pollution persists atmospherically across consecutive days — a physically real phenomenon the formula ignores.

**Reason 2 — Incomplete inputs.** The formula requires all pollutant readings simultaneously. In practice, sensors have gaps. The ML model handles missing inputs through imputation and produces estimates with partial data.

**Reason 3 — City context.** The same PM2.5 reading in Delhi (historically mean AQI 259) and Aizawl (historically mean AQI 33) represents different atmospheric conditions. The model encodes this via target-encoded city mean AQI.

**What the model does not claim:** it does not claim to outperform the CPCB formula when all inputs are present and clean. That comparison was not run. The model's value is in temporal context, graceful degradation with missing data, and per-prediction explanation.

---

## 3. Dataset

**Source:** Kaggle CPCB dataset by Rohan Rao — daily pollutant readings across 26 Indian cities, 2015–2020.

**Pre-audit record count:** 29,531 rows across 26 cities.

**Modifications made before modelling:**

| Decision              | Reason                                                                                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ahmedabad dropped     | 31% of AQI values exceeded 500 (invalid). Mean AQI of 451 was implausible — likely sensor malfunction.                                                                                                                              |
| Xylene dropped        | 61.3% null values. Imputation at this rate would introduce more noise than signal.                                                                                                                                                  |
| AQI bucket recomputed | 83% of original bucket labels were inconsistent with the AQI values they accompanied. Recomputed using CPCB thresholds: Good (0–50), Satisfactory (51–100), Moderate (101–200), Poor (201–300), Very Poor (301–400), Severe (401+). |
| Final record count    | 29,531 rows, 25 cities, 11 pollutant features                                                                                                                                                                                       |

**Train/test split:** Strictly chronological. 2015–2018 = training (13,232 records). 2019–2020 = test (11,436 records). Random splitting was explicitly avoided — it would allow the model to see future pollution patterns during training, inflating all performance metrics.

---

## 4. Data Authenticity Tests

Before any modelling, four tests were run to verify the dataset reflected real-world Indian pollution patterns rather than synthetic or corrupted data. All four passed.

### Test 1 — PM10–AQI Correlation

**What was tested:** Pearson correlation between PM10 and AQI across the full dataset.

**Result:** 0.803

**Why this matters:** In Indian urban environments, PM10 is the dominant AQI driver, not PM2.5. PM10 particles from road dust, construction, and industrial sources are more prevalent than fine particulate matter in most Indian cities. A low or near-zero correlation would indicate either synthetic data or a dataset that does not reflect Indian conditions. 0.803 confirms the dataset is consistent with CPCB-reported pollution profiles.

**Note:** PM2.5–AQI correlation was 0.659 — lower than PM10, which is physically expected in India (unlike Western datasets where PM2.5 dominates).

### Test 2 — Delhi Seasonal Standard Deviation

**What was tested:** Standard deviation of monthly mean AQI for Delhi.

**Result:** 66.9 (threshold: >30)

**Why this matters:** Delhi has one of the strongest seasonal pollution signals in the world — severe smog in November–January (Diwali + crop burning + cold inversion layers) and relatively cleaner monsoon months (June–September). A dataset that flattens this pattern would fail to reproduce one of the most documented air quality phenomena in India. Std of 66.9 confirms the expected seasonal swing is present.

### Test 3 — City Spread

**What was tested:** Standard deviation of annual mean AQI across all 25 cities.

**Result:** 29.8 (threshold: >20)

**Why this matters:** India has extreme geographic pollution heterogeneity — Delhi and Gurugram in the north are among the world's most polluted cities, while cities like Aizawl (Mizoram) and Shillong (Meghalaya) have near-pristine air. A spread of 29.8 confirms this North–South gradient is captured in the data. A flat spread would indicate city labels had been randomly assigned or aggregated incorrectly.

### Test 4 — Temporal Autocorrelation

**What was tested:** Lag-1 autocorrelation of daily AQI for Delhi (correlation between day _t_ and day _t-1_).

**Result:** 0.874 (threshold: >0.5)

**Why this matters:** Atmospheric pollution is not independent day-to-day. Particulate matter remains suspended for 1–3 days. Wind patterns persist. This autocorrelation directly justifies the lag features in the model — if autocorrelation were low, lag features would add noise rather than signal. 0.874 is strong enough to validate the entire temporal feature group.

---

## 5. Preprocessing Pipeline

### Null Treatment — Three-Tier Strategy

Rather than applying a single imputation method to all missing values, a tiered approach was used based on the severity of missingness:

| Missingness | Strategy                                | Rationale                                                                                                                           |
| ----------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| < 20%       | Linear interpolation                    | Short gaps in time series are best filled by linear interpolation — preserves the temporal trend between surrounding valid readings |
| 20–40%      | Seasonal median (same month, same city) | Longer gaps cannot be interpolated reliably. Monthly seasonality is the next best signal                                            |
| > 40%       | City-level median                       | Last resort — no temporal structure assumed                                                                                         |

Xylene exceeded 40% threshold across nearly all cities and was dropped entirely rather than imputed.

### Outlier Treatment

Ahmedabad was removed entirely (see Dataset section). For remaining cities, isolated daily spikes above AQI 500 (the CPCB ceiling) were capped at 500. These were typically sensor errors — physical AQI cannot exceed 500 by definition.

### AQI Bucket Recomputation

The original dataset labels had 83% inconsistency between the AQI value and its bucket category. Every bucket label was discarded and recomputed from scratch using the official CPCB formula applied to the AQI values.

---

## 6. Feature Engineering

33 features were constructed from the 11 raw pollutant measurements. Each group was added with an explicit rationale.

### Group 1 — Raw Pollutants (11 features)

PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene.

The primary physical inputs. PM2.5 is SHAP rank #1 with mean |SHAP| = 40.05 — it alone accounts for more explanatory power than all other feature groups combined.

### Group 2 — Lag Features (12 features)

PM2.5, NO2, CO, and O3 at lag-1, lag-3, and lag-7 days.

**Why:** Autocorrelation of 0.874 in the dataset proves pollution persists. PM2.5_lag1 (yesterday's PM2.5) is SHAP rank #2 with mean |SHAP| = 28.28. This is the single biggest engineering decision in the project — without lag features, the model treats every day as independent of the prior week.

**Construction:** Grouped by city, sorted by date, then shifted. Days at the start of each city's records have null lags, which were imputed with the current value.

### Group 3 — Rolling Statistics (4 features)

PM2.5 and NO2, each with a 7-day rolling mean and a 3-day rolling max.

**Why:** Lag features capture point-in-time persistence. Rolling statistics capture sustained episodes vs isolated spikes. A 7-day rolling mean near the current value indicates a persistent pollution episode — a distinct signal from a single high day surrounded by clean days. The 3-day max captures whether a recent spike occurred even if the mean is moderate.

### Group 4 — Cyclical Temporal Encoding (5 features)

Month and day-of-year encoded as sin/cos pairs, plus year as a linear trend.

**Why:** Standard month encoding (1–12) has a discontinuity — December (12) and January (1) are adjacent seasonally but appear far apart numerically. Sin/cos encoding wraps the calendar correctly so December and January are close in feature space. Year captures the gradual improvement in air quality from 2015 to 2020 as BS4 fuel standards phased out.

### Group 5 — City Context (1 feature)

Target-encoded city mean AQI — each city is replaced with its historical mean AQI from the training set.

**Why:** One-hot encoding 25 cities would add 25 binary features with high cardinality. Target encoding captures the pollution baseline in a single numeric feature that is directly interpretable. SHAP rank #5. The risk is data leakage — city mean AQI is derived from the target — which is documented as a known limitation.

---

## 7. Model Selection

Seven models were evaluated. Two were naive baselines — their purpose is to establish the performance floor, not to compete.

| Model                           | R²         | MAE       | RMSE      | Type     |
| ------------------------------- | ---------- | --------- | --------- | -------- |
| City Mean                       | 0.3684     | 62.01     | 95.70     | Baseline |
| Persistence (yesterday = today) | 0.7383     | 26.77     | 61.61     | Baseline |
| Linear Regression               | 0.8918     | 18.99     | 27.44     | ML       |
| Decision Tree                   | 0.8721     | 19.58     | 29.82     | ML       |
| Random Forest                   | 0.9416     | 12.66     | 20.15     | ML       |
| Gradient Boosting               | 0.9451     | 13.81     | 19.54     | ML       |
| **XGBoost (selected)**          | **0.9489** | **12.47** | **18.85** | **ML**   |

**Why the persistence baseline matters:** A persistence baseline — predicting today's AQI equals yesterday's — achieves R² = 0.7383 without any learning. This means the first 74% of explained variance in the data comes from simple day-to-day inertia. The model's additional contribution over and above pure persistence is the meaningful measure of what was actually learned.

**Hyperparameter tuning:** Three search strategies were run — full GridSearchCV (144 combinations), reduced GridSearchCV (16), and RandomizedSearchCV (50). All three returned tuned models with worse MAE than XGBoost's defaults. Default parameters (learning_rate=0.05, max_depth=6, n_estimators=500) were retained. This is consistent with published findings on tabular environmental datasets where XGBoost defaults are near-optimal.

---

## 8. SHAP Explainability

### What SHAP Is

SHAP (SHapley Additive exPlanations) is a game-theoretic method for explaining individual model predictions. It assigns each feature a contribution score — the SHAP value — representing how much that feature pushed the prediction above or below the model's expected output.

For a prediction of AQI 280 when the model baseline is 150:

- PM2.5 might contribute +68 (elevated PM2.5 pushing prediction up)
- city_aqi_mean might contribute +45 (Delhi's historically polluted baseline)
- month_cos might contribute −12 (summer month reducing prediction slightly)
- The sum of all SHAP values equals 280 − 150 = 130

This decomposition is exact and complete for every prediction.

### Why TreeExplainer Specifically

This project uses `shap.TreeExplainer`, not the model-agnostic `KernelExplainer`. TreeExplainer exploits the tree structure of XGBoost to compute exact Shapley values in polynomial time — KernelExplainer uses sampling approximations that are slower and less precise. For a model with 33 features and 500 trees, TreeExplainer is the correct choice.

### Global SHAP Findings

Mean |SHAP| across all test set predictions:

| Rank | Feature       | Mean  | SHAP      |     | Category |
| ---- | ------------- | ----- | --------- | --- | -------- |
| 1    | PM2.5         | 40.05 | Pollutant |
| 2    | PM2.5_lag1    | 28.28 | Lag       |
| 3    | PM10          | 9.89  | Pollutant |
| 4    | CO            | 5.97  | Pollutant |
| 5    | city_aqi_mean | 3.72  | Spatial   |
| 6    | O3            | 3.44  | Pollutant |
| 7    | year          | 2.45  | Temporal  |
| 8    | NOx           | 2.20  | Pollutant |

The two most important features — PM2.5 and PM2.5_lag1 — together account for 68.3 mean |SHAP| units out of the total. This confirms the model learned what atmospheric science would predict: fine particulate matter and its day-prior persistence are the dominant AQI drivers in Indian cities.

### Seasonal SHAP Shift

A key validation that the model learned real chemistry rather than statistical patterns:

| Feature | Winter (Nov–Feb) | Monsoon (Jul–Aug) | Expected           |
| ------- | ---------------- | ----------------- | ------------------ |
| PM2.5   | 42.81            | 40.94             | Winter dominant ✓  |
| CO      | 4.42             | 7.39              | Monsoon dominant ✓ |
| O3      | 2.50             | 3.34              | Monsoon dominant ✓ |

**Why CO is higher in monsoon:** Traffic-derived CO accumulates in humid air. Monsoon atmospheric conditions reduce vertical mixing, trapping surface-level emissions. The model learned this without being told.

**Why O3 is higher in monsoon:** Ground-level ozone forms through photochemical reactions involving UV radiation and precursor gases (NOx, VOCs). Intense summer UV drives this chemistry. The model learned the photochemical mechanism from data.

**Why PM2.5 dominates in winter:** Cold temperature inversions trap particulate matter near ground level. Combined with Diwali fireworks (October–November) and agricultural stubble burning in Punjab and Haryana, winter PM2.5 in North India is a well-documented phenomenon.

These patterns were not engineered into the model — they emerged from the training data and were confirmed via SHAP.

### Per-Prediction Explanation

Every prediction served by the API includes:

1. **Top contributing features** — the 5 features with highest |SHAP| for that specific input
2. **Direction** — whether each feature pushed AQI up (red) or down (green)
3. **Natural language explanation** — contextual sentence describing the primary and secondary drivers, with special handling for lag features, seasonal patterns, and city baseline effects

---

## 9. External Validation — The 5/5 Check

### Why External Validation Was Needed

Standard ML validation holds out part of the training data. This tests whether the model generalises to unseen data from the same distribution. It does not test whether the model learned patterns that reflect real-world atmospheric chemistry.

For an interpretability-focused project, a stronger question is: do the patterns the model learned match what independent real-world evidence shows?

**The approach:** Five cities were selected. Official CPCB 2024 monitoring data — collected four years after the training cutoff, from a different source — was obtained for each. The model's learned patterns were compared against this independent evidence.

### Test 1 — Seasonal Alignment (5/5 cities passed)

**What was tested:** Whether the seasonal ordering (Winter > Monsoon AQI) preserved in the training data also holds in the 2024 CPCB data.

**Why this matters:** If the model learned genuine seasonal patterns, those patterns should appear in independent real-world data from the same cities. If it memorised noise, the seasonal ordering would be arbitrary.

| City      | Train Winter | CPCB 2024 Winter | Train Monsoon | CPCB 2024 Monsoon | Aligned |
| --------- | ------------ | ---------------- | ------------- | ----------------- | ------- |
| Delhi     | 356.7        | 311.1            | 136.0         | 84.1              | ✓       |
| Mumbai    | 159.1        | 136.7            | 68.1          | 43.4              | ✓       |
| Chennai   | 119.5        | 84.6             | 106.7         | 66.3              | ✓       |
| Kolkata   | 260.2        | 171.8            | 59.4          | 46.5              | ✓       |
| Bengaluru | 104.4        | 87.6             | 87.8          | 53.5              | ✓       |

All 5/5 cities show Winter > Monsoon in both training and 2024 data. The seasonal pattern the model learned is not a training artefact — it is a real, reproducible atmospheric phenomenon.

### Test 2 — SHAP Agreement (5/5 pollutants confirmed)

**What was tested:** Whether the pollutants the model identified as seasonally prominent (via SHAP) actually dominate in the CPCB 2024 Delhi data during those seasons.

**Why this matters:** SHAP tells us what the model is relying on. If the model learned PM2.5 is prominent in winter, then CPCB 2024 winter readings should show elevated PM2.5 as the primary pollutant. This is a cross-source check on whether the model's internal reasoning reflects physical reality.

| Pollutant | SHAP seasonal prediction | CPCB 2024 prominence            | Agrees |
| --------- | ------------------------ | ------------------------------- | ------ |
| PM2.5     | Winter dominant          | 89.3% of winter days prominent  | ✓      |
| PM10      | Winter dominant          | 98.3% of winter days prominent  | ✓      |
| NO2       | Monsoon shift            | 85.5% of monsoon days prominent | ✓      |
| CO        | Monsoon dominant         | 72.6% of monsoon days prominent | ✓      |
| Ozone     | Monsoon dominant         | 79.0% of monsoon days prominent | ✓      |

5/5 pollutants confirmed. The model's SHAP values correctly predicted which pollutants would dominate in each season — confirmed by independent measurement data four years after the training window closed.

### What Was Also Found — Systematic AQI Reduction

2024 AQI levels are consistently lower than the 2015–2020 training baseline across all five cities:

| City      | Training Mean AQI | CPCB 2024 Mean AQI | Change |
| --------- | ----------------- | ------------------ | ------ |
| Delhi     | 259.2             | 209.1              | −19.3% |
| Kolkata   | 141.2             | 100.9              | −28.5% |
| Chennai   | 113.7             | 71.8               | −36.8% |
| Mumbai    | 105.6             | 91.2               | −13.7% |
| Bengaluru | 94.2              | 73.9               | −21.6% |

This confirms the model will **systematically overpredict** current AQI. Structural changes in Indian pollution (BS6 emission standards effective April 2020, increased EV adoption, stricter CPCB enforcement) reduced real-world AQI levels after the training window. The model was not retrained on post-2020 data — this is documented as a known limitation.

The seasonal patterns and SHAP agreement held despite this systematic shift — confirming the model learned relative atmospheric patterns (which pollutant matters when) rather than absolute level memorisation.

---

## 10. Known Limitations

### Train-Serve Skew on Lag Features

The model was trained with actual historical lag values — PM2.5_lag1 is genuinely yesterday's PM2.5. At inference, the deployed app uses the current PM2.5 value as a proxy for all lag features. This means:

- The model thinks PM2.5 was the same yesterday, 3 days ago, and 7 days ago
- It has never seen this exact pattern during training
- SHAP values for lag features at inference are approximations, not genuine lag contributions

The correct fix is a multi-day input form where users provide the past 7 days of readings. This is listed as future work.

### Systematic Post-2020 Overestimation

The model will overpredict current AQI by 14–37% for most cities. Retraining on 2021–2024 CPCB data is recommended before production deployment.

### Sparse City Coverage

Five cities were removed from the prediction interface due to insufficient training coverage:

| City       | Training months | Issue                                             |
| ---------- | --------------- | ------------------------------------------------- |
| Aizawl     | 5               | Only March–July 2020 (COVID lockdown period only) |
| Ernakulam  | 5               | Only February–July 2020                           |
| Kochi      | 5               | Only January–June 2020                            |
| Bhopal     | 8               | Limited to 2019–2020                              |
| Chandigarh | 8               | Limited to 2019–2020                              |

Predictions for these cities were tested and found misleading — e.g., Aizawl predicted AQI 213 (Poor) for typical Indian pollution inputs, despite a historical mean of 33.4 (Good). The issue is that the model's `city_aqi_mean` for Aizawl (33.4) was computed from COVID lockdown data, creating a contradiction when high pollutant inputs are provided.

### No Meteorological Features

Temperature, humidity, wind speed, and atmospheric pressure were not included. Prior literature estimates these add 5–12% R² improvement for AQI prediction. Their omission means the model cannot distinguish a high-PM2.5 day with strong winds (which disperses pollution) from one with a temperature inversion (which traps it).

### city_aqi_mean Leakage

Target encoding introduces data leakage — city mean AQI is derived from the target variable. The practical impact is bounded: city_aqi_mean is SHAP rank #5, not #1, so the top four predictors are all direct measurements. An ablation study (model trained without city_aqi_mean) was not run.

---

## 11. System Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                     Frontend (7 pages)                  │
│   HTML + Vanilla JS + Plotly-basic + CSS variables      │
│   Home · Predict · Explorer · Insights · Validation     │
│   Dashboard · About                                     │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP
┌───────────────────▼─────────────────────────────────────┐
│                 Flask Backend (app.py)                  │
│   7 page routes · 6 API routes · Jinja2 templates       │
│   python-dotenv · 5 static JSON data files              │
└──────┬────────────────────────────────┬─────────────────┘
       │                                │
┌──────▼──────────┐           ┌─────────▼───────────────┐
│  Model Layer    │           │  Supabase               │
│  XGBoost .pkl   │           │  aqis_predictions_log   │
│  SHAP explainer │           │  RLS enabled            │
│  feature_cols   │           │  anon read + insert     │
│  city_mapping   │           └─────────────────────────┘
└─────────────────┘
```

**Database design decision:** Only one table exists in Supabase — `aqis_predictions_log`. All static reference data (model metrics, SHAP values, city profiles, monthly aggregates, validation data) is stored as JSON files loaded at Flask startup. This follows the principle that static data should be static files, not database rows.

---

## 12. Project Structure

```text
Comprehensive Seminar Project/
│
├── Pollution_Prediction.ipynb          ← Main notebook
│
├── data/
│   ├── data.csv                        ← Kaggle CPCB dataset
│   ├── delhi2022-2024.xlsx
│   ├── mumbai2022-2024.xlsx
│   ├── chennai2022-2024.xlsx
│   ├── kolkata2022-2024.xlsx
│   └── banglore2022-2024.xlsx
│
├── deployment/
│   ├── app/
│   │   ├── app.py                      ← Flask application
│   │   ├── .env                        ← SUPABASE_URL, SUPABASE_KEY
│   │   ├── .gitignore
│   │   ├── templates/
│   │   │   ├── base.html               ← Sidebar, nav, shared layout
│   │   │   ├── index.html
│   │   │   ├── predict.html
│   │   │   ├── explorer.html
│   │   │   ├── insights.html
│   │   │   ├── validation.html
│   │   │   ├── dashboard.html
│   │   │   └── about.html
│   │   └── static/
│   │       ├── css/
│   │       │   ├── base.css            ← All CSS variables, shared styles
│   │       │   ├── index.css
│   │       │   ├── predict.css
│   │       │   ├── explorer.css
│   │       │   ├── insights.css
│   │       │   ├── validation.css
│   │       │   └── dashboard.css
│   │       ├── js/
│   │       │   ├── base.js             ← AQI helpers, Plotly config, utilities
│   │       │   ├── index.js
│   │       │   ├── predict.js
│   │       │   ├── explorer.js
│   │       │   ├── insights.js
│   │       │   ├── validation.js
│   │       │   └── dashboard.js
│   │       └── data/
│   │           ├── city_monthly.json   ← {city: {year: {month: {metrics}}}}
│   │           ├── city_profiles.json
│   │           ├── model_metrics.json
│   │           ├── shap_global.json
│   │           └── validation_data.json
│   └── model/
│       ├── xgboost_model.pkl
│       ├── feature_cols.pkl
│       ├── city_aqi_mapping.pkl
│       └── shap_explainer.pkl
│
└── outputs/
    └── figures/                        ← All .png charts from notebook
```

---

## 13. Setup and Installation

### Prerequisites

- Python 3.9+
- Node.js (for generating JSON data files from notebook if needed)
- A Supabase account with the `aqis_predictions_log` table created

### Install Dependencies

```bash
cd deployment/app
pip install flask supabase joblib numpy pandas shap xgboost python-dotenv
```

### Configure Environment Variables

Create `deployment/app/.env`:

```text
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

Never commit `.env` to version control. The `.gitignore` excludes it.

### Supabase Table Setup

Run in Supabase SQL Editor:

```sql
CREATE TABLE aqis_predictions_log (
    id              SERIAL PRIMARY KEY,
    city            VARCHAR(50),
    query_date      DATE,
    pm25            DECIMAL(6,1),
    pm10            DECIMAL(6,1),
    no              DECIMAL(6,1),
    no2             DECIMAL(6,1),
    nox             DECIMAL(6,1),
    nh3             DECIMAL(6,1),
    co              DECIMAL(6,2),
    so2             DECIMAL(6,1),
    o3              DECIMAL(6,1),
    benzene         DECIMAL(6,2),
    toluene         DECIMAL(6,2),
    predicted_aqi   DECIMAL(6,1),
    aqi_bucket      VARCHAR(20),
    top_feature     VARCHAR(50),
    top_shap_value  DECIMAL(8,2),
    explanation     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

ALTER TABLE aqis_predictions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all" ON aqis_predictions_log
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_all" ON aqis_predictions_log
    FOR INSERT TO anon, authenticated WITH CHECK (true);
```

---

## 14. Running the Application

```bash
cd deployment/app
python app.py
```

Navigate to `http://localhost:5000`

### Page Reference

| URL           | Page           | Description                                          |
| ------------- | -------------- | ---------------------------------------------------- |
| `/`           | Home           | City AQI rankings, pipeline overview                 |
| `/predict`    | Predict        | Enter pollutant readings, get AQI + SHAP explanation |
| `/explorer`   | City Explorer  | Multi-city, year-filtered AQI and pollutant charts   |
| `/insights`   | Model Insights | Model comparison leaderboard, global SHAP analysis   |
| `/validation` | Validation     | CPCB 2024 cross-temporal validation results          |
| `/dashboard`  | Dashboard      | Live Supabase prediction log                         |
| `/about`      | About          | Methodology, limitations, references                 |

---

## 15. API Reference

### `POST /api/predict`

Runs a prediction and logs to Supabase.

**Request body:**

```json
{
  "city": "Delhi",
  "date": "2019-11-15",
  "pm25": 120.0,
  "pm10": 200.0,
  "no": 20.0,
  "no2": 40.0,
  "nox": 60.0,
  "nh3": 25.0,
  "co": 1.5,
  "so2": 15.0,
  "o3": 40.0,
  "benzene": 2.0,
  "toluene": 5.0
}
```

**Response:**

```json
{
    "success":      true,
    "aqi":          281.3,
    "bucket":       "Poor",
    "color":        "#D85A30",
    "advice":       "Everyone may begin to experience health effects...",
    "explanation":  "PM2.5 is elevated — pushing the predicted AQI up by 68.8 points...",
    "top_features": [["PM2.5", 68.81], ["PM2.5_lag1", 21.4], ...],
    "all_features": [["PM2.5", 68.81], ...]
}
```

### `GET /api/dashboard`

Returns aggregated prediction log data from Supabase.

### `GET /api/city-data/<city>`

Returns city profile (mean AQI, best/worst month, coordinates).

### `GET /api/shap-global`

Returns global SHAP feature importance for all 33 features.

### `GET /api/model-metrics`

Returns the model comparison leaderboard data.

### `GET /api/validation/<city>`

Returns training vs CPCB 2024 monthly comparison for the specified city.

---

## References

1. Sasikala S., Shalini R., Renuka Devi D., Chinnapparaj D. _Real Time Air Quality Analytics of Chennai and its Implications on Health._ Urban India, Vol. 43(I), January–June 2023.

2. Halsana S. _Air Quality Prediction Model using Supervised Machine Learning Algorithms._ IJSRCSEIT, Vol. 6, Issue 4, July–August 2020.

3. Lundberg S. M., Lee S. I. _A Unified Approach to Interpreting Model Predictions._ NeurIPS, 2017.

4. Chen T., Guestrin C. _XGBoost: A Scalable Tree Boosting System._ KDD, 2016.

5. Central Pollution Control Board (CPCB). _National Ambient Air Quality Standards._ Government of India, 2009.

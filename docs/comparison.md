# Comparative Analysis of Related Literature

**Study under review:** An Interpretable Air Quality Severity Assessment System (referred to as the Present Study)  
**Paper 1:** Real Time Air Quality Analytics of Chennai and its Implications on Health — Sasikala et al., Urban India, Vol. 43(I), January–June 2023  
**Paper 2:** Air Quality Prediction Model using Supervised Machine Learning Algorithms — Halsana, IJSRCSEIT, Vol. 6, Issue 4, July–August 2020

---

## 1. Problem Framing

| Dimension         | Present Study                              | Paper 1                  | Paper 2                            |
| ----------------- | ------------------------------------------ | ------------------------ | ---------------------------------- |
| Core task         | AQI regression + explainability            | AQI classification       | AQI regression                     |
| Geographic scope  | 25 Indian cities, national                 | 3 stations, Chennai only | Single dataset, unspecified region |
| Temporal coverage | 2015–2020 (training) + 2024 (validation)   | 2019–2021                | Not specified                      |
| Output type       | Continuous AQI + bucket + SHAP explanation | Categorical bucket only  | Continuous AQI + descriptive label |
| Explainability    | Genuine SHAP values per prediction         | None                     | None                               |

Both prior works predict or classify AQI without explaining the drivers behind individual predictions. The present study introduces a third layer — interpretability via SHAP — making predictions actionable for public health communication rather than serving purely as a forecasting mechanism.

---

## 2. Dataset

| Dimension                   | Present Study                                                         | Paper 1                                        | Paper 2                                                           |
| --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Source                      | CPCB via Kaggle (Rohan Rao)                                           | Tamil Nadu Pollution Control Board (TNPCB)     | cpcb.nic.in + UCI repository                                      |
| Size                        | 29,531 records (pre-cleaning)                                         | Not explicitly stated                          | 7,288 rows                                                        |
| Cities/Stations             | 26 cities                                                             | 3 stations (Kodungaiyur, Perungudi, Royapuram) | Not specified                                                     |
| Pollutants                  | PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene, Xylene | PM10, PM2.5, SO2, NO2, CO, NH3, O3             | PM2.5, PM10, SO2, NO2, CO + meteorological (temp, humidity, wind) |
| Meteorological features     | No                                                                    | No                                             | Yes (temperature, pressure, humidity, wind speed)                 |
| External validation dataset | Yes — CPCB 2024, 5 cities, independent                                | No                                             | No                                                                |

Paper 2 incorporates meteorological features — temperature, humidity, wind speed, and pressure — which are physically relevant to pollution dispersion and particle formation. The present study does not include meteorological data, which constitutes a noted limitation. This is partially compensated through lag and rolling features that capture temporal persistence in pollutant concentrations. Paper 1 restricts analysis to three monitoring stations within a single city, considerably limiting the spatial generalizability of its findings.

---

## 3. Data Audit and Quality Control

| Dimension                 | Present Study                                                                               | Paper 1                   | Paper 2                                         |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------- |
| Authenticity verification | Yes — 4 explicit statistical tests                                                          | Not mentioned             | Not mentioned                                   |
| Null handling strategy    | Tiered — interpolation (<20%), seasonal median (20–40%), drop (>50%)                        | Linear interpolation only | Null removal (rows dropped)                     |
| Outlier detection         | Systematic temporal clustering analysis per city; Ahmedabad removed; isolated spikes capped | Not mentioned             | Quantile method on PM2.5 only                   |
| Data leakage prevention   | Chronological train/test split explicitly enforced                                          | Not mentioned             | Random 80/20 split — potential temporal leakage |
| Synthetic data detection  | Conducted — original dataset rejected and replaced                                          | Not applicable            | Not applicable                                  |

The data audit methodology in the present study is notably more comprehensive than in either prior work. Paper 1 addresses data quality only through interpolation and does not report authenticity checks. Paper 2 employs a random train/test split — a recognised methodological flaw for time-series data — which inflates reported performance metrics by allowing future observations to inform training. The chronological split used in the present study produces conservative, realistic estimates of generalisation performance.

---

## 4. Feature Engineering

| Dimension                | Present Study                                             | Paper 1           | Paper 2                       |
| ------------------------ | --------------------------------------------------------- | ----------------- | ----------------------------- |
| Raw pollutants           | 11 (after Xylene removal)                                 | 7                 | 10 (including meteorological) |
| Temporal features        | Cyclical encoding (sin/cos for month, day of year) + year | Not mentioned     | Not mentioned                 |
| Lag features             | PM2.5, NO2, CO, O3 at lag-1, lag-3, lag-7                 | None              | None                          |
| Rolling statistics       | 7-day mean, 3-day max for PM2.5 and NO2                   | None              | None                          |
| City encoding            | Target encoding (city mean AQI)                           | N/A — single city | N/A                           |
| Total features           | 33                                                        | Not specified     | 10                            |
| Feature selection method | Implicit via XGBoost importance + SHAP                    | Not discussed     | Correlation-based             |

The present study employs the most extensive feature engineering of the three works. Cyclical encoding addresses the discontinuity problem in raw time features, where conventional integer encoding incorrectly treats December and January as distant. Lag features introduce temporal memory into the model — grounded in the physical persistence of atmospheric particulates, confirmed by a lag-1 autocorrelation of 0.874 in the dataset. Neither prior work incorporates temporal memory into its feature representation.

---

## 5. Model Selection and Comparison

| Dimension                 | Present Study                                                                             | Paper 1                                     | Paper 2                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Models evaluated          | XGBoost, Gradient Boosting, Random Forest, Decision Tree, Linear Regression + 2 baselines | Random Forest, KNN, Decision Tree           | Multiple Linear Regression, SVR, Decision Tree, Random Forest |
| Final selected model      | XGBoost (regressor)                                                                       | Random Forest / Decision Tree (classifiers) | Random Forest (regressor)                                     |
| Naive baseline models     | Yes — persistence and city mean                                                           | No                                          | No                                                            |
| Hyperparameter tuning     | Yes — GridSearchCV + RandomizedSearchCV with TimeSeriesSplit                              | Not mentioned                               | Not mentioned                                                 |
| Cross-validation strategy | TimeSeriesSplit (5 folds) — preserves temporal ordering                                   | Not mentioned                               | Not mentioned                                                 |
| Basis for model selection | Evidence-based — XGBoost outperforms all alternatives on MAE and R²                       | Not clearly justified                       | Random Forest selected by test accuracy                       |

The present study is the only one among the three to include naive baseline models. Without such baselines, performance figures of R² = 0.94 or 0.99 carry no interpretive reference point. Paper 1's reported 100% classification accuracy across three stations and three algorithms raises serious methodological concerns — such results are statistically extraordinary in real-world AQI classification tasks with overlapping category boundaries, and may reflect data leakage or a trivially separable problem rather than genuine predictive power. Paper 2's Decision Tree achieving R² = 1.0000 on training data is consistent with overfitting rather than generalisation.

---

## 6. Performance Metrics

| Model                                | R²            | MAE       | RMSE      |
| ------------------------------------ | ------------- | --------- | --------- |
| **Present Study — XGBoost**          | **0.9489**    | **12.47** | **18.85** |
| Present Study — Persistence baseline | 0.7383        | 26.77     | 61.61     |
| Present Study — Random Forest        | 0.9416        | 12.66     | 20.15     |
| Paper 2 — Random Forest (test)       | 0.99985       | 0.00373   | —         |
| Paper 2 — Decision Tree (test)       | 0.9997        | 0.00378   | —         |
| Paper 2 — Linear Regression (test)   | 0.9379        | 0.15332   | —         |
| Paper 1 — Random Forest              | 100% accuracy | —         | —         |

Paper 2 reports an MAE of 0.00373 on AQI prediction across a scale of 0–500. This implies an average prediction error of less than 0.004 AQI units, which is physically implausible for a real-world environmental dataset. A probable explanation is that metrics were computed on a scaled or normalised target variable and not converted back to the original AQI scale before reporting. The present study reports an MAE of 12.47 on the original AQI scale — a realistic figure that reflects genuine prediction uncertainty.

Paper 1's 100% accuracy result across all three stations and all three algorithms, including KNN which is sensitive to class boundaries, is difficult to reconcile with the known complexity of AQI classification in Indian urban environments, where category boundaries are frequently ambiguous.

---

## 7. Explainability

| Dimension                               | Present Study                                            | Paper 1 | Paper 2                  |
| --------------------------------------- | -------------------------------------------------------- | ------- | ------------------------ |
| Explainability method                   | Genuine SHAP (TreeExplainer)                             | None    | None                     |
| Global feature importance               | Yes — mean absolute SHAP per feature                     | No      | Correlation heatmap only |
| Local (per-prediction) explanation      | Yes — individual SHAP values                             | No      | No                       |
| Seasonal validation of explanations     | Yes — winter vs monsoon SHAP comparison                  | No      | No                       |
| Natural language explanation            | Yes — auto-generated from top SHAP features              | No      | No                       |
| Independent validation of SHAP findings | Yes — CPCB 2024 prominent pollutant data (5/5 agreement) | No      | No                       |

Explainability is the most significant differentiator of the present study relative to both prior works. Neither Paper 1 nor Paper 2 provides any mechanism to answer why a particular prediction was generated. The SHAP implementation in the present study addresses this gap at the feature level, and the independent validation against CPCB 2024 prominent pollutant data — a source entirely separate from the training data — confirms that the learned feature importances correspond to real atmospheric chemistry rather than artefacts of the training distribution.

---

## 8. Validation

| Dimension                      | Present Study                                         | Paper 1       | Paper 2            |
| ------------------------------ | ----------------------------------------------------- | ------------- | ------------------ |
| Test set type                  | Chronological holdout (2019–2020)                     | Not specified | Random 20% holdout |
| External validation            | Yes — CPCB 2024, 5 cities, independent source         | No            | No                 |
| Temporal generalisation gap    | 4 years between training endpoint and validation data | None          | None               |
| Seasonal pattern verification  | Yes — training vs 2024 monthly AQI comparison         | No            | No                 |
| Pollutant prominence agreement | Yes — 5/5 SHAP vs CPCB 2024 (Delhi)                   | No            | No                 |
| Policy effect analysis         | Yes — COVID lockdown, 53.2% AQI reduction documented  | No            | No                 |

The external validation component of the present study is absent from both prior works. Testing model-learned patterns against data collected four years after the training period — and from an entirely independent source — constitutes a genuinely stringent generalisation test. The 5/5 agreement between SHAP seasonal findings and CPCB 2024 prominent pollutant data provides cross-source, cross-temporal confirmation that the model has learned physically meaningful relationships.

---

## 9. Limitations

| Limitation                          | Present Study               | Paper 1                        | Paper 2                   |
| ----------------------------------- | --------------------------- | ------------------------------ | ------------------------- |
| No meteorological features          | Present                     | Present                        | Not applicable — included |
| Limited to city-level granularity   | Present                     | Not applicable — station-level | Present                   |
| Training data ends 2020             | Present                     | Not applicable — covers 2021   | —                         |
| Systematic post-2020 overestimation | Acknowledged explicitly     | Not discussed                  | Not discussed             |
| No real-time data ingestion         | Present                     | Claimed in title               | Not applicable            |
| Web deployment                      | Planned                     | Not mentioned                  | Not mentioned             |
| Limitations section                 | Yes — explicitly documented | Minimal                        | Minimal                   |
| Limitations section                 | Yes — explicitly documented | Minimal                        | Minimal                   |

---

## 10. Overall Assessment

### Contributions of the Present Study Relative to Prior Work

The present study advances beyond both reviewed papers in five substantive areas.

**Scale:** 25 cities spanning national territory versus three stations in one city (Paper 1) or an unspecified single-region dataset (Paper 2).

**Methodological rigour:** Chronological train/test splitting, explicit baseline comparisons, and dataset authenticity verification are absent from both prior works. The random split employed by Paper 2 is a known source of inflated performance metrics in time-series settings.

**Feature representation:** Cyclical temporal encoding, lag features, and rolling statistics introduce temporal memory that is entirely absent from both reviewed papers. These features are physically motivated by the atmospheric persistence of pollutants.

**Explainability:** Genuine SHAP values at the prediction level, with seasonal validation and independent cross-source confirmation, are not present in either prior work. This component transforms the system from a prediction tool into a decision-support instrument.

**Validation depth:** Cross-temporal external validation against 2024 CPCB data — documenting both pattern preservation and systematic AQI reduction attributable to post-2020 policy interventions — is a methodological contribution not attempted in either reviewed paper.

### Advantages of Prior Works Relative to the Present Study

Paper 2 incorporates meteorological features that are physically important drivers of pollution dispersion and secondary particle formation. The absence of these features in the present study is its most significant limitation relative to the reviewed literature.

Paper 1 includes direct health outcome measurements — respiratory incidence surveys and symptom prevalence data — linking AQI levels to measured community health effects. The present study predicts AQI as a proxy for health risk but does not quantify downstream health impact.

Paper 1 also operates at the monitoring station level, enabling within-city spatial analysis that city-level aggregation cannot replicate.

### Summary

The present study produces more conservative and verifiable performance metrics than either reviewed paper, and introduces explainability and external validation components that are absent from both. The primary methodological gap is the absence of meteorological features, which represents the most important direction for future development. The metrics reported in Paper 1 (100% accuracy) and Paper 2 (MAE = 0.00373) are most plausibly explained by methodological issues — random temporal splitting and probable metric reporting on scaled targets — rather than superior model performance.

---

## 11. Citation Positioning

**Paper 1 (Sasikala et al., 2023)** is cited to establish the applicability of machine learning methods to Indian urban air quality data, to motivate the health implications of AQI prediction, and to position station-level granularity as a future extension of city-level approaches.

**Paper 2 (Halsana, 2020)** is cited to justify the regression framing over classification-only approaches, to confirm the prominence of PM2.5 and PM10 as primary AQI predictors, and to identify meteorological feature integration as a gap in the current work and a direction for future development.

---

_Prepared for: An Interpretable Air Quality Severity Assessment System_  
_Date: March 2026_

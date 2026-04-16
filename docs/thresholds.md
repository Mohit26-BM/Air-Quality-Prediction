# Threshold 1: PM2.5–AQI Correlation > 0.7

**Why 0.7 specifically?**

In statistics, a correlation > 0.7 indicates a strong relationship.  
For AQI, which is directly computed from PM2.5 via the CPCB sub-index formula, anything below 0.7 suggests the two columns may have been generated independently.

The 0.7 threshold is intentionally conservative:

- AQI is the **maximum of all pollutant sub-indices**
- On days where **NO₂ or O₃ dominates**, PM2.5 correlation naturally weakens

A synthetic dataset would typically show correlation < 0.1.  
Real data should either:

- Exceed 0.7 for PM2.5, or  
- Show a dominant pollutant with correlation > 0.7  
  (e.g., PM10 at 0.803)

---

## Threshold 2: Delhi Seasonal Std > 30 μg/m³

**Why 30 specifically?**

Based on CPCB Delhi annual reports:

- Winter monthly mean PM2.5: ~150–200 μg/m³  
- Monsoon monthly mean PM2.5: ~40–60 μg/m³  
- Annual variation: ~120–140 μg/m³  

The standard deviation of monthly means across this range typically exceeds 50.

- A threshold of **30 is deliberately conservative**
- Even partially degraded real datasets should exceed this

In contrast:

- Synthetic datasets with uniform random values (0–500) produce  
  **monthly std ≈ 5–8**
- This lacks seasonal structure

Thus, 30 creates a clear separation between real and synthetic data.

---

## Threshold 3: City Spread > 20 μg/m³

**Why 20 specifically?**

Approximate annual mean PM2.5 from CPCB data:

- Delhi: ~100–120 μg/m³ (highest pollution)  
- Kolkata: ~60–80 μg/m³  
- Mumbai: ~40–55 μg/m³  
- Chennai: ~35–50 μg/m³  
- Bangalore: ~30–45 μg/m³  

- Standard deviation across these cities: ~30–35 μg/m³  
- Threshold of **20 is conservative**, allowing variation in real datasets

Synthetic datasets tend to produce:

- Nearly identical city values  
- Standard deviation < 5  

Thus, 20 effectively distinguishes real vs synthetic distributions.

---

### Threshold 4: Autocorrelation > 0.5

**Why 0.5 specifically?**

Atmospheric science literature reports **PM2.5 lag-1 autocorrelation of 0.7–0.9** for urban Indian stations, reflecting physical persistence of pollutants.

Threshold interpretation:

- > 0.7 → Strong persistence (expected for real data)  
- 0.5–0.7 → Moderate (acceptable, possibly noisy sensors)  
- < 0.5 → Weak (suggests randomness)  
- < 0.1 → No temporal structure (synthetic data)

Your observed value:

**0.874 — firmly within the expected range for real Delhi measurements.**

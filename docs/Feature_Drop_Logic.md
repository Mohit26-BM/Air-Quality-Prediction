# Feature Drop Decision

```text
Xylene:  61.3% → DROP  (exceeds 50% threshold)
Toluene: 27.2% → KEEP but impute with seasonal median
NH3:     35.0% → KEEP but impute with seasonal median
PM10:    37.7% → KEEP but impute carefully (important feature)
```

---

## Null Treatment Decision Per Column

```text
Column    Null%   Treatment
────────────────────────────────────────────────────
Xylene    61.3    Drop entirely
PM10      37.7    Seasonal median (too many gaps for interpolation)
NH3       35.0    Seasonal median
Toluene   27.2    Seasonal median
Benzene   19.0    Linear interpolation → ffill → seasonal median
AQI       15.9    Recompute from pollutants (don't impute target)
AQI_Bucket 15.9   Recompute from AQI values
PM2.5     15.6    Linear interpolation → ffill → seasonal median
O3        13.6    Linear interpolation → ffill → seasonal median
SO2       13.1    Linear interpolation → ffill → seasonal median
NO        12.1    Linear interpolation → ffill → seasonal median
NO2       12.1    Linear interpolation → ffill → seasonal median
NOx       14.2    Linear interpolation → ffill → seasonal median
CO         7.0    Linear interpolation → ffill → seasonal median
```

---

### The Logic Behind Treatment Choice

```text
< 20% null:  Linear interpolation safe
             Short gaps, pollution changes gradually
             
20-40% null: Seasonal median safer
             Too many gaps for linear to be valid
             Same month same city across years
             is more honest than fabricating a trend

> 50% null:  Drop
             Imputing majority-missing data creates
             more fictional values than real ones
```

---

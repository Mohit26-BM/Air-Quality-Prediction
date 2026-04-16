# **Title**

Real Time Air Quality Analytics of Chennai and its Implications on Health

**Published In**
Urban India, Vol. 43 (I), January–June 2023

**Authors**
Sasikala S (Professor), Shalini R, Renuka Devi D, and Chinnapparaj D — all from the Department of Computer Science, IDE, University of Madras, Chennai.

---

**Objective**
To analyse the Air Quality Index (AQI) in Chennai city by collecting, pre-processing, and classifying air pollution data from three locations, and to identify the most accurate machine learning method for AQI classification.

---

**Dataset**
Data was collected from the Tamil Nadu Pollution Control Board (TNPCB) for the years 2019 to 2021, covering three stations: Kodungaiyur, Perungudi, and Royapuram. The pollutants measured were PM10, PM2.5, SO2, NO2, CO, NH3, and O3.

## **Procedure**

The methodology followed a three-stage framework:

**Stage 1 — Pre-processing:** The raw datasets contained missing values. These were handled using Linear Interpolation, which estimates unknown data points between two known points by assuming a linear relationship between them. The formula used was: yp = y0 + ((y1 − y0)/(x1 − x0)) × (xp − x0).

**Stage 2 — Classification:** After pre-processing, the data was classified into six AQI categories — Good, Satisfactory, Moderately Polluted, Poor, Very Poor, and Severe — based on the AQI ranges defined by the Central Pollution Control Bureau. Three machine learning algorithms were applied: Random Forest (RF), K-Nearest Neighbour (KNN), and Decision Tree (DT).

**Stage 3 — Visualization and Inferences:** Results were visualized using Tableau across all three stations, with pollutant-wise and year-wise analysis.

## **Machine Learning Methods Used**

Random Forest is a supervised ensemble learning algorithm that builds multiple decision trees using bootstrap aggregating (bagging) and random feature selection, with the final prediction determined by majority vote among all trees.

KNN classifies a data point by identifying its K nearest neighbours in the training data and assigning the most frequently occurring class among them.

Decision Tree uses a tree structure where internal nodes represent attribute splits and leaf nodes represent class labels. Splits are evaluated using Information Gain and Gini Index metrics.

## **Station-wise Findings**

Royapuram — Located in northern Chennai near the port, residents have long suffered from exposure to limestone, iron ore, and coal dust. PM2.5 and PM10 levels crossed the 200 AQI (severe) mark in January 2020. SO2 was moderate post-2020, NO2 ranged moderate to poor, and O3 showed high variation between January 2019 and January 2020. High incidence of COPD and asthma was reported in the area. The AQI classification showed predominantly Very Poor and Severe levels.

Perungudi — Located about 10 km south of Adyar, near the Perungudi dump yard. PM2.5 and PM10 were severe during November–December 2019. SO2 had peaks during 2019. NO2 was high in August 2019 and January 2020. PM2.5 samples collected at the dumpsite indicated elevated concentrations of toxic heavy metals including arsenic, cadmium, copper, chromium, nickel, lead, and zinc during winter. The AQI classification showed predominantly Very Poor, Poor, and Moderate levels.

Kodungaiyur — A residential area in northern Chennai with a nearby dump yard. PM2.5 and PM10 were high from November 2019 to January 2020, with further variations between November 2020 and February 2021. A CAG survey among 66 residents found 32.8% reported respiratory issues, 31.7% had musculoskeletal symptoms, 8.5% reported headaches and sleeplessness, 7.48% had eye infections, and 7.2% experienced skin infections. Air, water, and leachate samples tested positive for heavy metals and volatile organic compounds exceeding BIS and USEPA permissible limits. AQI classification showed predominantly Satisfactory and Good levels.

## **Classification Results**

The accuracy results across all three stations were as follows:

Random Forest achieved 100% accuracy, 100% F1 Score, and 100% Precision at all three stations.

Decision Tree achieved 100% accuracy, 100% F1 Score, and 100% Precision at all three stations.

KNN achieved 99% accuracy at Kodungaiyur, 97% at Royapuram, and 100% at Perungudi, with an overall average of approximately 98%.

**Conclusion**
Both Random Forest and Decision Tree achieved 100% accuracy, while KNN achieved 98% accuracy. The study concluded that machine learning methods have strong potential in accurately analysing and managing air pollution levels. The authors also proposed several preventive measures including promoting public transport, cleaner energy sources, green spaces, stricter industrial regulations, proper waste disposal, energy-efficient building codes, financial incentives for cleaner practices, and regular public monitoring of air quality data.

**Funding**
The work was supported and funded by RUSA 2.0 – Research Innovation and Quality Improvement.

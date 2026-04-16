# **Title**

Air Quality Prediction Model using Supervised Machine Learning Algorithms

**Published In**
International Journal of Scientific Research in Computer Science, Engineering and Information Technology (IJSRCSEIT), ISSN: 2456-3307, Volume 6, Issue 4, July-August 2020

**Author**
Suprateek Halsana, Department of Computer Science and Engineering, IMS Engineering College, Ghaziabad, Uttar Pradesh, India

**Objective**
To predict the Air Quality Index (AQI) based on the concentration of pollutants such as PM2.5, PM10, SO2, NO2, CO, and weather conditions including temperature, pressure, and humidity, using supervised machine learning algorithms. The goal was to determine which algorithm provides the best accuracy and least error in AQI prediction.

**Dataset**
The dataset was sourced from cpcb.nic.in and the UCI repository. It contains 7,288 rows and 11 columns. The independent variables (features) are Temperature, Humidity, Wind Speed, Visibility, Pressure, SO2, NO2, Rainfall, PM10, and PM2.5. The dependent variable (target) is AQI. The dataset was split 80% for training and 20% for testing.

## **Machine Learning Algorithms Used**

Multiple Linear Regression models the linear relationship between multiple independent input variables and a single dependent output variable (AQI). The formula used is: Ŷ = b0 + b1X1 + b2X2 + ... + bpXp.

Support Vector Regression (SVR) is a variant of SVM that tries to fit the best possible line within a predefined threshold variance, minimizing error while maximizing the margin of the hyperplane.

Decision Tree Regression builds a tree structure that maximizes Information Gain at each split. The max_depth parameter controls tree depth; setting it too high leads to overfitting.

Random Forest Regression is an ensemble method using multiple decision trees with Bootstrap Aggregation (bagging). The final model output is a summation of all base model predictions: g(x) = f0(x) + f1(x) + f2(x) + ...

**Workflow**
The work followed these sequential steps: Importing Dataset → Data Preprocessing → Model Fitting → Training and Testing → Analysis through Visualization Graphs → Comparative Analysis of Algorithms → Result. An Air Quality Check Function was additionally applied to convert the predicted numerical AQI into descriptive labels: Healthy, Moderate, Unhealthy, Very Unhealthy, and Hazardous.

## **Preprocessing Steps**

Check for Missing/Null Values: Null values were identified and removed, resulting in a clean dataset with no null values.

Check for Most Relevant Features: Correlation coefficients were computed between each feature and the target AQI. PM2.5 and PM10 were found to be the most relevant features.

Outlier Detection and Removal: Outliers were detected in PM2.5. The Quantile method was used to remove the extreme 0.01 portion of the data acting as outliers, resulting in a more normally distributed dataset.

Data Standardization/Scaling: Since features had widely varying ranges, data scaling was applied to bring all features into a uniform range.

Data Normalization: Applied only if the data was not normally distributed, with caution noted as it can affect inter-feature correlations.

Correlation Check: A heatmap was used to check for highly correlated features. No feature pair had a correlation above 0.70. The highest correlation found was between PM10 and PM2.5 at 0.52.

**Visualization Observations**
Scatter plots were created for PM10 vs AQI and PM2.5 vs AQI. PM2.5 showed a linear relationship with AQI, while PM10 showed a slightly steeper Gaussian distribution. The frequency of air quality categories (Healthy, Unhealthy, Very Unhealthy, Moderate) was found to be the same in both the Test Air Quality data and the Predicted Air Quality data, indicating high prediction accuracy.

## **Results**

Prediction Scores (R² score):

Multiple Linear Regression — Training: 0.9405, Testing: 0.9379

Support Vector Regression — Training: 0.9937, Testing: 0.9869

Decision Tree Regression — Training: 1.0000, Testing: 0.9997

Random Forest Regression — Training: 0.99997, Testing: 0.99985

Error Metrics:

Multiple Linear Regression — MSE: 0.05986, MAE: 0.15332

Support Vector Regression — MSE: 0.01257, MAE: 0.07127

Decision Tree Regression — MSE: 0.00020, MAE: 0.00378

Random Forest Regression — MSE: 0.00013, MAE: 0.00373

The paper states that while Decision Tree achieved the highest score on the training dataset, the testing dataset score is the real measure of performance. Therefore, Random Forest Regression was identified as the best algorithm, achieving a testing accuracy of 0.99985 with the lowest Mean Squared Error of 0.00013 and the lowest Mean Absolute Error of 0.00373.

**Conclusion**
Out of the four algorithms tested, Random Forest Regression performed the best for AQI prediction on the testing dataset, with the highest accuracy and the least error among all methods compared.

**Future Works**
The author stated plans to work on real-time live datasets extracted via Web Scraping instead of static datasets, and to build a comparative analysis of air quality predictions across various regions of the country.

## **Acknowledgement**

The work was completed under the guidance of Dr. Pankaj Agarwal (Professor and Head) and Ms. Sapna Yadav (Assistant Professor), Department of Computer Science and Engineering, IMS Engineering College, Ghaziabad, as part of a Summer Internship in Machine Learning.

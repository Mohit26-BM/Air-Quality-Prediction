from flask import Flask, request, jsonify, render_template
from supabase import create_client
import joblib
import numpy as np
import pandas as pd
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)


@app.template_filter("aqi_bucket")
def aqi_bucket_filter(aqi):
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Satisfactory"
    if aqi <= 200:
        return "Moderate"
    if aqi <= 300:
        return "Poor"
    if aqi <= 400:
        return "Very Poor"
    return "Severe"


@app.template_filter("aqi_css_class")
def aqi_css_class_filter(aqi):
    bucket = aqi_bucket_filter(aqi)
    return {
        "Good": "good",
        "Satisfactory": "satisfactory",
        "Moderate": "moderate",
        "Poor": "poor",
        "Very Poor": "very-poor",
        "Severe": "severe",
    }.get(bucket, "")


# =============================================
# SUPABASE — only for predictions_log
# =============================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# =============================================
# LOAD MODEL ARTIFACTS
# =============================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "model")

model = joblib.load(os.path.join(MODEL_DIR, "xgboost_model.pkl"))
feature_cols = joblib.load(os.path.join(MODEL_DIR, "feature_cols.pkl"))
city_mapping = joblib.load(os.path.join(MODEL_DIR, "city_aqi_mapping.pkl"))
explainer = joblib.load(os.path.join(MODEL_DIR, "shap_explainer.pkl"))

# ── Load static data from JSON files ─────────
DATA_DIR = os.path.join(BASE_DIR, "static", "data")


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


MODEL_METRICS = load_json("model_metrics.json")
SHAP_GLOBAL = load_json("shap_global.json")
CITY_PROFILES = load_json("city_profiles.json")
VALIDATION_DATA = load_json("validation_data.json")

# city_monthly needs int keys (JSON stores as strings)

# Replace the existing city_monthly loader in app.py
_cm = load_json("city_monthly.json")
CITY_MONTHLY = {
    city: {
        int(year): {int(month): v for month, v in months.items()}
        for year, months in years.items()
    }
    for city, years in _cm.items()
}

# =============================================
# HELPER FUNCTIONS
# =============================================


def compute_bucket(aqi):
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Satisfactory"
    elif aqi <= 200:
        return "Moderate"
    elif aqi <= 300:
        return "Poor"
    elif aqi <= 400:
        return "Very Poor"
    else:
        return "Severe"


def get_health_advice(bucket):
    advice = {
        "Good": "Air quality is satisfactory. No restrictions on outdoor activity.",
        "Satisfactory": "Acceptable air quality. Unusually sensitive individuals should consider limiting prolonged exertion.",
        "Moderate": "Sensitive groups may experience health effects. General public unlikely to be affected.",
        "Poor": "Everyone may begin to experience health effects. Sensitive groups should limit outdoor activity.",
        "Very Poor": "Health alert — everyone may experience serious effects. Avoid prolonged outdoor exertion.",
        "Severe": "Health emergency. Avoid all outdoor activity. Keep windows closed.",
    }
    return advice.get(bucket, "")


def get_bucket_color(bucket):
    colors = {
        "Good": "#2ecc71",
        "Satisfactory": "#27ae60",
        "Moderate": "#f39c12",
        "Poor": "#e67e22",
        "Very Poor": "#e74c3c",
        "Severe": "#8e44ad",
    }
    return colors.get(bucket, "#95a5a6")


def build_feature_vector(data):
    city = data.get("city", "Delhi")
    date = pd.Timestamp(data.get("date", "2019-11-01"))
    pm25 = float(data.get("pm25", 60.0))
    pm10 = float(data.get("pm10", 100.0))
    no = float(data.get("no", 15.0))
    no2 = float(data.get("no2", 30.0))
    nox = float(data.get("nox", 45.0))
    nh3 = float(data.get("nh3", 20.0))
    co = float(data.get("co", 1.5))
    so2 = float(data.get("so2", 15.0))
    o3 = float(data.get("o3", 40.0))
    benz = float(data.get("benzene", 2.0))
    tol = float(data.get("toluene", 5.0))

    month = date.month
    doy = date.dayofyear
    year = date.year
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)
    doy_sin = np.sin(2 * np.pi * doy / 365)
    doy_cos = np.cos(2 * np.pi * doy / 365)

    city_aqi_mean = city_mapping.get(city, 150.0)

    features = [
        pm25,
        pm10,
        no,
        no2,
        nox,
        nh3,
        co,
        so2,
        o3,
        benz,
        tol,
        month_sin,
        month_cos,
        doy_sin,
        doy_cos,
        year,
        pm25,
        pm25,
        pm25,  # lag1, lag3, lag7 (proxy)
        no2,
        no2,
        no2,  # lag1, lag3, lag7 (proxy)
        co,
        co,
        co,  # lag1, lag3, lag7 (proxy)
        o3,
        o3,
        o3,  # lag1, lag3, lag7 (proxy)
        pm25,
        pm25,  # roll7_mean, roll3_max (proxy)
        no2,
        no2,  # roll7_mean, roll3_max (proxy)
        city_aqi_mean,
    ]
    return pd.DataFrame([features], columns=feature_cols)


# =============================================
# ROUTES — Static data
# =============================================


@app.route("/")
def home():
    cities = sorted(city_mapping.keys())
    top_polluted = sorted(
        CITY_PROFILES.items(), key=lambda x: x[1]["mean_aqi"], reverse=True
    )[:5]
    cleanest = sorted(CITY_PROFILES.items(), key=lambda x: x[1]["mean_aqi"])[:5]
    return render_template(
        "index.html",
        cities=cities,
        top_polluted=top_polluted,
        city_profiles=CITY_PROFILES,
        cleanest=cleanest,
    )


@app.route("/predict")
def predict_page():
    cities = sorted(city_mapping.keys())
    return render_template(
        "predict.html", cities=cities, city_monthly=CITY_MONTHLY  # ← add this
    )


@app.route("/insights")
def insights_page():
    return render_template(
        "insights.html",
        model_metrics=MODEL_METRICS,
        shap_global=SHAP_GLOBAL[:10],
        # Injected like LoanIQ COEFFICIENTS
    )


@app.route("/validation")
def validation_page():
    return render_template(
        "validation.html",
        validation_data=VALIDATION_DATA,
        cities=list(VALIDATION_DATA.keys()),
    )


@app.route("/explorer")
def explorer_page():
    cities = sorted(city_mapping.keys())
    return render_template(
        "explorer.html",
        cities=cities,
        city_monthly=CITY_MONTHLY,
        city_profiles=CITY_PROFILES,
    )


@app.route("/what-if")
def what_if_page():
    cities = sorted(city_mapping.keys())
    return render_template(
        "what_if.html",
        cities=cities,
        city_monthly=CITY_MONTHLY,
    )


@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


# =============================================
# API ROUTES — Like BigMart runtime routes
# =============================================


@app.route("/api/predict", methods=["POST"])
def api_predict():
    try:
        input_data = request.get_json()
        feature_df = build_feature_vector(input_data)
        aqi_pred = float(model.predict(feature_df)[0])
        aqi_pred = round(aqi_pred, 1)
        bucket = compute_bucket(aqi_pred)
        color = get_bucket_color(bucket)
        advice = get_health_advice(bucket)

        # ── SHAP ─────────────────────────────────
        shap_vals = explainer.shap_values(feature_df)
        shap_dict = dict(zip(feature_cols, [round(float(v), 2) for v in shap_vals[0]]))
        all_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
        top_features = all_features[:5]

        # ── Human-readable explanation ────────────
        # SHAP values are relative to model baseline (~130 AQI)
        # Positive = feature pushes prediction above baseline
        # Negative = feature pulls prediction below baseline

        top_name, top_val = top_features[0]

        # ── Primary driver sentence ───────────────
        # Rename lag/rolling features to plain English
        def readable(name):
            replacements = {
                "PM2.5_lag1": "PM2.5 (yesterday)",
                "PM2.5_lag3": "PM2.5 (3 days ago)",
                "PM2.5_lag7": "PM2.5 (7 days ago)",
                "PM2.5_roll7_mean": "PM2.5 (7-day average)",
                "PM2.5_roll3_max": "PM2.5 (3-day peak)",
                "NO2_lag1": "NO2 (yesterday)",
                "NO2_lag3": "NO2 (3 days ago)",
                "NO2_lag7": "NO2 (7 days ago)",
                "NO2_roll7_mean": "NO2 (7-day average)",
                "NO2_roll3_max": "NO2 (3-day peak)",
                "CO_lag1": "CO (yesterday)",
                "CO_lag3": "CO (3 days ago)",
                "CO_lag7": "CO (7 days ago)",
                "O3_lag1": "O3 (yesterday)",
                "O3_lag3": "O3 (3 days ago)",
                "O3_lag7": "O3 (7 days ago)",
                "city_aqi_mean": "city pollution baseline",
                "year": "year trend",
                "month_sin": "seasonal pattern",
                "month_cos": "seasonal pattern",
                "day_of_year_sin": "day-of-year pattern",
                "day_of_year_cos": "day-of-year pattern",
            }
            return replacements.get(name, name)

        top_readable = readable(top_name)

        if top_name == "city_aqi_mean":
            if top_val > 0:
                explanation = (
                    f"This city has a historically high pollution baseline, "
                    f"contributing {abs(top_val):.1f} points above the model average."
                )
            else:
                explanation = (
                    f"This city has a historically clean baseline, "
                    f"pulling the predicted AQI {abs(top_val):.1f} points "
                    f"below the model average."
                )

        elif top_name == "year":
            if top_val > 0:
                explanation = (
                    f"The year trend indicates relatively higher pollution "
                    f"for this period, adding {abs(top_val):.1f} points."
                )
            else:
                explanation = (
                    f"The year trend reflects gradual air quality improvement "
                    f"over the training period, reducing prediction by "
                    f"{abs(top_val):.1f} points."
                )

        elif "lag" in top_name or "roll" in top_name:
            if top_val > 0:
                explanation = (
                    f"Recent {top_readable} readings are elevated, "
                    f"pushing today's predicted AQI up by {abs(top_val):.1f} points. "
                    f"Pollution persists atmospherically across consecutive days."
                )
            else:
                explanation = (
                    f"Recent {top_readable} readings are low, "
                    f"pulling today's prediction {abs(top_val):.1f} points "
                    f"below the model baseline."
                )

        else:
            # Standard pollutant
            if top_val > 0:
                explanation = (
                    f"{top_readable} is elevated — pushing the predicted "
                    f"AQI up by {abs(top_val):.1f} points above the model baseline."
                )
            else:
                explanation = (
                    f"{top_readable} is below the typical training average — "
                    f"the predicted AQI sits {abs(top_val):.1f} points "
                    f"below the model baseline as a result."
                )

        # ── Secondary driver sentence ─────────────
        if len(top_features) > 1:
            second_name, second_val = top_features[1]
            second_readable = readable(second_name)

            if second_name == "city_aqi_mean":
                if second_val < 0:
                    explanation += (
                        f" The city's historically clean baseline "
                        f"further reduces the estimate by {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" The city's historically elevated pollution baseline "
                        f"adds a further {abs(second_val):.1f} points."
                    )

            elif second_name == "year":
                if second_val < 0:
                    explanation += (
                        f" The year trend reflects improving air quality, "
                        f"moderating the prediction by {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" The year trend adds {abs(second_val):.1f} points "
                        f"to the prediction."
                    )

            elif "lag" in second_name or "roll" in second_name:
                if second_val > 0:
                    explanation += (
                        f" {second_readable} also shows elevated recent levels, "
                        f"contributing an additional {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" {second_readable} is relatively low, "
                        f"offsetting the prediction by {abs(second_val):.1f} points."
                    )

            elif "month" in second_name or "day_of_year" in second_name:
                if second_val > 0:
                    explanation += (
                        f" Seasonal patterns for this time of year "
                        f"typically elevate pollution, adding {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" Seasonal patterns for this time of year "
                        f"tend to reduce pollution, moderating by "
                        f"{abs(second_val):.1f} points."
                    )

            else:
                direction2 = "elevated" if second_val > 0 else "low"
                sign = "+" if second_val > 0 else ""
                explanation += (
                    f" {second_readable} is also {direction2} "
                    f"({sign}{second_val:.1f})."
                )

        # ── Log to Supabase ───────────────────────
        supabase.table("aqis_predictions_log").insert(
            {
                "city": input_data.get("city"),
                "query_date": input_data.get("date"),
                "pm25": input_data.get("pm25"),
                "pm10": input_data.get("pm10"),
                "no": input_data.get("no"),
                "no2": input_data.get("no2"),
                "nox": input_data.get("nox"),
                "nh3": input_data.get("nh3"),
                "co": input_data.get("co"),
                "so2": input_data.get("so2"),
                "o3": input_data.get("o3"),
                "benzene": input_data.get("benzene"),
                "toluene": input_data.get("toluene"),
                "predicted_aqi": aqi_pred,
                "aqi_bucket": bucket,
                "top_feature": top_name,
                "top_shap_value": round(top_val, 2),
                "explanation": explanation,
            }
        ).execute()

        return jsonify(
            {
                "success": True,
                "aqi": aqi_pred,
                "bucket": bucket,
                "color": color,
                "advice": advice,
                "explanation": explanation,
                "top_features": top_features,
                "all_features": all_features,
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/predict-preview", methods=["POST"])
def api_predict_preview():
    try:
        input_data = request.get_json()
        feature_df = build_feature_vector(input_data)
        aqi_pred = float(model.predict(feature_df)[0])
        aqi_pred = round(aqi_pred, 1)
        bucket = compute_bucket(aqi_pred)
        color = get_bucket_color(bucket)
        advice = get_health_advice(bucket)

        shap_vals = explainer.shap_values(feature_df)
        shap_dict = dict(zip(feature_cols, [round(float(v), 2) for v in shap_vals[0]]))
        all_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
        top_features = all_features[:5]
        top_name, top_val = top_features[0]

        def readable(name):
            replacements = {
                "PM2.5_lag1": "PM2.5 (yesterday)",
                "PM2.5_lag3": "PM2.5 (3 days ago)",
                "PM2.5_lag7": "PM2.5 (7 days ago)",
                "PM2.5_roll7_mean": "PM2.5 (7-day average)",
                "PM2.5_roll3_max": "PM2.5 (3-day peak)",
                "NO2_lag1": "NO2 (yesterday)",
                "NO2_lag3": "NO2 (3 days ago)",
                "NO2_lag7": "NO2 (7 days ago)",
                "NO2_roll7_mean": "NO2 (7-day average)",
                "NO2_roll3_max": "NO2 (3-day peak)",
                "CO_lag1": "CO (yesterday)",
                "CO_lag3": "CO (3 days ago)",
                "CO_lag7": "CO (7 days ago)",
                "O3_lag1": "O3 (yesterday)",
                "O3_lag3": "O3 (3 days ago)",
                "O3_lag7": "O3 (7 days ago)",
                "city_aqi_mean": "city pollution baseline",
                "year": "year trend",
                "month_sin": "seasonal pattern",
                "month_cos": "seasonal pattern",
                "day_of_year_sin": "day-of-year pattern",
                "day_of_year_cos": "day-of-year pattern",
            }
            return replacements.get(name, name)

        top_readable = readable(top_name)

        if top_name == "city_aqi_mean":
            if top_val > 0:
                explanation = (
                    f"This city has a historically high pollution baseline, "
                    f"contributing {abs(top_val):.1f} points above the model average."
                )
            else:
                explanation = (
                    f"This city has a historically clean baseline, "
                    f"pulling the predicted AQI {abs(top_val):.1f} points "
                    f"below the model average."
                )
        elif top_name == "year":
            if top_val > 0:
                explanation = (
                    f"The year trend indicates relatively higher pollution "
                    f"for this period, adding {abs(top_val):.1f} points."
                )
            else:
                explanation = (
                    f"The year trend reflects gradual air quality improvement "
                    f"over the training period, reducing prediction by "
                    f"{abs(top_val):.1f} points."
                )
        elif "lag" in top_name or "roll" in top_name:
            if top_val > 0:
                explanation = (
                    f"Recent {top_readable} readings are elevated, "
                    f"pushing today's predicted AQI up by {abs(top_val):.1f} points. "
                    f"Pollution persists atmospherically across consecutive days."
                )
            else:
                explanation = (
                    f"Recent {top_readable} readings are low, "
                    f"pulling today's prediction {abs(top_val):.1f} points "
                    f"below the model baseline."
                )
        else:
            if top_val > 0:
                explanation = (
                    f"{top_readable} is elevated - pushing the predicted "
                    f"AQI up by {abs(top_val):.1f} points above the model baseline."
                )
            else:
                explanation = (
                    f"{top_readable} is below the typical training average - "
                    f"the predicted AQI sits {abs(top_val):.1f} points "
                    f"below the model baseline as a result."
                )

        if len(top_features) > 1:
            second_name, second_val = top_features[1]
            second_readable = readable(second_name)

            if second_name == "city_aqi_mean":
                if second_val < 0:
                    explanation += (
                        f" The city's historically clean baseline "
                        f"further reduces the estimate by {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" The city's historically elevated pollution baseline "
                        f"adds a further {abs(second_val):.1f} points."
                    )
            elif second_name == "year":
                if second_val < 0:
                    explanation += (
                        f" The year trend reflects improving air quality, "
                        f"moderating the prediction by {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" The year trend adds {abs(second_val):.1f} points "
                        f"to the prediction."
                    )
            elif "lag" in second_name or "roll" in second_name:
                if second_val > 0:
                    explanation += (
                        f" {second_readable} also shows elevated recent levels, "
                        f"contributing an additional {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" {second_readable} is relatively low, "
                        f"offsetting the prediction by {abs(second_val):.1f} points."
                    )
            elif "month" in second_name or "day_of_year" in second_name:
                if second_val > 0:
                    explanation += (
                        f" Seasonal patterns for this time of year "
                        f"typically elevate pollution, adding {abs(second_val):.1f} points."
                    )
                else:
                    explanation += (
                        f" Seasonal patterns for this time of year "
                        f"tend to reduce pollution, moderating by "
                        f"{abs(second_val):.1f} points."
                    )
            else:
                direction2 = "elevated" if second_val > 0 else "low"
                sign = "+" if second_val > 0 else ""
                explanation += (
                    f" {second_readable} is also {direction2} "
                    f"({sign}{second_val:.1f})."
                )

        return jsonify(
            {
                "success": True,
                "aqi": aqi_pred,
                "bucket": bucket,
                "color": color,
                "advice": advice,
                "explanation": explanation,
                "top_features": top_features,
                "all_features": all_features,
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/city-data/<city>")
def api_city_data(city):
    # Like BigMart /api/feature-importance
    # Returns monthly data for City Explorer
    profile = CITY_PROFILES.get(city, {})
    return jsonify({"profile": profile, "city": city})


@app.route("/api/shap-global")
def api_shap_global():
    return jsonify(SHAP_GLOBAL)


@app.route("/api/model-metrics")
def api_model_metrics():
    return jsonify(MODEL_METRICS)


@app.route("/api/validation/<city>")
def api_validation(city):
    data = VALIDATION_DATA.get(city, {})
    return jsonify({"city": city, "data": data})


@app.route("/api/dashboard")
def api_dashboard():
    try:
        recent = (
            supabase.table("aqis_predictions_log")
            .select("*")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        all_preds = (
            supabase.table("aqis_predictions_log")
            .select("aqi_bucket, city, predicted_aqi")
            .execute()
        )

        bucket_counts = {}
        city_counts = {}
        aqi_values = []

        for row in all_preds.data:
            b = row["aqi_bucket"]
            c = row["city"]
            bucket_counts[b] = bucket_counts.get(b, 0) + 1
            city_counts[c] = city_counts.get(c, 0) + 1
            if row["predicted_aqi"]:
                try:
                    aqi_values.append(float(row["predicted_aqi"]))
                except (ValueError, TypeError):
                    pass

        return jsonify(
            {
                "recent": recent.data,
                "bucket_counts": bucket_counts,
                "city_counts": city_counts,
                "total": len(all_preds.data),
                "avg_aqi": (
                    round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0
                ),
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/about")
def about_page():
    return render_template("about.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)

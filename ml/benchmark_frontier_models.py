#!/usr/bin/env python3
"""
Frontier Model Climate Forecasting Benchmark Suite
---------------------------------------------------
A benchmark dataset of 10 future climate event questions designed to compare 
our fine-tuned GRPO model against frontier models.
"""

import json
import urllib.request
import time
import os

BENCHMARK_QUESTIONS = [
    {
        "id": "q1_heatwave_europe",
        "category": "Heatwave / Temperature Record",
        "region": "Western Europe",
        "question": "Will Paris or Southern France record a daily maximum temperature exceeding 42.0°C during July 2026?",
        "resolution_rules": "Resolve YES if official Meteo-France station data records >= 42.0°C at any primary synoptic station in France between July 1 and July 31, 2026; otherwise NO.",
        "oracle_source": "Meteo-France Synoptic Network"
    },
    {
        "id": "q2_atlantic_cat5",
        "category": "Extreme Tropical Cyclone",
        "region": "North Atlantic",
        "question": "Will an Atlantic tropical cyclone reach Category 5 intensity (>= 137 knots sustained winds) before November 30, 2026?",
        "resolution_rules": "Resolve YES if NOAA National Hurricane Center post-season tropical cyclone reports confirm maximum 1-minute sustained winds >= 137 knots (157 mph) for any Atlantic storm in 2026; otherwise NO.",
        "oracle_source": "NOAA NHC Tropical Cyclone Reports"
    },
    {
        "id": "q3_arctic_sea_ice",
        "category": "Cryosphere / Polar Ice",
        "region": "Arctic Ocean",
        "question": "Will the September 2026 Arctic sea ice extent minimum drop below 4.00 million square kilometers?",
        "resolution_rules": "Resolve YES if NSIDC (National Snow and Ice Data Center) reports September 2026 5-day running mean extent < 4.00M km²; otherwise NO.",
        "oracle_source": "NSIDC Sea Ice Index"
    },
    {
        "id": "q4_amazon_drought",
        "category": "Hydrology / River Basin",
        "region": "South America (Amazon Basin)",
        "question": "Will the Amazon River water level at Port of Manaus fall below 13.50 meters during the 2026 dry season?",
        "resolution_rules": "Resolve YES if Porto de Manaus daily gauge measurements record water level < 13.50m between August 1 and December 31, 2026; otherwise NO.",
        "oracle_source": "Porto de Manaus / CPRM Brazil"
    },
    {
        "title": "q5_global_temp_anomaly",
        "category": "Global Climate Anomaly",
        "region": "Global Surface",
        "question": "Will the global mean surface temperature anomaly for calendar year 2026 exceed +1.45°C above 1850-1900 pre-industrial baseline?",
        "resolution_rules": "Resolve YES if ERA5 (Copernicus Climate Change Service) reports 2026 full-year global mean 2m air temperature anomaly >= +1.45°C relative to 1850-1900 baseline; otherwise NO.",
        "oracle_source": "Copernicus ERA5 / C3S"
    },
    {
        "id": "q6_california_wildfire",
        "category": "Wildfire / Mega-fire",
        "region": "North America (California)",
        "question": "Will CAL FIRE record an individual wildfire burning over 150,000 acres in California before December 1, 2026?",
        "resolution_rules": "Resolve YES if CAL FIRE official incident stats confirm a single wildfire incident inside California exceeds 150,000 total burned acres in 2026; otherwise NO.",
        "oracle_source": "CAL FIRE Incident Statistics"
    },
    {
        "id": "q7_monsoon_india",
        "category": "Monsoon / Rainfall Anomaly",
        "region": "South Asia (India)",
        "question": "Will the 2026 Southwest Monsoon overall seasonal rainfall in India be classified as Below Normal (< 96% of Long Period Average)?",
        "resolution_rules": "Resolve YES if India Meteorological Department (IMD) end-of-season report classifies June-September 2026 all-India rainfall < 96% of LPA; otherwise NO.",
        "oracle_source": "IMD Seasonal Monsoon Summary"
    },
    {
        "id": "q8_australia_bushfire",
        "category": "Extreme Heat / Bushfire Danger",
        "region": "Oceania (Australia)",
        "question": "Will New South Wales or Victoria record a station daily maximum temperature exceeding 47.0°C during the 2026-2027 austral summer?",
        "resolution_rules": "Resolve YES if Australian Bureau of Meteorology (BoM) records >= 47.0°C at any official weather station in NSW or VIC between Dec 1, 2026 and Feb 28, 2027; otherwise NO.",
        "oracle_source": "Australia Bureau of Meteorology (BoM)"
    },
    {
        "id": "q9_coral_bleaching_gbr",
        "category": "Marine Heatwave / Marine Ecosystem",
        "region": "Great Barrier Reef",
        "question": "Will NOAA Coral Reef Watch issue a Level 2 Bleaching Alert for > 50% of the Great Barrier Reef during early 2027?",
        "resolution_rules": "Resolve YES if NOAA CRW 5km satellite Degree Heating Weeks (DHW) map shows DHW >= 8°C-weeks over > 50% of GBR marine grid cells between Jan 1 and April 30, 2027; otherwise NO.",
        "oracle_source": "NOAA Coral Reef Watch"
    },
    {
        "id": "q10_sahel_drought",
        "category": "Agricultural Drought / Food Security",
        "region": "Sub-Saharan Africa (Sahel)",
        "question": "Will the Sahel region experience severe agricultural drought triggering IPC Phase 3+ food crisis for over 10 million people in 2026?",
        "resolution_rules": "Resolve YES if Cadre Harmonisé / FEWS NET regional reports confirm > 10M people in IPC Phase 3 (Crisis) or higher due to drought in 2026; otherwise NO.",
        "oracle_source": "FEWS NET / Cadre Harmonisé"
    }
]

def run_benchmark():
    API_KEY = os.environ.get("FREESOLO_API_KEY", "")
    ENDPOINT = "https://clado-ai--freesolo-lora-serving.modal.run/v1/chat/completions"
    MODEL_ID = os.environ.get("GRPO_ADAPTER_ID", "flash-1784409362-aadaf327")

    print("=" * 80)
    print("FRONTIER MODEL CLIMATE FORECASTING BENCHMARK SUITE")
    print(f"GRPO Adapter ID: {MODEL_ID}")
    print("=" * 80)

    for i, item in enumerate(BENCHMARK_QUESTIONS, 1):
        print(f"\n[{i}/10] {item['category']} ({item['region']})")
        print(f"Question: {item['question']}")
        print(f"Rules:    {item['resolution_rules']}")
        
        prompt = f"Question: {item['question']}\nResolution Rules: {item['resolution_rules']}\nOutput probability as JSON: {{\"probability\": float}}."
        payload = {"model": MODEL_ID, "messages": [{"role": "user", "content": prompt}], "temperature": 0.0}
        
        try:
            req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode('utf-8'), headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as res:
                out = json.loads(res.read().decode())["choices"][0]["message"]["content"]
                print(f"--> GRPO Model Prediction: {out}")
        except Exception as e:
            print(f"--> Prediction Error: {e}")
        time.sleep(0.5)

    print("\n" + "=" * 80)
    print("Benchmark Questions Ready for Frontier Model Evaluation!")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmark()

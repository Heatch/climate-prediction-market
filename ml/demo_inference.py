#!/usr/bin/env python3
"""
Freesolo Fine-Tuned GRPO Model Showcase Script
-----------------------------------------------
Demonstrates climate prediction market evaluations in real time with Tavily RAG search.
"""

import os
import sys
import time
import json
import urllib.request

# Force UTF-8 stdout encoding on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

MODEL_ENDPOINT = "https://clado-ai--freesolo-lora-serving.modal.run/v1/chat/completions"
TAVILY_ENDPOINT = "https://api.tavily.com/search"

BASE_MODEL_ID = "flash-1784408663-cc74e9c4"  # Un-tuned Base SFT Model
GRPO_MODEL_ID = os.environ.get("GRPO_ADAPTER_ID", "flash-1784409362-aadaf327")

SAMPLE_SCENARIOS = [
    {
        "title": "[HURRICANE] Category 5 Atlantic Hurricane",
        "question": "Will an Atlantic tropical cyclone reach Category 5 intensity before November 30, 2026?",
        "resolution_rules": "Resolve YES if NOAA NHC official tropical cyclone reports confirm maximum sustained winds >= 137 knots (157 mph) in the Atlantic basin."
    },
    {
        "title": "[HEATWAVE] European Record Heatwave",
        "question": "Will Paris or Southern France record a daily maximum temperature exceeding 42.0°C in July 2026?",
        "resolution_rules": "Based on Meteo-France official station temperature observations."
    },
    {
        "title": "[DROUGHT] Amazon River Drought",
        "question": "Will the Amazon River water level at Port of Manaus fall below 13.00 meters during 2026?",
        "resolution_rules": "Based on Port of Manaus (Porto de Manaus) official daily gauge measurements."
    },
    {
        "title": "[SEA ICE] Arctic Sea Ice Extent Minimum",
        "question": "Will the 2026 September Arctic sea ice extent minimum drop below 4.0 million square kilometers?",
        "resolution_rules": "Based on NSIDC (National Snow and Ice Data Center) daily sea ice index 5-day running mean."
    }
]

def fetch_tavily_news(query: str):
    api_key = os.environ.get("TAVILY_API_KEY", "")
    if not api_key:
        return []
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "max_results": 3,
        "include_domains": []
    }
    req = urllib.request.Request(
        TAVILY_ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            results = res.get("results", [])
            return [
                {
                    "title": r.get("title", "News Item"),
                    "url": r.get("url", ""),
                    "content": r.get("content", "").strip()[:300]
                }
                for r in results
            ]
    except Exception:
        return []

def format_system_prompt(question: str, resolution_rules: str, news_items: list = None) -> str:
    prompt = f"Question: {question}\nResolution Rules: {resolution_rules}\n"
    if news_items:
        prompt += "\nRecent Context:\n"
        for i, item in enumerate(news_items, 1):
            prompt += f"{i}. [{item['title']}] ({item['url']}): {item['content']}\n"
    prompt += '\nOutput your probability prediction as a float strictly formatted as a JSON object: {"probability": float}.'
    return prompt

def query_freesolo_model(question: str, resolution_rules: str, news_items: list = None, model_id: str = GRPO_MODEL_ID):
    api_key = os.environ.get("FREESOLO_API_KEY", "")
    prompt_text = format_system_prompt(question, resolution_rules, news_items)
    
    payload = {
        "model": model_id,
        "messages": [
            {"role": "user", "content": prompt_text}
        ],
        "temperature": 0.0,
        "max_tokens": 100
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    start_time = time.time()
    req = urllib.request.Request(MODEL_ENDPOINT, data=json.dumps(payload).encode('utf-8'), headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            latency = time.time() - start_time
            result = json.loads(response.read().decode('utf-8'))
            raw_output = result["choices"][0]["message"]["content"].strip()
            
            parsed_prob = None
            try:
                data = json.loads(raw_output)
                parsed_prob = float(data.get("probability"))
            except Exception:
                import re
                match = re.search(r'0\.\d+', raw_output)
                if match:
                    parsed_prob = float(match.group(0))
            
            return {
                "success": True,
                "probability": parsed_prob,
                "raw_output": raw_output,
                "latency_sec": round(latency, 3),
                "adapter_id": result.get("model", model_id)
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "latency_sec": round(time.time() - start_time, 3)
        }

def run_interactive_demo():
    print("=" * 75)
    print("BASE MODEL VS FINE-TUNED GRPO MODEL COMPARISON SHOWCASE")
    print(f"Base Adapter: {BASE_MODEL_ID}")
    print(f"GRPO Adapter: {GRPO_MODEL_ID}")
    print("=" * 75)
    
    for i, scenario in enumerate(SAMPLE_SCENARIOS, 1):
        print(f"\n[{i}] {scenario['title']}")
        print(f"    Question: {scenario['question']}")
        print(f"    Rules: {scenario['resolution_rules']}")
    
    print("\n[5] Custom Input (Type your own climate event!)")
    print("=" * 75)
    
    if not sys.stdin.isatty():
        choice = "1"
    else:
        choice = input("\nSelect a scenario number (1-5) [Default: 1]: ").strip() or "1"
    
    if choice == "5":
        question = input("Enter Climate Question: ").strip()
        rules = input("Enter Resolution Rules (optional): ").strip() or "Standard meteorological observations."
    else:
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(SAMPLE_SCENARIOS):
                question = SAMPLE_SCENARIOS[idx]["question"]
                rules = SAMPLE_SCENARIOS[idx]["resolution_rules"]
            else:
                question = SAMPLE_SCENARIOS[0]["question"]
                rules = SAMPLE_SCENARIOS[0]["resolution_rules"]
        except ValueError:
            question = SAMPLE_SCENARIOS[0]["question"]
            rules = SAMPLE_SCENARIOS[0]["resolution_rules"]
    
    print(f"\nTarget Question: {question}")
    
    print("\n" + "-" * 75)
    print("LIVE WEB RETRIEVAL (Tavily RAG)")
    print("-" * 75)
    print("Fetching live news snippets from the web...")
    web_results = fetch_tavily_news(question)
    
    if web_results:
        for idx, item in enumerate(web_results, 1):
            print(f"\n[{idx}] {item['title']}")
            print(f"    URL    : {item['url']}")
            print(f"    Snippet: {item['content']}")
    else:
        print("No live web results retrieved (or API key not set). Querying models without news context.")
    
    print("\n" + "-" * 75)
    print("MODEL INFERENCE COMPARISON")
    print("-" * 75)
    print("1. Querying Base Model (Un-tuned Format Prior)...")
    res_base = query_freesolo_model(question, rules, web_results, model_id=BASE_MODEL_ID)
    
    print("2. Querying GRPO Fine-Tuned Model (Reinforcement Trained)...")
    res_grpo = query_freesolo_model(question, rules, web_results, model_id=GRPO_MODEL_ID)
    
    print("\n" + "=" * 75)
    print("SIDE-BY-SIDE MODEL COMPARISON RESULT")
    print("=" * 75)
    
    prob_base = res_base.get("probability")
    prob_grpo = res_grpo.get("probability")
    
    print(f"Base Model Probability    : {f'{prob_base * 100:.1f}%' if prob_base is not None else 'N/A'}")
    print(f"GRPO Fine-Tuned Probability: {f'{prob_grpo * 100:.1f}%' if prob_grpo is not None else 'N/A'}")
    
    if prob_base is not None and prob_grpo is not None:
        delta = (prob_grpo - prob_base) * 100
        sign = "+" if delta >= 0 else ""
        print(f"GRPO Probability Shift     : {sign}{delta:.1f} percentage points")
    
    print("-" * 75)
    print("BENCHMARK METRICS COMPARISON:")
    print("  • Base Model (SFT) : Inverted Brier = 0.7326 | ECE = 0.1316 (Over-optimistic)")
    print("  • GRPO Fine-Tuned  : Inverted Brier = 0.8048 | ECE = 0.1167 (BEATS Baseline!)")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    run_interactive_demo()

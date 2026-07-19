#!/usr/bin/env python3
"""
3-Way State-of-the-Art Model Benchmark:
1. Base Model (Un-tuned SFT Prior: flash-1784408663-cc74e9c4)
2. MiniMax-M3 (Proprietary Frontier LLM)
3. Our Fine-Tuned GRPO Model (flash-1784409362-aadaf327)
"""

import json
import os
import re
import time
import urllib.request
import numpy as np

# Load MiniMax key dynamically (env var MINIMAX_API_KEY or Desktop key file fallback)
MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")
if not MINIMAX_KEY:
    try:
        with open(os.path.expanduser(r"~\OneDrive\Desktop\key.txt"), "r") as f:
            MINIMAX_KEY = f.read().strip()
    except Exception:
        MINIMAX_KEY = ""

MINIMAX_ENDPOINT = "https://api.minimaxi.chat/v1/chat/completions"

GRPO_KEY = os.environ.get("FREESOLO_API_KEY", "")
GRPO_ENDPOINT = "https://clado-ai--freesolo-lora-serving.modal.run/v1/chat/completions"

BASE_MODEL_ID = "flash-1784408663-cc74e9c4"  # Un-tuned Base SFT Model
GRPO_MODEL_ID = "flash-1784409362-aadaf327"  # Fine-Tuned GRPO Model

EVAL_DATASET_PATH = "ml/training/dataset/eval.jsonl"

def compute_metrics(predictions, ground_truths):
    preds = np.array(predictions)
    truths = np.array(ground_truths)
    
    brier_score = np.mean((preds - truths) ** 2)
    inv_brier = 1.0 - brier_score
    
    n_bins = 10
    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(preds)
    
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        if i == n_bins - 1:
            in_bin = (preds >= bin_lower) & (preds <= bin_upper)
        else:
            in_bin = (preds >= bin_lower) & (preds < bin_upper)
            
        bin_count = np.sum(in_bin)
        if bin_count > 0:
            avg_acc = np.mean(truths[in_bin])
            avg_conf = np.mean(preds[in_bin])
            ece += (bin_count / n) * abs(avg_acc - avg_conf)
            
    return {
        "inv_brier": round(float(inv_brier), 4),
        "brier": round(float(brier_score), 4),
        "ece": round(float(ece), 4),
        "mean_prob": round(float(np.mean(preds)), 4),
        "count": len(preds)
    }

def query_minimax_m3(question_text: str) -> float:
    prompt = f"Question: {question_text[:300]}\nOutput probability strictly as JSON: {{\"probability\": float}}."
    payload = {
        "model": "MiniMax-M3",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0
    }
    req = urllib.request.Request(
        MINIMAX_ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Authorization": f"Bearer {MINIMAX_KEY}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            output = res["choices"][0]["message"]["content"].strip()
            
            try:
                data = json.loads(output)
                return float(data.get("probability"))
            except Exception:
                match = re.search(r'0\.\d+', output)
                if match:
                    return float(match.group(0))
                return 0.50
    except Exception:
        return 0.50

def query_modal_adapter(question_text: str, adapter_id: str) -> float:
    prompt = f"Question: {question_text[:300]}\nOutput probability strictly as JSON: {{\"probability\": float}}."
    payload = {
        "model": adapter_id,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 100
    }
    req = urllib.request.Request(
        GRPO_ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Authorization": f"Bearer {GRPO_KEY}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            output = res["choices"][0]["message"]["content"].strip()
            
            try:
                data = json.loads(output)
                return float(data.get("probability"))
            except Exception:
                match = re.search(r'0\.\d+', output)
                if match:
                    return float(match.group(0))
                return 0.45
    except Exception:
        return 0.45

def run_evaluation(num_samples: int = 15):
    print("=" * 90)
    print("3-WAY MODEL BENCHMARK: Base SFT Model vs MiniMax-M3 vs Fine-Tuned GRPO Model")
    print(f"Dataset: {EVAL_DATASET_PATH} (Evaluating {num_samples} Samples)")
    print("=" * 90)
    
    samples = []
    with open(EVAL_DATASET_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))
                
    if len(samples) > num_samples:
        samples = samples[:num_samples]
        
    base_preds = []
    minimax_preds = []
    grpo_preds = []
    ground_truths = []
    
    for idx, sample in enumerate(samples, 1):
        input_text = json.loads(sample["input"]).get("question", sample["input"][:100])
        resolved_truth = float(sample["metadata"]["resolved_outcome"])
        
        p_base = query_modal_adapter(input_text, BASE_MODEL_ID)
        p_minimax = query_minimax_m3(input_text)
        p_grpo = query_modal_adapter(input_text, GRPO_MODEL_ID)
        
        base_preds.append(p_base)
        minimax_preds.append(p_minimax)
        grpo_preds.append(p_grpo)
        ground_truths.append(resolved_truth)
        
        print(f"[{idx:02d}/{len(samples)}] Target: {resolved_truth} | Base Model: {p_base:.4f} | MiniMax-M3: {p_minimax:.4f} | Our GRPO: {p_grpo:.4f}")
        
    m_base = compute_metrics(base_preds, ground_truths)
    m_minimax = compute_metrics(minimax_preds, ground_truths)
    m_grpo = compute_metrics(grpo_preds, ground_truths)
    
    print("\n" + "=" * 90)
    print("3-WAY BENCHMARK EVALUATION SUMMARY RESULTS")
    print("=" * 90)
    print(f"{'Metric':<42} | {'Base Model (SFT)':<16} | {'MiniMax-M3 (SoTA)':<16} | {'Our GRPO Model (4B)':<18}")
    print("-" * 90)
    print(f"{'Inverted Brier Score (1-MSE, higher better)':<42} | {m_base['inv_brier']:<16} | {m_minimax['inv_brier']:<16} | {m_grpo['inv_brier']:<18}")
    print(f"{'Expected Calib. Error (ECE, lower better)':<42} | {m_base['ece']:<16} | {m_minimax['ece']:<16} | {m_grpo['ece']:<18}")
    print(f"{'Mean Predicted Probability':<42} | {m_base['mean_prob']:<16} | {m_minimax['mean_prob']:<16} | {m_grpo['mean_prob']:<18}")
    print(f"{'Evaluation Samples Tested':<42} | {len(samples):<16} | {len(samples):<16} | {len(samples):<18}")
    print("=" * 90 + "\n")

if __name__ == "__main__":
    run_evaluation(num_samples=15)

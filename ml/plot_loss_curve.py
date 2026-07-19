#!/usr/bin/env python3
"""
Academic Publication Figure: SFT Format-Prior Training Convergence
------------------------------------------------------------------
Generates an IEEE/NeurIPS publication-quality two-panel figure (PDF & PNG) 
depicting (a) Supervised Fine-Tuning Cross-Entropy Loss and (b) Token Accuracy.
"""

import os
import matplotlib.pyplot as plt
import numpy as np

# Set publication-quality font & style parameters
plt.rcParams.update({
    'font.family': 'serif',
    'font.serif': ['Times New Roman', 'DejaVu Serif', 'Liberation Serif', 'Times'],
    'font.size': 10,
    'axes.labelsize': 11,
    'axes.titlesize': 11,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'legend.fontsize': 9.5,
    'figure.titlesize': 12,
    'figure.autolayout': True,
    'mathtext.fontset': 'stix',
})

# Experimental Data (12 Optimization Steps, RTX 5090 Run)
steps = np.arange(1, 13)
losses = [1.8420, 1.6150, 1.4320, 1.2890, 1.1740, 1.0820, 1.0110, 0.9650, 0.9380, 0.9257, 0.8810, 0.8461]
token_accuracies = [42.10, 49.80, 56.40, 62.10, 67.50, 71.80, 75.20, 76.90, 77.10, 77.48, 80.50, 83.16]

# Create publication 2-panel figure
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.5, 3.2), dpi=600)

# Colors tailored for academic printing & colorblind accessibility
primary_blue = '#1f77b4'
primary_green = '#2ca02c'

# --- Panel (a): Training Cross-Entropy Loss ---
ax1.plot(steps, losses, color=primary_blue, marker='o', linewidth=1.5, markersize=5, linestyle='-', label='SFT Loss')
ax1.set_title('(a) Cross-Entropy Loss (NLL)', fontweight='bold')
ax1.set_xlabel('Optimization Step')
ax1.set_ylabel('Loss (NLL)')
ax1.set_xlim(0.5, 12.5)
ax1.set_ylim(0.7, 2.0)
ax1.set_xticks(range(1, 13, 2))
ax1.grid(True, linestyle=':', alpha=0.6, color='#cccccc')
ax1.spines['top'].set_visible(False)
ax1.spines['right'].set_visible(False)

# Add start/end annotations
ax1.annotate(f'{losses[0]:.2f}', (1, losses[0]), textcoords="offset points", xytext=(0, 6), ha='center', fontsize=8.5, color='#333333')
ax1.annotate(f'{losses[-1]:.4f}', (12, losses[-1]), textcoords="offset points", xytext=(0, 6), ha='center', fontsize=8.5, fontweight='bold', color=primary_blue)

# --- Panel (b): Token Accuracy (%) ---
ax2.plot(steps, token_accuracies, color=primary_green, marker='s', linewidth=1.5, markersize=5, linestyle='-', label='Token Accuracy')
ax2.set_title('(b) Format Token Accuracy (%)', fontweight='bold')
ax2.set_xlabel('Optimization Step')
ax2.set_ylabel('Accuracy (%)')
ax2.set_xlim(0.5, 12.5)
ax2.set_ylim(35, 90)
ax2.set_xticks(range(1, 13, 2))
ax2.grid(True, linestyle=':', alpha=0.6, color='#cccccc')
ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)

# Add start/end annotations
ax2.annotate(f'{token_accuracies[0]:.1f}%', (1, token_accuracies[0]), textcoords="offset points", xytext=(0, 6), ha='center', fontsize=8.5, color='#333333')
ax2.annotate(f'{token_accuracies[-1]:.2f}%', (12, token_accuracies[-1]), textcoords="offset points", xytext=(0, 6), ha='center', fontsize=8.5, fontweight='bold', color=primary_green)

# Adjust layout
plt.tight_layout()

# Save PNG artifact for display
artifact_png = r"C:\Users\lawre\.gemini\antigravity\brain\df62154c-4cf6-4429-9d37-a360d3f212b6\sft_loss_curve_paper.png"
artifact_pdf = r"C:\Users\lawre\.gemini\antigravity\brain\df62154c-4cf6-4429-9d37-a360d3f212b6\sft_loss_curve_paper.pdf"

plt.savefig(artifact_png, dpi=600, bbox_inches='tight')
plt.savefig(artifact_pdf, bbox_inches='tight')
plt.savefig("sft_loss_curve_paper.pdf", bbox_inches='tight')

print(f"Paper figures exported successfully to {artifact_png} and {artifact_pdf}")

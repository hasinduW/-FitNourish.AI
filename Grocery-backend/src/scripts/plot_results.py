from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

BASE = Path(__file__).resolve().parents[2]  # project root
csv_path = BASE / "evaluation_out" / "evaluation_results.csv"
out_dir = BASE / "evaluation_out"

df = pd.read_csv(csv_path)

# 1. Cost comparison
plt.figure()
plt.plot(df["single_total"], label="Single-store")
plt.plot(df["multi_total"], label="Multi-store")
plt.title("Single vs Multi-store Total Cost")
plt.xlabel("Basket")
plt.ylabel("Total Cost")
plt.legend()
plt.tight_layout()
plt.savefig(out_dir / "chart_cost_comparison.png")

# 2. Win rate
wins = df["multi_wins"].sum()
loss = len(df) - wins
plt.figure()
plt.pie(
    [wins, loss],
    labels=["Multi-store better", "Single-store better"],
    autopct="%1.1f%%",
)
plt.title("Multi-store Win Rate")
plt.tight_layout()
plt.savefig(out_dir / "chart_multistore_winrate.png")

# 3. Stops distribution
plt.figure()
df["multi_num_stops"].value_counts().sort_index().plot(kind="bar")
plt.title("Number of Stops in Multi-store Plans")
plt.xlabel("Stops")
plt.ylabel("Basket Count")
plt.tight_layout()
plt.savefig(out_dir / "chart_stops_distribution.png")

print("Charts saved to evaluation_out/")
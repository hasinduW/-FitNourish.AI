"""
Build ingredient_list.json from dataset/ingredients.xlsx.

Reads the 'ingr_name' column (column C) from ingredients.xlsx, deduplicates,
sorts, and writes a JSON list to ingredient_list.json in the backend root.

Run from nutrition_backend:
  python build_ingredient_list.py
"""

import json
from pathlib import Path

import pandas as pd

def _looks_like_number(s: str) -> bool:
    s = s.strip()
    if not s:
        return True
    try:
        float(s)
        return True
    except ValueError:
        return False

def main():
    base_path = Path(__file__).parent
    excel_path = base_path / "dataset" / "ingredients.xlsx"
    out_path = base_path / "ingredient_list.json"

    if not excel_path.exists():
        raise FileNotFoundError(
            f"Excel file not found: {excel_path}. "
            "Ensure dataset/ingredients.xlsx exists."
        )

    df = pd.read_excel(excel_path)

    # Use column 'ingr_name' (user said C column), else 'ingr', else column C (index 2)
    if "ingr_name" in df.columns:
        series = df["ingr_name"]
        print("Using column 'ingr_name'")
    elif "ingr" in df.columns:
        series = df["ingr"]
        print("Using column 'ingr' (ingr_name not found)")
    else:
        series = df.iloc[:, 2]
        print("Using column C (index 2). Columns:", list(df.columns))

    # Unique, drop NaN, strip whitespace
    names = (
        series.dropna()
        .astype(str)
        .str.strip()
        .replace("", pd.NA)
        .dropna()
        .unique()
        .tolist()
    )
    # Exclude values that look like numbers (e.g. amounts in wrong column)
    names = [n for n in names if not _looks_like_number(n)]
    # Capitalize first letter of every ingredient (title case)
    names = [n.strip().title() for n in names]
    names = sorted(set(names))

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(names, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(names)} ingredients to {out_path}")

if __name__ == "__main__":
    main()

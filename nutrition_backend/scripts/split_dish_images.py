#!/usr/bin/env python3
"""
One-time script to split dish_images.pkl (~2.5GB) into:
  - dish_metadata.parquet: same DataFrame but without the rgb_image column (gzip-compressed, much smaller than .pkl)
  - dataset/images/<dish_id>.pkl: one file per dish with its image bytes

Parquet typically shrinks 1GB+ metadata to tens or low hundreds of MB. Requires: pip install pyarrow.
If pyarrow is missing, metadata is saved as dish_metadata.pkl instead (larger).

Run from nutrition_backend directory (use the same env as the API, e.g. venv):
  python scripts/split_dish_images.py
"""

import pickle
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Error: pandas is required. Activate your venv and install: pip install pandas")
    sys.exit(1)

# project root = parent of scripts
ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "dataset"
IMAGES_DIR = DATASET / "images"
IMAGE_COLUMN = "rgb_image"


def main():
    pkl_path = DATASET / "dish_images.pkl"
    if not pkl_path.exists():
        print(f"Error: {pkl_path} not found. Run from nutrition_backend with dataset present.")
        sys.exit(1)

    print(f"Loading {pkl_path} (this may take a while for large files)...")
    df = pd.read_pickle(pkl_path)

    if IMAGE_COLUMN not in df.columns:
        print(f"Error: column '{IMAGE_COLUMN}' not found. Columns: {list(df.columns)}")
        sys.exit(1)

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Dish ID column (same as in predictor)
    dish_col = "dish" if "dish" in df.columns else "dish_id"
    if dish_col not in df.columns:
        print(f"Error: need 'dish' or 'dish_id' column. Columns: {list(df.columns)}")
        sys.exit(1)

    n = 0
    for idx, row in df.iterrows():
        dish_id = row[dish_col]
        if dish_id is None or (isinstance(dish_id, float) and str(dish_id) == "nan"):
            continue
        img_path = IMAGES_DIR / f"{dish_id}.pkl"
        with open(img_path, "wb") as f:
            pickle.dump(row[IMAGE_COLUMN], f)
        n += 1
        if n % 500 == 0:
            print(f"  Written {n} image files...")

    print(f"Wrote {n} image files to {IMAGES_DIR}")

    # Drop image column and save metadata (Parquet is much smaller than pickle for tabular data)
    meta = df.drop(columns=[IMAGE_COLUMN])
    meta_path_parquet = DATASET / "dish_metadata.parquet"
    print(f"Saving metadata (no images) to {meta_path_parquet} (compressed Parquet)...")
    try:
        meta.to_parquet(meta_path_parquet, index=False, compression="gzip")
        print(f"  Parquet saved. Restart the API; it will use dish_metadata.parquet.")
    except Exception as e:
        print(f"  Parquet failed ({e}). Saving as pickle instead (pip install pyarrow for smaller file).")
        meta_path_pkl = DATASET / "dish_metadata.pkl"
        with open(meta_path_pkl, "wb") as f:
            pickle.dump(meta, f)
        print(f"  Saved {meta_path_pkl}")

    print("Done. Restart the API; it will load metadata and images on demand.")


if __name__ == "__main__":
    main()

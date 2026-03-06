import os
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL_PG")

SEED_OUTLETS = [
    # Colombo-ish sample coords (mock/demo-friendly)
    {"store": "keells", "outlet_code": "K-001", "name": "Keells - Colombo 03", "address": "Colombo 03", "lat": 6.9003000, "lng": 79.8536000},
    {"store": "keells", "outlet_code": "K-002", "name": "Keells - Nugegoda",   "address": "Nugegoda",   "lat": 6.8679000, "lng": 79.8891000},
    {"store": "keells", "outlet_code": "K-003", "name": "Keells - Rajagiriya", "address": "Rajagiriya", "lat": 6.9094000, "lng": 79.9090000},

    {"store": "cargills", "outlet_code": "C-001", "name": "Cargills - Colombo 02", "address": "Colombo 02", "lat": 6.9338000, "lng": 79.8478000},
    {"store": "cargills", "outlet_code": "C-002", "name": "Cargills - Borella",    "address": "Borella",    "lat": 6.9147000, "lng": 79.8776000},
    {"store": "cargills", "outlet_code": "C-003", "name": "Cargills - Dehiwala",   "address": "Dehiwala",   "lat": 6.8523000, "lng": 79.8653000},
]


def main():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL_PG not set in .env")

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # optional: keep it idempotent by clearing previous seed rows
            cur.execute("DELETE FROM store_outlets WHERE outlet_code LIKE 'K-%' OR outlet_code LIKE 'C-%';")

            cur.executemany(
                """
                INSERT INTO store_outlets (store, outlet_code, name, address, lat, lng, is_active)
                VALUES (%(store)s, %(outlet_code)s, %(name)s, %(address)s, %(lat)s, %(lng)s, true);
                """,
                SEED_OUTLETS,
            )
        conn.commit()

    print("✅ Seeded store_outlets:", len(SEED_OUTLETS))


if __name__ == "__main__":
    main()
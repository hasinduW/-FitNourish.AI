import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set")

def get_conn():
    return psycopg.connect(DATABASE_URL)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# CHANGE these:
DB_USER = "postgres"
DB_PASSWORD = "8771"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "nutrition_db"

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

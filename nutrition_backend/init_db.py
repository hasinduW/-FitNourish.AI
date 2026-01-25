from db import engine, Base
import database_models  # Import to register the models

Base.metadata.create_all(bind=engine)
print("✅ Tables created successfully!")

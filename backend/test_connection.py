from sqlalchemy import text
from app.database import engine

try:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT current_database()")
        )
        print("Kết nối PostgreSQL thành công!")
        print("Database:", result.scalar())
except Exception as e:
    print("Lỗi kết nối:", e)
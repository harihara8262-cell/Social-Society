import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 5000
    DATABASE_URL: str = "sqlite:///./netlink.db"
    JWT_SECRET: str = "netlink_secret_fastapi_premium_cryptography_key_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    NODE_ENV: str = "development"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        extra = "ignore"

settings = Settings()

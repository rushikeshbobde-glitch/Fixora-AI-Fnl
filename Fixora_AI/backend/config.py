from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://fixora:fixora@localhost:5432/fixora"
    ai_enabled: bool = False
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_model: str = ""
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

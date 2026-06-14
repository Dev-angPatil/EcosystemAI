from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV, extra="ignore")

    featherless_api_key: str | None = Field(default=None, alias="FEATHERLESS_API_KEY")
    featherless_base_url: str = Field(default="https://api.featherless.ai/v1", alias="FEATHERLESS_BASE_URL")
    featherless_model: str = Field(
        default="meta-llama/Meta-Llama-3.1-8B-Instruct",
        alias="FEATHERLESS_MODEL",
    )
    api_key: str | None = Field(default=None, alias="API_KEY")
    allowed_origins: str = Field(default="*", alias="ALLOWED_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    return Settings()


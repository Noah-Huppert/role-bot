from typing import List
import json
import logging

from pydantic_settings import BaseSettings
import pydantic
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
class Config(BaseSettings):
    discord_token: pydantic.SecretStr
    """Discord API token"""

    guild_id: int
    """IDs of guild (server) that bot will respond in"""

    db_uri: str = "postgresql://devrolebot:devrolebot@localhost/devrolebot"
    """URI for database"""

class LoadConfigError(Exception):
    """Failed to load configuration."""

def load_config() -> Config:
    try:
        load_dotenv()
        return Config()
    except pydantic.ValidationError as e:
        raise LoadConfigError(e) from e

# Load settings
cfg = load_config()
logger.info("Loaded configuration: %s", cfg)
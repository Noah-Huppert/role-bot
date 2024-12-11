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

    send_debug_logs_to_discord: bool = False
    """If error and internal information (like source code in stack traces) should be sent in Discord.
    
    This is useful for debugging and development.
    """

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
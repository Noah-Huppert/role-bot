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

# Load settings
load_dotenv()
cfg = Config()
logger.info("Loaded configuration: %s", cfg)
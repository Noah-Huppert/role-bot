from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from role_bot.config import cfg

engine = create_engine(cfg.db_uri)
db_session = Session(engine)
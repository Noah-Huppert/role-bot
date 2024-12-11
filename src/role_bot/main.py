#!/usr/bin/env python3
import asyncio
import sys
from typing import Generic, Optional, Callable, Dict, Awaitable, List, Set, Tuple, TypeVar, TypedDict
import argparse
import logging
from datetime import datetime
import math
import traceback

import discord
import sqlalchemy
import sqlalchemy.orm

from role_bot.bot.app import AppClient
from role_bot.config import cfg
from role_bot.db import engine, db_session
from role_bot.models import DiscordRole, RoleList, RoleListRole, Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


            
       

async def main():
    parser = argparse.ArgumentParser(description="Role Bot")
    subparsers = parser.add_subparsers(dest="command", required=False)

    bot_parser = subparsers.add_parser("bot", help="Run the bot")
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")
    sync_roles_parser = subparsers.add_parser("sync-roles", help="Sync Discord roles")
    sync_commands_parser = subparsers.add_parser( 'sync-commands', help="Do not sync command definitions wiht Discord guilds. This saves time but if you change the definitions and don't sync then commands might not behave as they should.")

    # Add bot as default command if not specified in argv, so that subparser is run
    sys_argv = sys.argv[1:]
    if len(sys_argv) == 0:
        logger.info("No command specified, defaulting to 'bot'")
        sys_argv.append("bot")

    args = parser.parse_args(sys_argv)

    if args.command is None or args.command == "bot":
        # Bot
        client = AppClient(
            target_guild_id=cfg.guild_id,
        )

        logger.info("Starting bot")

        await client.start(cfg.discord_token.get_secret_value())

        logger.info("Bot shut down")
    elif args.command == "migrate":
        # Migrate
        logger.info("Running migrations")

        Base.metadata.create_all(engine)

        logger.info("Migrations successful")
    elif args.command == "sync-roles":
        # Sync roles
        logger.info("Syncing roles")

        client = AppClient(
            target_guild_id=cfg.guild_id,
        )
        await client.login(cfg.discord_token.get_secret_value())
        logger.info("Logged in to Discord")

        res = await client.sync_roles()
        logger.info("Synced roles in guild %s (Added %d, Removed %d, Renamed %d)", cfg.guild_id, len(res['added_discord_role_ids']), len(res['rm_discord_role_ids']), len(res['renamed_discord_role_ids']))
    elif args.command == "sync-commands":
        # Sync commands
        logger.info("Syncing commands")

        client = AppClient(
            target_guild_id=cfg.guild_id,
            do_sync_cmds=True,
        )
        await client.login(cfg.discord_token.get_secret_value())
        logger.info("Logged in to Discord")

        await client.wait_until_ready()
        
        # Properly close the connection
        await client.close()
        logger.info("Done syncing commands, you can exit now")
        


if __name__ == '__main__':
    logger.info("Main")
    asyncio.run(main())
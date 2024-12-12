#!/usr/bin/env python3
import asyncio
import sys
import argparse
import logging

from role_bot.bot.app import AppClient
from role_bot.config import cfg
from role_bot.db import engine
from role_bot.models import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    parser = argparse.ArgumentParser(description="Role Bot")
    subparsers = parser.add_subparsers(dest="command", required=False)

    bot_parser = subparsers.add_parser("bot", help="Run the bot")
    migrate_parser = subparsers.add_parser("dev-db-migrate", help="Run database migrations (Non-determanistic, looks at current state of schema and tries to make changes, risky!)")
    sync_roles_parser = subparsers.add_parser("sync-roles", help="Sync Discord roles")
    sync_commands_parser = subparsers.add_parser('sync-commands', help="Sync command definitions with Discord guilds")
    clear_commands_parser = subparsers.add_parser('clear-commands', help="Clear command definitions in the Discord guild")
    clear_commands_parser.add_argument(
        '--global',
        action='store_true',
        help="Clear all commands in the global scope",
        dest="clear_global",
    )
    
    sync_emojis_parser = subparsers.add_parser('sync-emojis', help="Sync custom emojis with the Discord guild")

    # Add bot as default command if not specified in argv, so that subparser is run
    sys_argv = sys.argv[1:]
    if len(sys_argv) == 0:
        logger.info("No command specified, defaulting to 'bot'")
        sys_argv.append("bot")

    args = parser.parse_args(sys_argv)

    if args.command is None or args.command == "bot":
        logger.info("Starting bot")

        # Bot
        async with AppClient.ctx_mgr(
            target_guild_id=cfg.guild_id,
        ) as client:
            await client.start(cfg.discord_token.get_secret_value())

            logger.info("Bot shut down")
    elif args.command == "dev-db-migrate":
        # Migrate
        logger.info("Running migrations")

        Base.metadata.create_all(engine)

        logger.info("Migrations successful")
    elif args.command == "sync-roles":
        logger.info("Syncing roles")

        # Sync roles
        async with AppClient.ctx_mgr(
            target_guild_id=cfg.guild_id,
        ) as client:
            await client.login(cfg.discord_token.get_secret_value())
            logger.info("Logged in to Discord")

            res = await client.sync_roles()

            logger.info("Synced roles in guild %s (Added %d, Removed %d, Renamed %d)", cfg.guild_id, len(res['added_discord_role_ids']), len(res['rm_discord_role_ids']), len(res['renamed_discord_role_ids']))
    elif args.command == "sync-commands":
        # Sync commands
        logger.info("Syncing commands")

        async with AppClient.ctx_mgr(
            target_guild_id=cfg.guild_id,
        ) as client:
            await client.login(cfg.discord_token.get_secret_value())

            logger.info("Syncing commands, this may take a moment...")

            await client.sync_commands()

            logger.info("Synced commands")
    elif args.command == "clear-commands":
        # Clear commands
        logger.info("Clearing commands")

        async with AppClient.ctx_mgr(
            target_guild_id=cfg.guild_id,
        ) as client:
            await client.login(cfg.discord_token.get_secret_value())

            logger.info("Clearing %s commands", "global" if args.clear_global else "guild")
            await client.clear_commands(clear_global=args.clear_global)

            logger.info("Cleared commands")
    


if __name__ == '__main__':
    logger.info("Main")
    asyncio.run(main())
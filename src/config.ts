import { strObjFromTuples } from "./util/object";

/**
 * Ensure an environment variable has a value. Optionally use default value.
 * @throws Error
 * Thrown if the environment variable was not defined.
 * @returns Environment variable value
 */
function unwrapEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} not allowed to be empty`);
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Parse a string in the format "<key>=<value>" into a tuple (<key>, <value>).
 * @throws Error
 * Thrown if the string cannot be parsed from this format.
 */
function parseEnvKV(str: string): [string, string] {
  const parts = str.split("=");
  if (parts.length !== 2) {
    throw new Error(`Environment variable value "${str}" must be in format "<key>=<value>" but was not and could not be parsed`);
  }

  return [parts[0], parts[1]];
}

/**
 * Chat bot configuration.
 */
export class Config {
  /**
   * Discord API configuration.
   */
  discord: {
    /**
     * Discord API authentication client ID.
     * Env var: ROLE_BOT_DISCORD_CLIENT_ID
     */
    clientID: string;

    /**
     * Nicknames (keys) and IDs (values) of Discord guilds (aka servers) for which the slash command should be installed.
     * Env var: ROLE_DISCORD_GUILD_IDS
     *          Comma seperated list of "<name>=<id>"
     */
    guildIDs: { [key: string]: string };

    /**
     * A Discord server is required which will host the bot's custom emojis. Specify this Discord server's guild ID in the guildIDs field, then provide the name of the key in guildIDs of this server.
     * Env var: ROLE_BOT_DISCORD_EMOJI_GUILD
     */
    emojiGuild: string;
    
    /**
     * Discord API authentication token.
     * Env var: ROLE_BOT_DISCORD_API_TOKEN
     */
    apiToken: string;
  };

  /**
   * Postgres configuration.
   */
  postgres: {
    /**
     * Host without port or schema.
     * Env var: ROLE_BOT_POSTGRES_HOST
     */
    host: string;

    /**
     * Port number on which server is listening.
     * Env var: ROLE_BOT_POSTGRES_PORT
     */
    port: number;

    /**
     * Login usernaqme.
     * Env var: ROLE_BOT_POSTGRES_USERNAME
     */
    username: string;

    /**
     * Login password.
     * Env var: ROLE_BOT_POSTGRES_PASSWORD
     */
    password: string;

    /**
     * Name of database in which to operate.
     * Env var: ROLE_BOT_POSTGRES_DATABASE
     */
    database: string;

    /**
     * If should destructively auto-migrate the database. This should not be used in production, only for development use.
     * Env var: ROLE_BOT_POSTGRES_DESTRUCTIVE_AUTO_MIGRATE
     */
    destructiveAutoMigrate: boolean;
  };

  /**
   * Loads field values from environment variables.
   */
  constructor() {
    this.discord = {
      clientID: unwrapEnv("ROLE_BOT_DISCORD_CLIENT_ID"),
      guildIDs: strObjFromTuples(unwrapEnv("ROLE_BOT_DISCORD_GUILD_IDS").split(",").map(parseEnvKV)),
      emojiGuild: unwrapEnv("ROLE_BOT_DISCORD_EMOJI_GUILD"),
      apiToken: unwrapEnv("ROLE_BOT_DISCORD_API_TOKEN"),
    };

    this.postgres = {
      host: unwrapEnv("ROLE_BOT_POSTGRES_HOST", "postgres"),
      port: parseInt(unwrapEnv("ROLE_BOT_POSTGRES_PORT", "5432")),
      username: unwrapEnv("ROLE_BOT_POSTGRES_USERNAME", "devrolebot"),
      password: unwrapEnv("ROLE_BOT_POSTGRES_PASSWORD", "devrolebot"),
      database: unwrapEnv("ROLE_BOT_POSTGRES_DATABASE", "devrolebot"),
      destructiveAutoMigrate: unwrapEnv("ROLE_BOT_POSTGRES_DESTRUCTIVE_AUTO_MIGRATE", "false") === "true",
    };
  }
}

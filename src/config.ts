import { DiscordConfig } from "./roles/adapters/discord";

/**
 * Convert a list of [key, value] tuples to an object.
 */
function strObjFromTuples(tuples: [string, string][]): { [key: string]: string } {
  let obj: { [key: string]: string } = {};
  for (const t of tuples) {
    obj[t[0]] = t[1];
  }

  return obj;
}

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
 * Loads values from environment variables.
 */
export class Config {
  /**
   * Discord API configuration.
   * Env vars for fields:
   * - clientID: ROLE_BOT_DISCORD_CLIENT_ID
   * - apiToken: ROLE_BOT_DISCORD_API_TOKEN
   * - guildIDs: ROLE_BOT_DISCORD_GUILD_IDS
   * - emojiGuildID: ROLE_BOT_DISCORD_EMOJI_GUILD_ID
   */
  discord: DiscordConfig;

  /**
   * Loads field values from environment variables.
   */
  constructor() {
    this.discord = {
      clientID: unwrapEnv("ROLE_BOT_DISCORD_CLIENT_ID"),
      apiToken: unwrapEnv("ROLE_BOT_DISCORD_API_TOKEN"),
      guildIDs: strObjFromTuples(unwrapEnv("ROLE_BOT_DISCORD_GUILD_IDS").split(",").map(parseEnvKV)),
      emojiGuildID: unwrapEnv("ROLE_BOT_DISCORD_EMOJI_GUILD_ID"),
    };
  }
}

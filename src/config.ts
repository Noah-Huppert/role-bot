import { strObjFromTuples } from "./util/object";

/**
 * Ensure an environment variable has a value.
 * @throws Error
 * Thrown if the environment variable was not defined.
 * @returns Environment variable value
 */
function unwrapEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} not allowed to be empty`);
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
     * Discord API authentication token.
     * Env var: ROLE_BOT_DISCORD_API_TOKEN
     */
    apiToken: string;
  };

  /**
   * Loads field values from environment variables.
   */
  constructor() {
    this.discord = {
      clientID: unwrapEnv("ROLE_BOT_DISCORD_CLIENT_ID"),
      guildIDs: strObjFromTuples(unwrapEnv("ROLE_BOT_DISCORD_GUILD_IDS").split(",").map(parseEnvKV)),
      apiToken: unwrapEnv("ROLE_BOT_DISCORD_API_TOKEN"),
    };
  }
}

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
     * IDs of Discord guilds (aka servers) for which the slash command should be installed.
     * Env var: ROLE_DISCORD_GUILD_IDS
     *          Comma seperated list.
     */
    guildIDs: string[];
    
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
      guildIDs: unwrapEnv("ROLE_BOT_DISCORD_GUILD_IDS").split(","),
      apiToken: unwrapEnv("ROLE_BOT_DISCORD_API_TOKEN"),
    };
  }
}

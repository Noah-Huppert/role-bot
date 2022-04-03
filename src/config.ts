import "reflect-metadata";

/**
 * The metadata key used to store the envVar value for the envVar annotation.
 */
const ENV_VAR_METADATA_KEY = "com.noahhuppert.role-bot.config.envVar";

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
   * Postgres database configuration.
   *
   */
  postgres: PostgresConfig;

  /**
   * Loads field values from environment variables.
   */
  constructor() {
    this.discord = new DiscordConfig();
    this.postgres = new PostgresConfig();
  }
}

/**
 * Discord API configuration for behavior and authentication.
 */
export class DiscordConfig {
  /**
   * Discord API credentials client ID.
   */
  @envVar({ name: "ROLE_BOT_DISCORD_CLIENT_ID" })
  clientID: string;

  /**
   * Discord API authentication token.
   */
  @envVar({ name: "ROLE_BOT_DISCORD_API_TOKEN" })
  apiToken: string;

  /**
   * Discord IDs of servers (aka guilds) which the bot should act within.
   * Keys are nicknames of the servers. Values are the guild IDs.
   */
  @envVar({ name: "ROLE_BOT_DISCORD_GUILD_IDS", type: "string:string" })
  guildIDs: { [key: string]: string };

  /**
   * The Discord ID of the server which will own custom emojis.
   */
  @envVar({ name: "ROLE_BOT_DISCORD_EMOJI_GUILD_ID" })
  emojiGuildID: string;

  /**
   * Loads values from environment variables.
   */
  constructor() {
    this.clientID = retrieveField("string", this, "clientID");
    this.apiToken = retrieveField("string", this, "apiToken");
    this.guildIDs = retrieveField("string:string", this, "guildIDs");
    this.emojiGuildID = retrieveField("string", this, "emojiGuildID");
  }
}

/**
 * Postgres database configuration.
 */
export class PostgresConfig {
  /**
   * Host of Postgres database.
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_HOST", default: "postgres" })
  host: string;

  /**
   * Port of the Postgres database.
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_PORT", type: "number", default: 5432 })
  port: number;

  /**
   * Name of the database.
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_DATABASE", default: "dev-role-bot" })
  database: string;

  /**
   * Name of user used to authenticate with the database.
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_USERNAME", default: "dev-role-bot" })
  username: string;

  /**
   * Password used to authenticate with the database.
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_PASSWORD" })
  password?: string;

  /**
   * Loads values from environment variables.
   */
  constructor() {
    this.host = retrieveField("string", this, "host");
    this.port = retrieveField("number", this, "port");
    this.database = retrieveField("string", this, "database");
    this.username = retrieveField("string", this, "username");
    this.password = retrieveField("string", this, "password");
  }
}

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
 * Decorator which annotates from which environment variable values should be loaded.
 * @param envVar - The environment variable from which the field should be loaded.
 * @param type - The type of the environment variable.
 */
function envVar(value: EnvVarAnnotationValue): (target: any, propertyKey: string) => void {
  return function(target: any, propertyKey: string) {
    Reflect.defineMetadata(ENV_VAR_METADATA_KEY, value, target, propertyKey);
  }
}

/**
 * Gets the value indicated by the envVar annotation.
 * @param target - The object to retrieve annotation value
 * @param field - The field's name on the target for which to get the annotation value
 * @returns The environment variable in which the field's value will be stored, or null if not specified with an envVar annotation.
 */
function getEnvVarAnnotation(target: any, field: string): EnvVarAnnotationValue | null {
  if (!Reflect.getMetadata(ENV_VAR_METADATA_KEY, target, field)) {
    return null;
  }

  return Reflect.getMetadata(ENV_VAR_METADATA_KEY, target, field);
}

/**
 * Retrieve and environment variable as specified by the envVar annotation.
 * @typeParam T - The type of EnvVarAnnotationValue, used to create the conditionally correct return type.
 * @param envVarSpec - The envVar annotation value.
 * @returns The environment variable value.
 */
function retrieveEnvVar<T extends EnvVarAnnotationValue>(envVarSpec: T):
  T extends EnvVarAnnotationStringValue ? string :
  T extends EnvVarAnnotationNumberValue ? number :
  T extends EnvVarAnnotationMapStringStringValue ? { [key: string]: string } :
  never
{
  // Get raw value
  const val = process.env[envVarSpec.name];

  // if (val === undefined && envVarSpec.default !== undefined) {
  //   // If env var missing but default is defined
  //   return envVarSpec.default;
  // }

  if (val === undefined) {
    throw new Error("Udefined");
  }

  // Convert to correct type
  if (isEnvVarAnnotationNumberValue(envVarSpec)) {
    return parseInt(val, 10);
  } else if (isEnvVarAnnotationMapStringStringValue(envVarSpec)) {
    return strObjFromTuples(val.split(",").map(parseEnvKV))
  }

  return val;
}

/**
 * Retrieve an environment variable for a specific field in a structure annotated with envVar.
 * @typeParam T - One of the EnvVarAnnotationValue type field values, forces the correct return type.
 * @param target - The annotated structure.
 * @param field - The name of the field to retrieve.
 * @returns The field's value.
 * @throws Error
 * If the envVar annotation value indicates a different type than T. Or if the field does not have an envVar annotation.
 */
function retrieveField<T extends "string" | "number" | "string:string">(type: T, target: any, field: string): T extends "string" ? string : T extends "number" ? number: { [key: string]: string } {
  // Get annotation value
  const envVarSpec = getEnvVarAnnotation(target, field);
  if (envVarSpec === null) {
    throw new Error(`Failed to retrieve '${field}' value, no envVar annotation`);
  }

  // Check type of envVar value matches expected type
  if ((type === "string" && !isEnvVarAnnotationStringValue(envVarSpec)) || (type === "number" && !isEnvVarAnnotationNumberValue(envVarSpec)) || (type === "string:string" &&  !isEnvVarAnnotationMapStringStringValue(envVarSpec))) {
    throw new Error(`Generic type parameter T specified type '${type}' but field '${field}' had type '${envVarSpec.type}'`);
  }

  // Get value from environment variable
  return retrieveEnvVar(envVarSpec);
}

/**
 * Value for the envVar annotation. Carries value of env var and then any type information.
 */
type EnvVarAnnotationValue = EnvVarAnnotationStringValue | EnvVarAnnotationNumberValue | EnvVarAnnotationMapStringStringValue;

function isEnvVarAnnotationStringValue(v: EnvVarAnnotationValue): v is EnvVarAnnotationStringValue {
  return v.type === "string" || v.type === undefined;
}

function isEnvVarAnnotationNumberValue(v: EnvVarAnnotationValue): v is EnvVarAnnotationNumberValue {
  return v.type === "number";
}

function isEnvVarAnnotationMapStringStringValue(v: EnvVarAnnotationValue): v is EnvVarAnnotationMapStringStringValue {
  return v.type === "string:string";
}

/**
 * Value for the envVar annotation which is a string.
 */
type EnvVarAnnotationStringValue = {
  /**
   * Indicates envVar annotation value is a string. Can be undefined which means this is the default type for EnvVarAnnotationValue.
   */
  type?: "string";
} & EnvVarAnnotationValueSpec<string>;

/**
 * Value for the envVar annotation which is a number.
 */
type EnvVarAnnotationNumberValue = { type: "number" } & EnvVarAnnotationValueSpec<number>;

/**
 * Value for the envVar annotation which is an object with string keys and values.
 */
type EnvVarAnnotationMapStringStringValue = { type: "string:string" } & EnvVarAnnotationValueSpec<{ [key: string]: string }>;

/**
 * Generic envVar annotation value with common fields.
 */
type EnvVarAnnotationValueSpec<T> = {
  /**
   * Name of the environment variable.
   */
  name: string;

  /**
   * The default value of the environment variable if not set.
   */
  default?: T;
};

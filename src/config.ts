import "reflect-metadata";

import { URL } from "url";

/**
 * The metadata key used to store the envVar value for the envVar annotation.
 */
const ENV_VAR_METADATA_KEY = "com.noahhuppert.role-bot.config.envVar";

/**
 * Chat bot configuration.
 */
export interface Config {
  /**
   * Discord API configuration.
   */
  discord: DiscordConfig;

  /**
   * Postgres database configuration.
   *
   */
  postgres: PostgresConfig;
}

/**
 * Provides a utility method which calls retrieveField and keeps track of any errors.
 */
class EnvVarErrorTracker {
  /**
   * Fields and the error that occurred when loading them.
   */
  envVarLoadErrors: { field: string, error: string }[];

  /**
   * Initializes EnvVarErrorTracker.
   */
  constructor() {
    this.envVarLoadErrors = []
  }

  /**
   * Calls the provided function, if an error occurs catches it and records it for later use in {@link ensureNoErrors}.
   * @typeParam T - The return type of the function.
   * @param field - Name of field to which error should be attributed.
   * @param errorReturn - The value which be returned in case of error.
   */
  wrapCall<T>(field: string, fn: () => T, errorReturn: T): T {
    try {
      return fn();
    } catch (e) {
      this.envVarLoadErrors.push({
        field: field,
        error: String(e),
      });

      return errorReturn;
    }
  }

  /**
   * Calls {@link retrieveField()} for a field. If an error occurs then keeps track of it, to be later re-raised by {@link ensureNoErrors()}.
   * @param field - Name of the field for which to call {@link retrieveField()}.
   * @returns The retrieved env var. If an error occurs a dummy RetrievedEnvVar is returned which has empty values.
   */
  retrieveField(field: string): RetrievedEnvVar {
    return this.wrapCall(
      field,
      () => retrieveField(this, field),
      {
        asString: (): string => "",
        asNumber: (): number => 0,
        asObject: (): { [key: string]: string } => { return {}; },
      });
  }

  /**
   * Ensures no errors occurred during {@link retrieveField} calls.
   * @param msgPrefix - If provided this text will be placed before the default error text in the thrown exception.
   * @throws
   * Any errors which occurred during retrieveField errors.
   */
  ensureNoErrors(msgPrefix: string = "") {
    // If no errors occurred
    if (this.envVarLoadErrors.length === 0) {
      return;
    }

    // If errors occurred
    throw new Error(msgPrefix + "[ " + this.envVarLoadErrors.map((e) => `${e.field}: ${e.error}`).join(", ") + " ]");
  }
}

/**
 * Loads chat bot configuration values from environment variables.
 */
export class EnvConfig extends EnvVarErrorTracker implements Config {
  /**
   * {@link Config.discord}
   * Loaded using {@link EnvDiscordConfig}.
   */
  discord: DiscordConfig;

  /**
   * {@link Config.postgres}
   * Loaded using {@link EnvPostgresConfig}.
   */
  postgres: PostgresConfig;

  /**
   * Loads field values from environment variables.
   * @throws
   * If environment variables fail to load.
   */
  constructor() {
    super();
    
    this.discord = this.wrapCall<DiscordConfig>(
      "discord",
      () => new EnvDiscordConfig(),
      { clientID: "", apiToken: "", guildIDs: {}, emojiGuildID: "" });
    this.postgres = this.wrapCall<PostgresConfig>(
      "postgres",
      () => new EnvPostgresConfig(),
      {
        host: "",
        port: 0,
        database: "",
        user: "",
        password: "",
        pgURI: () => "",
      });
    
    this.ensureNoErrors();
  }
}

/**
 * Discord API configuration for behavior and authentication.
 */
export interface DiscordConfig {
  /**
   * Discord API credentials client ID.
   */
  clientID: string;

  /**
   * Discord API authentication token.
   */
  apiToken: string;

  /**
   * Discord IDs of servers (aka guilds) which the bot should act within.
   * Keys are nicknames of the servers. Values are the guild IDs.
   */
  guildIDs: { [key: string]: string };

  /**
   * The Discord ID of the server which will own custom emojis.
   */
  emojiGuildID: string;
}

/**
 * Loads DiscordConfig from the environment,
 */
export class EnvDiscordConfig extends EnvVarErrorTracker implements DiscordConfig {
  /**
   * {@link DiscordConfig.clientID}
   */
  @envVar({ name: "ROLE_BOT_DISCORD_CLIENT_ID" })
  clientID: string;

  /**
   * {@link DiscordConfig.apiToken}
   */
  @envVar({ name: "ROLE_BOT_DISCORD_API_TOKEN" })
  apiToken: string;

  /**
   * {@link DiscordConfig.guildIDs}
   */
  @envVar({ name: "ROLE_BOT_DISCORD_GUILD_IDS" })
  guildIDs: { [key: string]: string };

  /**
   * {@link DiscordConfig.emojiGuildID}
   */
  @envVar({ name: "ROLE_BOT_DISCORD_EMOJI_GUILD_ID" })
  emojiGuildID: string;

  /**
   * Loads values from environment variables.
   * @throws
   * If environment variables fail to load.
   */
  constructor() {
    super();
    
    this.clientID = this.retrieveField("clientID").asString();
    this.apiToken = this.retrieveField("apiToken").asString();
    this.guildIDs = this.retrieveField("guildIDs").asObject();
    this.emojiGuildID = this.retrieveField("emojiGuildID").asString();
    
    this.ensureNoErrors();
  }
}

/**
 * Postgres database configuration.
 */
export interface PostgresConfig {
  /**
   * Host of Postgres database.
   */
  host: string;

  /**
   * Port of the Postgres database.
   */
  port: number;

  /**
   * Name of the database.
   */
  database: string;

  /**
   * Name of user used to authenticate with the database.
   */
  user: string;

  /**
   * Password used to authenticate with the database.
   */
  password?: string;

  /**
   * @returns Postgres connection URI using given parameters.
   */
  pgURI(): string;
}

/**
 * Loads postgres configuration from the environment.
 */
export class EnvPostgresConfig extends EnvVarErrorTracker implements PostgresConfig {
  /**
   * {@link PostgresConfig.host}
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_HOST", default: "postgres" })
  host: string;

  /**
   * {@link PostgresConfig.port}
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_PORT", default: "5432" })
  port: number;

  /**
   * {@link PostgresConfig.database}
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_DATABASE", default: "devrolebot" })
  database: string;

  /**
   * {@link PostgresConfig.username}
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_USER", default: "devrolebot" })
  user: string;

  /**
   * {@link PostgresConfig.password}
   */
  @envVar({ name: "ROLE_BOT_POSTGRES_PASSWORD", default: "devrolebot" })
  password?: string;

  /**
   * Loads values from environment variables.
   * @throws
   * If environment variables fail to load.
   */
  constructor() {
    super();
    
    this.host = this.retrieveField("host").asString();
    this.port = this.retrieveField("port").asNumber();
    this.database = this.retrieveField("database").asString();
    this.user = this.retrieveField("user").asString();
    this.password = this.retrieveField("password").asString();
    
    this.ensureNoErrors();
  }

  /**
   * {@link PostgresConfig.pgURI}
   */
  pgURI(): string {
    const uri = new URL("", `postgres://${this.user}@${this.host}:${this.port}/${this.database}`);

    if (this.password) {
      uri.password = this.password;
    }

    return uri.toString();
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
 * @param spec - Description of the environment variable.
 * @returns A decorator which stores a function to get the specified environment variable value. This function can then be called later, and will throw errors if a required value is missing.
 */
function envVar(spec: EnvVarAnnotationValue): (target: any, propertyKey: string) => void {
  return function(target: any, propertyKey: string) {
    // Reflect.defineMetadata(ENV_VAR_METADATA_KEY, value, target, propertyKey);
    const getValue = newRetrievedEnvVar(spec);
    
    Reflect.defineMetadata(ENV_VAR_METADATA_KEY, getValue, target, propertyKey);
  }
}

/**
 * Factory which creates a function to retrieve the environment variable specified by the {@link spec}.
 * @param spec- Description of the environment variable.
 * @returns Function which when called returns a utility helper to get the correct type of the value.
 */ 
function newRetrievedEnvVar(spec: EnvVarAnnotationValue): () => RetrievedEnvVar {
  return (): RetrievedEnvVar => {
    // Get value
    let _val = process.env[spec.name];
    if (_val === undefined && spec.default !== undefined) {
      _val = spec.default;
    }

    const val = _val;

    // If not found and required
    if (val === undefined) {
      throw new Error(`The '${spec.name}' environment variable is required but was not set`);
    }

    return {
      asString(): string {
        return val;
      },
      asNumber(): number {
        return parseInt(val, 10);
      },
      asObject(): { [key: string]: string } {
        return strObjFromTuples(val.split(",").map(parseEnvKV))
      },
    };
  }
}

/**
 * Helper methods which manipulate an environment variable value into the desired type.
 */
interface RetrievedEnvVar {
  /**
   * @returns The env var as a string.
   */
  asString(): string;

  /**
   * @returns The env var as a number.
   */
  asNumber(): number;

  /**
   * @returns The env var as an object with string keys and values.
   */
  asObject(): { [key: string]: string };
}

/**
 * Gets the value indicated by the envVar annotation.
 * @param target - The object to retrieve annotation value
 * @param field - The field's name on the target for which to get the annotation value
 * @returns A factory method to access the environment variable's value. If no annotation is present on the field then a factory method which only throws an error is returned.
 */
function getEnvVarAnnotation(target: any, field: string): () => RetrievedEnvVar {
  if (!Reflect.getMetadata(ENV_VAR_METADATA_KEY, target, field)) {
    return (): RetrievedEnvVar => {
      throw new Error(`Field '${field}' does not have @envVar() annotation, but one was expected at runtime`);
    }
  }

  return Reflect.getMetadata(ENV_VAR_METADATA_KEY, target, field);
}

/**
 * Retrieve an environment variable for a specific field in a structure annotated with envVar.
 * @param target - The annotated structure.
 * @param field - The name of the field to retrieve.
 * @returns The field's value.
 * @throws Error
 * If the field does not have an envVar annotation.
 * If the env var is required but does not exist.
 */
function retrieveField(target: any, field: string): RetrievedEnvVar {
  // Get annotation value
  const factory = getEnvVarAnnotation(target, field);
  return factory();
}

/**
 * The envVar annotation fields.
 */
type EnvVarAnnotationValue = {
  /**
   * Name of the environment variable.
   */
  name: string;

  /**
   * The default value of the environment variable if not set.
   * Environment variables are all strings to start, so provide the string serialized version of the default value.
   */
  default?: string;
};

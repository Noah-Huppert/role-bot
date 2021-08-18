import {
  REST as DiscordREST,
} from "@discordjs/rest";
import {
  Routes as DiscordRoutes,
} from "discord-api-types/v9";
import {
  Client as DiscordClient,
  Intents as DiscordIntents,
  Interaction as DiscordInteraction,
  MessageActionRow,
} from "discord.js";
import {
  createConnection as createDBConnection,
  Connection as DBConnection,
} from "typeorm";

import { Config } from "./config";
import { SelectRoleListView } from "./components/SelectRoleListView";

/**
 * Discord permission scope.
 * 
 * Permissions:
 * - General permissions
 *   - Manage roles
 * - Text permissions
 *   - Use slash commands
 */
export const DISCORD_INVITE_PERMS = 2415919104;

/**
 * Scopes required for OAuth.
 */
export const DISCORD_OAUTH_SCOPES = [
  "applications.commands",
  "bot",
];

/**
 * Discord slash command definitions.
 */
export const DISCORD_CMDS = [
  {
    name: "role-lists",
    description: "Edit or create role lists.",
  },
];

/**
 * Bot logic.
 * Must call init() to start.
 */
export class Bot {
  /**
   * Bot configuration.
   */
  cfg: Config;
  
  /**
   * Discord REST API client.
   */
  discordREST: DiscordREST;

  /**
   * Discord standard API client.
   */
  discordAPI: DiscordClient;

  /**
   * Database client. Lazy initialized. Retrieve via db().
   */
  _db?: DBConnection;

  /**
   * Setup bot.
   */
  constructor() {
    this.cfg = new Config();
    
    this.discordREST = new DiscordREST({
      version: "9",
    }).setToken(this.cfg.discord.apiToken);

    this.discordAPI = new DiscordClient({
      intents: [
        DiscordIntents.FLAGS.GUILDS,
      ],
    });
    this.discordAPI.on("ready", this.onDiscordReady.bind(this));
    this.discordAPI.on("interactionCreate", this.onDiscordInteraction.bind(this));
    this.discordAPI.login(this.cfg.discord.apiToken);
  }

  /**
   * Retrieve or lazy initialize database client.
   */
  async db(): Promise<DBConnection> {
    if (this._db === undefined) {
      this._db = await createDBConnection({
        type: "postgres",
        host: this.cfg.postgres.host,
        port: this.cfg.postgres.port,
        username: this.cfg.postgres.username,
        password: this.cfg.postgres.password,
        database: this.cfg.postgres.database,
        synchronize: this.cfg.postgres.destructiveAutoMigrate,
      });
    }
    
    return this._db;
  }

  /**
   * Initializes bot slash commands.
   */
  async init() {
    // Setup slash commands
    const discordOAuthLink = `https://discord.com/api/oauth2/authorize?client_id=${this.cfg.discord.clientID}&scope=${encodeURIComponent(DISCORD_OAUTH_SCOPES.join(" "))}&permissions=${DISCORD_INVITE_PERMS}`;
    console.log(`Authorize the Discord bot, visit this link:
${discordOAuthLink}`)
    for (const nickname in this.cfg.discord.guildIDs) {
      const guildID = this.cfg.discord.guildIDs[nickname];
      
      try {
        await this.discordREST.put(
          DiscordRoutes.applicationGuildCommands(this.cfg.discord.clientID, guildID),
          { body: DISCORD_CMDS }
        );
        
        console.log(`Updated Discord slash commands for guild (${nickname} ${guildID})`);
      } catch (e) {
        throw new Error(`Failed to install Discord slash commands in guild (${nickname} ${guildID}): ${e}`);
      }
    }
  }

  /**
   * Handles when the Discord API client has logged in.
   */
  onDiscordReady() {
    console.log("Discord API ready");
  }

  /**
   * Handles a new Discord interaction.
   */
  async onDiscordInteraction(interaction: DiscordInteraction) {
    console.log(`Received interaction: ${interaction}`);

    // Ensure for a guild we are serving
    if (!interaction?.guildId || !Object.values(this.cfg.discord.guildIDs).includes(interaction.guildId)) {
      return;
    }

    // Handle if command
    if (interaction.isCommand()) {
      interaction.reply({
        content: "Select role list to edit, or create a new role list",
        components: SelectRoleListView(),
      });
    }
  }
}

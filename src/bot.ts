import path from "path";
import util from "util";
import fs from "fs";
import axios from "axios";
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
import {
  ComponentFactory,
  BaseComponent,
  BaseComponentArgs,
} from "./components/base";
import { SelectRoleList } from "./components/select-role-list";

/**
 * Discord bot permissions for normal servers which us te bot.
 * 
 * Permissions:
 * - General permissions
 *   - Manage roles
 * - Text permissions
 *   - Use external emojis
 *   - Use slash commands
 */
export const DISCORD_NORMAL_INVITE_PERMS = 2416181248;

/**
 * Discord bot permissions for the emoji management server.
 * 
 * Permissions:
 * - General permissions
 *   - Manage roles
 *   - Manage Emojis and Stickers
 * - Text permissions
 *   - Use external emojis
 *   - Use slash commands
 */
export const DISCORD_EMOJI_INVITE_PERMS = 3489923072;

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
 * Custom Discord emojis directory.
 */
export const CUSTOM_DISCORD_EMOJIS_DIR = path.resolve(path.join(__dirname, "/../custom-emojis"));

/**
 * Custom emoji type definition.
 */
export type CustomDiscordEmojiDef = {
  /**
   * File path relative to CUSTOM_DISCORD_EMOJIS_DIR which contains emoji image.
   */
  file: string;
};

/**
 * List of custom emoji details.
 */
export const CUSTOM_DISCORD_EMOJIS: { [key: string]: CustomDiscordEmojiDef } = {
  "plus": {
    file: "plus.png",
  },
};

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
   * Custom managed Discord emoji IDs.
   * Only filled after init() called.
   */
  customDiscordEmojiIDs: { [key: string]: string }

  /**
   * Database client. Lazy initialized. Retrieve via db().
   */
  _db?: DBConnection;

  /**
   * Discord interaction component factory.
   */
  componentFactory: ComponentFactory;

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
    this.customDiscordEmojiIDs = {};

    this.componentFactory = new ComponentFactory({
      discordAPI: this.discordAPI,
      customDiscordEmojiIDs: this.customDiscordEmojiIDs,
    });
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
    console.log(`For the server where the Discord bot's emojis are managed invite it with this link: ${this.discordInviteLink(DISCORD_EMOJI_INVITE_PERMS, DISCORD_OAUTH_SCOPES)}`);
    console.log(`For normal use of the Discord bot invite it with this link: ${this.discordInviteLink(DISCORD_NORMAL_INVITE_PERMS, DISCORD_OAUTH_SCOPES)}`);
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

    // Setup custom emojis
    console.log(`Ensuring ${Object.keys(CUSTOM_DISCORD_EMOJIS).length} custom emoji(s) are managed`);
    const emojiGuildID = this.cfg.discord.guildIDs[this.cfg.discord.emojiGuild];
    const emojiGuild = await this.discordAPI.guilds.fetch(emojiGuildID);
    if (!emojiGuild) {
      throw new Error(`Could not find Discord emoji management server (${this.cfg.discord.emojiGuild} ${emojiGuildID})`);
    }
    const emojiManage = emojiGuild.emojis;

    Object.keys(CUSTOM_DISCORD_EMOJIS).forEach(async (emojiName) => {
      const emojiDef = CUSTOM_DISCORD_EMOJIS[emojiName];

      // Load custom emoji data
      const filePath = path.join(CUSTOM_DISCORD_EMOJIS_DIR, emojiDef.file);
      const fileContents = await util.promisify(fs.readFile)(filePath);
      
      // Check if exists
      const emoji = await emojiManage.cache.find(e => e.name === emojiName);
      if (emoji) {
        // Check if emoji is the same
        const resp = await axios(emoji.url, {
          responseType: "arraybuffer",
        });
        const existingContent = resp.data;

        console.log(filePath, fileContents, emoji.url, existingContent);
        if (!Buffer.compare(fileContents, existingContent)) {
          console.log(`Deleting existing custom emoji ${emojiName} ${emoji.id} because image changed`);
          await emoji.delete(`${emojiName} image changed, updating`);
        } else {
          // Custom emoji is the same
          console.log(`Existing custom emoji ${emojiName} ${emoji.id} was up to date`);
          this.customDiscordEmojiIDs[emojiName] = emoji.id;
          return;
        }
      }

      // Create emoji
      const newEmoji = await emojiManage.create(fileContents, emojiName);
      this.customDiscordEmojiIDs[emojiName] = newEmoji.id;
      console.log(`Created new custom emoji ${emojiName} ${newEmoji.id}`);
    });
  }

  /**
   * constructor a Discord bot invite link.
   */
  discordInviteLink(permissions: number, scopes: string[]): string {
    return`https://discord.com/api/oauth2/authorize?client_id=${this.cfg.discord.clientID}&scope=${encodeURIComponent(scopes.join(" "))}&permissions=${permissions}`;
  }

  /**
   * Shortcut to call the ComponentFactory.hydrate() factory.
   */
  async hydrate(cls: new (args: BaseComponentArgs) => BaseComponent): Promise<MessageActionRow[]> {
    return await this.componentFactory.hydrate(cls);
  }

  /**
   * Handles when the Discord API client has logged in.
   */
  onDiscordReady() {
    console.log("Discord API ready");
    // this.discordAPI.guilds.cache.first(1)[0].emojis.cache.each(e => console.log(e.name));
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
        components: await this.hydrate(SelectRoleList),
      });
    }
  }
}

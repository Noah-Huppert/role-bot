import path from "path";
import util from "util";
import fs from "fs";
import axios from "axios";
import {
  createConnection as createDBConnection,
  Connection as DBConnection,
} from "typeorm";

import { Config } from "../../config";
import { Command } from "./definition";
import { DiscordAdapter } from "./adapters/discord";

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
   * Discord command manager.
   */
  discordManager: DiscordAdapter;

  /**
   * Custom managed Discord emoji IDs.
   * Only set after init() called.
   */
  customDiscordEmojiIDs: { [key: string]: string }

  /**
   * Database client. Lazy initialized. Retrieve via db().
   */
  _db?: DBConnection;

  /**
   * Setup bot.
   */
  constructor() {
    this.cfg = new Config();

    this.discordDiscordAdapter = new DiscordAdapter({
      apitoken: this.cfg.discord.apiToken,
      clientID: this.cfg.discord.clientID,
    });
    
    this.customDiscordEmojiIDs = {};
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
    console.log(`For the server where the Discord bot's emojis are managed invite it with this link:
    ${this.discordInviteLink(DISCORD_EMOJI_INVITE_PERMS, DISCORD_OAUTH_SCOPES)}
`);
    console.log(`For normal use of the Discord bot invite it with this link:
    ${this.discordInviteLink(DISCORD_NORMAL_INVITE_PERMS, DISCORD_OAUTH_SCOPES)}
`);
    for (const nickname in this.cfg.discord.guildIDs) {
      // For each guild update slash commands
      // Global slash commands not used due to high update time
      const guildID = this.cfg.discord.guildIDs[nickname];

      try {
        
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
}

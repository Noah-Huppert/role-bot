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
} from "discord.js";

import { Config } from "./config";

/**
 * Discord permission scope.
 * General permissions: manage roles
 * Text permissions: use slash commands
 */
export const DISCORD_SCOPE = 2415919104;

/**
 * Discord slash command definitions.
 */
export const DISCORD_CMDS = [
  {
    name: "admin-list",
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
   * Initializes bot slash commands.
   */
  async init() {
    // Setup slash commands
    console.log(`Invite bot to server: https://discord.com/api/oauth2/authorize?client_id=${this.cfg.discord.clientID}&scope=bot&permissions=${DISCORD_SCOPE}`)
    for (const guildID of this.cfg.discord.guildIDs) {
      try {
        await this.discordREST.put(
          DiscordRoutes.applicationGuildCommands(this.cfg.discord.clientID, guildID),
          { body: DISCORD_CMDS }
        );
        
        console.log(`Updated Discord slash commands for guild "${guildID}`);
      } catch (e) {
        throw new Error(`Failed to authorize with guild ${guildID}`);
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
  }
}

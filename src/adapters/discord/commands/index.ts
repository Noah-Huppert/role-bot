import {
  Client as DiscordClient,
  CommandInteraction,
} from "discord.js";
import { DiscordREST } from "@discordjs/rest";
import { Routes as DiscordRoutes } from "discord-api-types/v9";

/**
 * Details of a Discord Slash command.
 */
interface DiscordCommand {
  /**
   * The value the user will type to call the command.
   * No leading slash.
   */
  name: string;

  /**
   * User guide text shown in the Discord UI.
   */
  description: string;

  /**
   * The adapter logic for this command.
   */
  handler: () => Promise<void>;
}

/**
 * Adapter for Discord commands.
 */
export class DiscordCommandAdapter {
  /**
   * IDs of Discord guilds the adapter should call the command port.
   */
  discordGuildIDs: string[];
  
  /**
   * Discord REST API client.
   */
  discordREST: DiscordREST;

  /**
   * Slash commands the adapter will serve.
   */
  commands: DiscordCommand[];

  constructor({
    discordGuildIDs,
    discordAPIToken,
    commands,
  }: {
    discordGuildIDs: string[];
    discordAPIToken: string;
    commands: DiscordCommand[];
  }) {
    this.discordGuildIDs = discordGuildIDs;
    this.discordREST = new DiscordREST({
      version: "9",
    }).setToken(discordAPIToken);
  }

  /**
   * Setup adapter's connection to the discord API.
   */
  async setup(): Promise<void> {
    for (const nickname in this.discordGuildIDs) {
      const guildID = this.discordGuildIDs[nickname];

      this.updateGuildCommands(guildID, this.commands);
    }
  }
  
  /**
   * Register the commands this manager is aware of with the Discord API.
   */
  async updateGuildCommands(guildID: string, commands: DiscordCommand[]): Promise<void> {
    const updateGuildAPIPath = DiscordRoutes.applicationGuildCommands(this.discordClientID, guildID);
    await this.discordREST.put(updateGuildAPIPath, {
      body: this.commands,
    });
  }

    
  /**
   * Handler which is called when a new Discord command interaction is received from the Discord API.
   */
  async onCommandInteraction(command: CommandInteraction) {
    
  }
}

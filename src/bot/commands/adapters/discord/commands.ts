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
}

/**
 * Names of Discord commands being handled by the adapter.
 */
enum DiscordCommand {
  ListRoles = "roles";
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

  constructor({
    discordGuildIDs,
    discordREST,
  }: {
    discordguildIDs: string[];
    discordREST: DiscordREST;
  }) {
    this.discordREST = new DiscordREST({
      version: "9",
    }).setToken(discordAPIToken);
  }

  /**
   * Setup adapter's connection to the discord API.
   */
  async setup(): Promise<void> {
    for (const // TODO Do bot.ts
  }
  
  /**
   * Register the commands this manager is aware of with the Discord API.
   */
  async updateGuildCommands(guildID: string, commands: Command[]): Promise<void> {
    const updateGuildAPIPath = DiscordRoutes.applicationGuildCommands(this.discordClientID, guildID);
    await this.discordREST.put(updateGuildAPIPath, {
      body: this.commands,
    });
  }

    
  /**
   * Handler which is called when a new Discord command interaction is received from the Discord API.
   */
  async onCommandInteraction(command: CommandInteraction) {
    switch (command.commandName) {
      case DiscordCommand.ListRoles:
        console.log("on list roles");
        break;
      default:
        console.error(`unknown command: ${command.commandName}`);
        break;
    }
  }
}

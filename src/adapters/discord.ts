import { SlashCommandBuilder } from "@discordjs/builders";
import { Routes as DiscordRESTRoutes } from "discord-api-types/v9";
import { REST as DiscordREST } from "@discordjs/rest";
import {
  Client as DiscordClient,
  Intents as DiscordIntents,
  CommandInteraction,
  MessageSelectMenu,
  MessageActionRow,
} from "discord.js";

import { RoleManager } from "../ports/roles";

/**
 * Name of role management Discord command.
 */
const DISCORD_COMMAND_ROLES = "roles";

/**
 * ID of role command select menu.
 */
const DISCORD_COMMAND_ROLES_SELECT_ID = "roles/select/roles";

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

export class DiscordAdapter {
  /**
   * Discord API configuration.
   */
  config: DiscordConfig;

  /**
   * The port used to manage roles.
   */
  roleManager: RoleManager;

  /**
   * Creates a DiscordAdapter.
   */
  constructor({
    config,
    roleManager,
  }: {
    config: DiscordConfig,
    roleManager: RoleManager;
  }) {
    this.config = config;
    this.roleManager = roleManager;
  }
  
  /**
   * Sets up a Discord API client listen for Discord interaction events.
   */
  async setup(): Promise<void> {
    // Set the commands to display in Discord
    const cmds = [
      new SlashCommandBuilder().setName(DISCORD_COMMAND_ROLES).setDescription("Manage roles"),
    ];
    const cmdsJSON = cmds.map((cmd) => cmd.toJSON());

    const discordREST = new DiscordREST({ version: "9" }).setToken(this.config.apiToken);

    await Promise.all(Object.values(this.config.guildIDs).map(async (guildID) => {
      console.log(`Setup Discord commands for ${guildID}`);
      await discordREST.put(DiscordRESTRoutes.applicationGuildCommands(this.config.clientID, guildID), { body: cmdsJSON });
    }));

    // Setup handler for commands
    // const discordClient = new DiscordClient({ intents: [ DiscordIntents.FLAGS.GUILDS ] });

  //   // Wait for Discord client to be ready
  //   discordClient.on("interactionCreate", async (interaction) => {
  //     if (interaction.isCommand()) {
  //       switch (interaction.commandName) {
  //         case DISCORD_COMMAND_ROLES:
  //           await this.onRoleCommand(interaction);
  //           break;
  //       }
  //     }
  //   });

  //   discordClient.login(this.config.apiToken);
  // }

  // /**
  //  * Adapter for the Discord role command interaction being received.
  //  * @param commandInteraction - The role command interaction.
  //  */
  // async onRoleCommand(commandInteraction: CommandInteraction): Promise<void> {
  //   console.log("On role command");

  //   // Get roles
  //   const roles = await this.roleManager.listRoles();

  //   // Reply
  //   await commandInteraction.reply({
  //     content: "Manage roles",
  //     components: [
  //       new MessageActionRow({
  //         components: [
  //           new MessageSelectMenu({
  //             customId: DISCORD_COMMAND_ROLES_SELECT_ID,
  //             options: roles.map((role) => {
  //               return {
  //                 label: role.name,
  //                 description: role.description,
  //                 value: role.name,
  //               };
  //             }),
  //           }),
  //         ],
  //       })
  //     ]});
  }
}

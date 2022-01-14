import { CommandInteraction } from "discord.js";

import { RoleManager } from "../../ports/roles";
import { CommandMeta } from "./index";

/**
 * @param interaction - The command interaction.
 */
export class CreateRoleListHandler {
  /**
   * The role manager port used by the handler.
   */
  roleManager: RoleManager;

  /**
   * Create a new handler.
   * @param roleManager - The role manager used by the handler.
   */
  constructor({
    roleManager,
  }: {
    roleManager: RoleManager,
  }) {
    this.roleManager = roleManager;
  }

  /**
   * Provides metadata about the Discord command this handler pertains.
   */
  getMeta(): CommandMeta {
    return {
      name: "create-role-list",
      description: "Create a new list of roles from which users can self assign",
      onCommand: this.onCommand,
    };
  }

  /**
   * Create a new role list.
   */
  async onCommand(interaction: CommandInteraction): Promise<void> {
    console.log("On role command");

    // Get roles
    const roles = await this.roleManager.listRoles();

    // Reply
    await interaction.reply({
      content: "Manage roles",
      components: [
        // new MessageActionRow({
        //   components: [
        //     new MessageSelectMenu({
        //       customId: DISCORD_COMMAND_ROLES_SELECT_ID,
        //       options: roles.map((role) => {
        //         return {
        //           label: role.name,
        //           description: role.description,
        //           value: role.name,
        //         };
        //       }),
        //     }),
        //   ],
        // })
      ]});
  }
}

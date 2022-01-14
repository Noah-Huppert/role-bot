import {
  CommandInteraction,
  SelectMenuInteraction,
  MessageSelectMenu,
  MessageActionRow,
} from "discord.js";

import { RoleManager } from "../../ports/roles";
import {
  CommandMeta,
  SelectMeta,
} from "./index";

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
   * @returns Instructions on how to handle the create role list command.
   */
  getCommandMeta(): CommandMeta {
    return {
      name: "create-role-lists",
      description: "Create a new list of roles from which users can self assign",
      onCommand: (i) => this.onCommand(i),
    };
  }

  /**
   * Create a new role list.
   */
  async onCommand(interaction: CommandInteraction): Promise<void> {
    // Get roles
    const roles = await this.roleManager.listRoles();

    // Reply
    // TODO: Reply with a form for creating a list
    await interaction.reply({
      content: "Manage roles",
      components: [
        new MessageActionRow({
          components: [
            new MessageSelectMenu({
              customId: DISCORD_COMMAND_ROLES_SELECT_ID,
              options: roles.map((role) => {
                return {
                  label: role.name,
                  description: role.description,
                  value: role.name,
                };
              }),
            }),
          ],
        })
      ]});
  }
}

import {
  CommandInteraction,
  SelectMenuInteraction,
  MessageSelectMenu,
  MessageActionRow,
} from "discord.js";

import { RoleManager } from "../../ports/roles";
import {
  InteractionDescription,
  newCommandDescription,
} from "./index";

/**
 * Dependencies used by the create role list command logic.
 */
type CreateRoleListOpts = {
  /**
   * The role manager port used by the handler.
   */
  roleManager: RoleManager;
};
  

/**
 * Describes a create role list command interaction.
 */
export class CreateRoleListDescriber {
  /**
   * The options used by the handler.
   */
  opts: CreateRoleListOpts;

  /**
   * Initialize the describer.
   * @param opts - Dependencies used by handler logic.
   */
  constructor(opts: CreateRoleListOpts) {
    this.opts = opts;
  }
  
  /**
   * @returns Instructions on how to handle the create role list command.
   */
  getInteractionDescriptions(): InteractionDescription[] {
    return [
      newCommandDescription({
        name: "create-role-lists",
        description: "Create a new list of roles from which users can self assign",
        factory: () => new CreateRoleListHandler(this.opts),
      }),
    ];
  }
}

/**
 * Handles a Discord create role list command interaction.
 */
class CreateRoleListHandler {
  /**
   * Prismatic dependencies used by the handler.
   */
  opts: CreateRoleListOpts;

  constructor(opts: CreateRoleListOpts) {
    this.opts = opts;
  }

  async onCommand(cmd: CommandInteraction): Promise<void> {
    // Get roles
    const roles = await this.opts.roleManager.listRoles();

    // Reply
    await cmd.reply({
      content: "Manage roles",
      components: [
        new MessageActionRow({
          components: [
            new MessageSelectMenu({
              customId: "create-role-list:select_role",
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

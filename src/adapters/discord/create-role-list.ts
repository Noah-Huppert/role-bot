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
  newSelectMenuDescription,
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
   * The role manager port used by the handler.
   */
  roleManager: RoleManager;

  /**
   * Initialize the describer.
   * @param opts - Dependencies used by handler logic.
   */
  constructor(opts: CreateRoleListOpts) {
    this.roleManager = opts.roleManager;
  }
  
  /**
   * @returns Instructions on how to handle the create role list command.
   */
  getInteractionDescriptions(): InteractionDescription[] {
    return [
      newCommandDescription({
        name: "create-role-lists",
        description: "Create a new list of roles from which users can self assign",
        factory: () => {
          return {
            onCommand: async (cmd: CommandInteraction): Promise<void> => {
              // Get roles
              const roles = await this.roleManager.listRoles();

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
            },
          };
        },
      }),
      newSelectMenuDescription({
          customID: "create-role-list:select_role",
          factory: () => {
            return {
              onSelectMenu: async (selectMenu: SelectMenuInteraction): Promise<void> => {
                console.log("select", selectMenu);
              },
            };
          },
      }),
    ];
  }
}

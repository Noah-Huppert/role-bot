import {
  CommandInteraction,
  SelectMenuInteraction,
  MessageSelectMenu,
  MessageActionRow,
} from "discord.js";

import { RoleListManager } from "../../roles";
import {
  InteractionDescription,
  newCommandDescription,
  newCommandDescriptionStringArgument,
} from "./index";
import { COLORS } from "./colors";

/**
 * Dependencies used by the create role list command logic.
 */
type CreateRoleListOpts = {
  /**
   * The role manager port used by the handler.
   */
  roleListManager: RoleListManager;
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
        arguments: [
          newCommandDescriptionStringArgument({
            name: "name",
            description: "The name of the new role",
            required: true,
          }),
          newCommandDescriptionStringArgument({
            name: "description",
            description: "The description of the new role",
            required: true,
          }),
        ],
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
    const name = cmd.options.getString("name", true);
    const description = cmd.options.getString("description", true);

    const res = await this.opts.roleListManager.createRoleList({
      id: "",
      name,
      description,
    });
    if (res.ok) {
      const roleList = res.val;

      await cmd.reply({
        embeds: [
          {
            title: "New Role List Created",
            color: COLORS.success,
            fields: [
              {
                name:"Name",
                value: roleList.name,
                inline: true,
              },
              {
                name: "Description",
                value: roleList.description,
                inline: true,
              }
            ],
          }
        ]
      });
    } else {
      const error = res.val;
      
      await cmd.reply({
        embeds: [
          {
            title: "Failed to Create Role List",
            description: error,
            color: COLORS.error,
          },
        ],
      });
    }
  }
}

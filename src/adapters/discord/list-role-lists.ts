import { CommandInteraction } from "discord.js";

import {
  InteractionDescription,
  newCommandDescription,
} from "./index";
import { CREATE_ROLE_LIST_CMD_NAME } from "./create-role-list";
import { COLORS } from "./colors";
import { RoleListManager } from "../../roles";

/**
 * Dependencies used by list role lists logic.
 */
type ListRoleListsOpts = {
  /**
   * Used to manage roles and role lists.
   */
  roleListManager: RoleListManager;
};

/**
 * Described for ListRoleListsHandler.
 */
export class ListRoleListsDescriber {
  /**
   * Dependencies used by handler.
   */
  opts: ListRoleListsOpts;

  /**
   * Initializes ListRoleListsDescriber.
   * @param opts - {@link opts}
   */
  constructor(opts: ListRoleListsOpts) {
    this.opts = opts;
  }
  
  getInteractionDescriptions(): InteractionDescription[] {
    return [
      newCommandDescription({
        name: "list-role-lists",
        description: "Show all the role lists",
        factory: () => new ListRoleListsHandler(this.opts),
      }),
    ];
  }
}

/**
 * List role lists discord command handler.
 */
class ListRoleListsHandler {
  /**
   * Dependencies used by logic.
   */
  opts: ListRoleListsOpts;

  /**
   * Initializes ListRoleListsHandler.
   * @param opts - {@link opts}
   */
  constructor(opts: ListRoleListsOpts) {
    this.opts = opts;
  }
  
  async onCommand(cmd: CommandInteraction): Promise<void> {
    const res = await this.opts.roleListManager.listRoleLists();

    if (res.ok) {
      const roleLists = res.val;

      if (roleLists.length === 0) {
        await cmd.reply({
          embeds: [
            {
              title: "Role Lists",
              description: "*No role lists*",
              color: COLORS.success,
              footer: {
                text: `Use /${CREATE_ROLE_LIST_CMD_NAME} to make some.`,
              },
            },
          ],
        });
      } else {
        await cmd.reply({
          embeds: [
            {
              title: "Role Lists",
              color: COLORS.success,
              fields: roleLists.map((roleList) => {
                return {
                  name: roleList.name,
                  value: roleList.description,
                  inline: true,
                };
              }),
            }
          ],
        });
      }
    } else {
      const error = res.val;

      await cmd.reply({
        embeds: [
          {
            title: "Failed to List Role Lists",
            description: error,
            color: COLORS.error,
          },
        ],
      });
    }
  }
}

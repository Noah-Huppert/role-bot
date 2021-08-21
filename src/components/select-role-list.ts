import {
  MessageActionRow,
  MessageSelectMenu,
} from "discord.js";

import { BaseComponent } from "./base";

export const SELECT_ID = "select-role";

/**
 * View which lets user select which role list to edit.
 */
export class SelectRoleList extends BaseComponent {
  async render(): Promise<MessageActionRow[]> {

    const new_role_list_choice = {
      label: "New role list",
      emoji: await this.emoji("create"),
      description: "Create a new role list",
      value: "_new",
    };
    
    return [
      new MessageActionRow()
        .addComponents(
          new MessageSelectMenu()
            .setCustomId(SELECT_ID)
            .setPlaceholder("Select role list to edit, or create new one.")
            .addOptions([
              new_role_list_choice,
            ]),
        )
    ];
  }
}

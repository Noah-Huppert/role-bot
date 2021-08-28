import {
  MessageActionRow,
  MessageSelectMenu,
} from "discord.js";

import { BaseComponent } from "./base";
import { SelectMenuHandler } from "../views/interaction-registry";
import { RoleList } from "../models/role-list";

/**
 * RoleSelect component actions map.
 */
export type RoleSelectActions = {
  /**
   * Custom ID of interaction when role is selected from the menu.
   * Will receive the `value` {@link ROLE_SELECT_VALUE_CREATE} if the create role option is selected.
   */
  onRoleSelect: SelectMenuHandler;
}

/**
 * RoleSelect component properties.
 */
export type RoleSelectProps = {
  /**
   * The role lists to display as options to select.
   */
  roleLists: RoleList[];

  /**
   * Whether or not an option should be shown to create a new role list.
   */
  showCreateOption: boolean;
};

/**
 * The option value which will be sent in the onRoleSelect action when a user selects the option to create a new role.
 */
export const ROLE_SELECT_VALUE_CREATE = "@@ROLE_SELECT/ON_ROLE_SELECT/CREATE";

/**
 * Show a drop down from which the user can select a RoleList.
 */
export class RoleSelect extends BaseComponent {
  async render(): Promise<MessageActionRow[]> {
    return [
      new MessageActionRow()
        .addComponents(
          new MessageSelectMenu()
            .setCustomId(this.actions.onRoleSelect)
            .setPlaceholder(`Select role list to edit${this.props.showCreateOption ? ' or create new one' : ''}.`)
            .addOptions([
              ...(this.props.showCreateOption ? [{
                label: "New role list",
                emoji: await this.emoji("create"),
                description: "Create a new role list",
                value: ROLE_SELECT_VALUE_CREATE,
              }] : []),
              ...(this.props.roleLists.map(roleList => {
                return {
                  label: roleList.name,
                  emoji: await this.emoji(roleList.emoji),
                  description: roleList.description,
                  value: roleList.id,
                };
              })),
            ]),
        )
    ];
  }
}

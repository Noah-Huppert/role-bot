import {
  Interaction,
  CommandInteraction,
  SelectMenuInteraction,
} from "discord.js";;

import {
  InteractionHandler,
  CommandMatcher,
  SelectMenuMatcher,
} from "./interaction-registry";
import {
  ViewArgs,
  BaseView,
} from "./base";
import { CommandMatcher } from "../interaction-registry";
import { OnRoleSelectView } from "./on-role-select";

export const ROLE_LIST_CMD = {
  name: "role-lists",
  description: "Edit or create role lists.",
};

/**
 * Role list view actions.
 */
export enum RoleListsViewActions {
  RoleSelect: "@@ROLE_LISTS/ROLE_SELECT",
}

/**
 * Administer select role to edit or create new role.
 */
export class RoleListsView<O = CommandInteraction> extends BaseView<O> implements InteractionHandler<O> {
  constructor(context: ViewArgs) {
    super(context, new CommandMatcher(ROLE_LIST_CMD.name));
  }
  
  children(): InteractionHandler[] {
    return [
      new OnRoleSelectView(this.context), 
    ];
  }
  
  async handle(interaction: O): Promise<void> {
    console.log(`on role-lists admin command, interaction=${interaction}`);
  }
}

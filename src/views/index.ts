import {
  Interaction,
} from "discord.js";
import { ViewArgs } from "./base";
import { InteractionHandler } from "./interaction-registry";
import {
  RoleListsView,
  ROLE_LIST_CMD,
} from "./role-lists";

/**
 * Discord slash command definitions.
 */
export const DISCORD_CMDS = [
  ROLE_LIST_CMD,
];

/**
 * Collect views which users can initialize interactions with the bot via.
 * @param context View context
 * @returns A list of all top level handlers
 */
export function collectHandlers<O = CommandInteraction>(context: ViewArgs): InteractionHandler<O>[] {
  // Collect handlers
  return [
    new RoleListsView(context),
  ];
}

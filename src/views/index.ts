import {
  Interaction,
} from "discord.js";
import {
  ViewArgs,
  BaseView,
} from "./base";
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

type ViewClsType = typeof BaseView & InteractionHandler<Interaction>;

/**
 * Main views with which users can start an interaction.
 */
export const ROOT_VIEWS: ViewClsType[] = [
  RoleListsView,
];

/**
 * Collect views and their sub-handlers recursively.
 * @param context View context
 * @param views List of views to process. If not provided then {@link ROOT_VIEWS} is used
 * @returns A list of all handlers for any actions that could occur in the bot
 */
export function collectHandlers<O extends Interaction>(context: ViewArgs, views?: ViewClsType[]): InteractionHandler<O>[] {
  // Use ROOT_VIEWS by default
  if (!views) {
    return collectHandlers(context, ROOT_VIEWS);
  }

  // Collect handlers
  return views.map(viewCls => new viewCls(context));
}

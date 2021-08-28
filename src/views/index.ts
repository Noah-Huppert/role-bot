import { ViewArgs } from "./base";
import { InteractionHandler } from "./interaction-registry";
import { RoleListsView } from "./role-lists";

/**
 * Main views with which users can start an interaction.
 */
export const ROOT_VIEWS: BaseView[] = [
  RoleListsView
];

export function CollectHandlers(args: ViewArgs): InteractionHandler[] {
  // TODO: collect all base views as handlers, then call .registerHandlers recrusively to get all other base views.
}

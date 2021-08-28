import {
  ViewArgs,
  BaseView,
} from "../base";
import {
  RoleListsViewActions,
} from "./index";
import {
  InteractionHandler,
  SelectMenuMatcher,
} from "../interaction-registry";

/**
 * View which handles a role list option being selected.
 */
export class OnRoleSelectView extends BaseView implements InteractionHandler<SelectMenuInteraction> {
  constructor(context: ViewArgs) {
    super(context);
    this.match = new SelectMenuMatcher(RoleListsViewActions.RoleSelect).match;
  }

  children(): InteractionHandler[] {
    return [];
  }

  async handle(interaction: SelectMenuInteraction): Promise<void> {
    console.log(`on role select, interaction=${interaction}`);
  }
}

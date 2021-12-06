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
export class OnRoleSelectView<O = SelectMenuInteraction> extends BaseView<O> implements InteractionHandler<O> {
  constructor(context: ViewArgs) {
    super(context, new SelectMenuMatcher(RoleListsViewActions.RoleSelect));
  }

  children(): InteractionHandler[] {
    return [];
  }

  async handle(interaction: O): Promise<void> {
    console.log(`on role select, interaction=${interaction}`);
  }
}

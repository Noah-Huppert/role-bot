import {
  ViewArgs,
  BaseView,
} from "../base";
import {
  RoleListsViewActions,
} from "./index";
import {
  SelectMenuMatcher,
} from "../interaction-registry";

/**
 * View which handles a role list option being selected.
 */
export class OnRoleSelectView extends BaseView<SelectMenuInteraction> {
  constructor(context: ViewArgs) {
    super(context);
    this.match = new SelectMenuMatcher(RoleListsViewActions.RoleSelect).match;
  }

  registerHandlers(interaction: Interaction): InteractionHandler[] {
    return [];
  }

  async handle(interaction: SelectMenuInteraction): Promise<void> {
    console.log(`on role select, interaction=${interaction}`);
  }
}

import {
  Interaction,
} from "discord.js";

import {
  InteractionHandler,
  InteractionMatcher,
} from "./interaction-registry";
import {
  BaseComponentArgs,
} from "../components/base";
import { ComponentFactory } from "../components/component-factory"

/**
 * Context provided to views.
 */
export type ViewArgs = {
} & BaseComponentArgs;

/**
 * Provides a pattern for handling multiple Discord interactions in a declarative fashion.
 */
export class BaseView<O extends Interaction> implements InteractionMatcher<O> {
  /**
   * View context.
   */
  context: ViewArgs;

  /**
   * The matcher used to determine if an interaction should be handled by this view.
   */
  matcher: InteractionMatcher<O>,
  
  /**
   * Used to construct components for the view.
   */
  componentFactory: ComponentFactory;

  /**
   * Initialize view.
   * @param context Context needed for view to function
   * @param matcher The matcher used to determine if an interaction should be handled by this view
   */
  constructor(context: ViewArgs, matcher: InteractionMatcher<O>) {
    this.context = context;
    this.matcher = matcher;
  }

  /**
   * Proxy call to the {@link BaseView#matcher}.
   */

  async match(interaction: Interaction): Promise<O | undefined> {
    return this.matcher.match(interaction);
  }
}

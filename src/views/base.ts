import {
  Interaction,
} from "discord.js";

import { InteractionHandler } from "./interaction-registry";
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
export class BaseView {
  /**
   * View context.
   */
  context: ViewArgs;
  
  /**
   * Used to construct components for the view.
   */
  componentFactory: ComponentFactory;

  /**
   * Initialize view.
   * @param context Context needed for view to function
   */
  constructor(context: ViewArgs) {
    this.context = context;
  }
}

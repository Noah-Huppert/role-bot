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
type ViewArgs = {
} & BaseComponentArgs;

/**
 * Provides a pattern for handling multiple Discord interactions in a declarative fashion.
 */
export abstract class BaseView<O extends Interaction> implements InteractionHandler<O> {
    /**
   * Discord API client.
   */
  discordAPI: DiscordClient;

  /**
   * IDs of custom Discord emojis. Keys are emoji names, values are emoji IDs.
   */
  customDiscordEmojiIDs: { [key: string]: string };
  
  /**
   * Used to construct components for the view.
   */
  componentFactory: ComponentFactory;

    /**
   * @returns A list of handlers to process interactions created by the user interacting with this view.
   */
  abstract static registerHandlers(): InteractionHandler[];

  /**
   * Determine if interaction should be handled by this view.
   */
  abstract match(interaction: Interaction): Promise<O | undefined>;

  /**
   * Handle interaction for view.
   */
  abstract handle(interaction: O): Promise<void>;

  /**
   * Initialize view.
   * @param context Context needed for view to function
   */
  constructor(context: ViewArgs) {
    this.discordAPI = context.discordAPI;
    this.customDiscordEmojiIDs = context.customDiscordEmojiIDs;
  }
}

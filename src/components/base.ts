import {
  Client as DiscordClient,
  EmojiIdentifierResolvable,
  MessageActionRow,
  MessageComponentInteraction,
} from "discord.js";

import {
  InteractionHandler,
} from "../views/interaction-registry";

/**
 * The actions map type. Keys should be logical ids used in programming, values are handlers. Values are interaction handlers.
 */
export type ActionsType = { [key: string]: InteractionHandler };

/**
 * Component on which every other component will be based.
 * @typeParam A - Actions map type
 * @typeParam P - Component properties type
 */
export abstract class BaseComponent<A extends ActionsType, P> {
  /**
   * Discord API client.
   */
  discordAPI: DiscordClient;

  /**
   * IDs of custom Discord emojis. Keys are emoji names, values are emoji IDs.
   */
  customDiscordEmojiIDs: { [key: string]: string };

  /**
   * A data structure which can be used to map Discord component interaction events to known constant values.
   */
  actions: A;

  /**
   * Properties which can be provided by users of the component to change its behavior.
   */
  props: P;

  /**
   * Renders child components.
   * @returns Discord components rows.
   */
  abstract render(): Promise<MessageActionRow[]>;

  /**
   * Initializes a component.
   * @param context Context components need to function.
   * @param actions Actions map
   * @param props Properties of component
   */
  constructor(context: BaseComponentArgs, actions: A, props: P) {
    this.discordAPI = context.discordAPI;
    this.customDiscordEmojiIDs = context.customDiscordEmojiIDs;
    
    this.actions = actions;
    this.props = props;
  }

  /**
   * Fetch Discord emoji by name. Incorporates custom emoji names.
   * @param name Emoji name.
   * @returns The emoji if it exists.
   */
  async emoji(name: string): Promise<EmojiIdentifierResolvable | undefined> {
    // Check if custom emoji
    if (Object.keys(this.customDiscordEmojiIDs).includes(name)) {
      return await this.discordAPI.emojis.cache.find(emoji => emoji.id === this.customDiscordEmojiIDs[name])?.toString();
    }

    // Check if normal emoji
    return this.discordAPI.emojis.cache.find(emoji => emoji.name === name)?.toString();
  }
}

export type BaseComponentArgs = {
  /**
   * Discord API client.
   */
  discordAPI: DiscordClient;

  /**
   * IDs of custom Discord emojis. Keys are custom emoji names, values are IDs.
   */
  customDiscordEmojiIDs: { [key: string]: string };
}

import {
  Client as DiscordClient,
  EmojiIdentifierResolvable,
  MessageActionRow,
} from "discord.js";

/**
 * Component on which every other component will be based.
 */
export abstract class BaseComponent {
  /**
   * Discord API client.
   */
  discordAPI: DiscordClient;

  /**
   * IDs of custom Discord emojis. Keys are emoji names, values are emoji IDs.
   */
  customDiscordEmojiIDs: { [key: string]: string };

  /**
   * Renders child components.
   */
  abstract render(): Promise<MessageActionRow[]>;

  constructor(args: BaseComponentArgs) {
    this.discordAPI = args.discordAPI;
    this.customDiscordEmojiIDs = args.customDiscordEmojiIDs;
  }

  /**
   * Fetch Discord emoji by name. Incorporates custom emoji names.
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

export class ComponentFactory {
  /**
   * Arguments which base components need for their constructors.
   */
  args: BaseComponentArgs;

  constructor(args: BaseComponentArgs) {
    this.args = args;
  }

  async hydrate(cls: new (args: BaseComponentArgs) => BaseComponent): Promise<MessageActionRow[]> {
    const component = new cls(this.args);
    return await component.render();
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

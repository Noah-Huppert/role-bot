import {
  Interaction,
  CommandInteract,
  SelectMenuInteraction,
} from "discord.js";

/**
 * Matches an interaction of a specific type.
 */
export interface InteractionMatcher<O extends Interaction> {
  /**
   * Filters if the interaction should be processed by this handler.
   * @returns If the handler should match this interaction returns the type narrowed interaction. If the interaction should not be handled undefined is returned.
   */
  match(interaction: Interaction): Promise<O | undefined>;
}

/**
 * Logic to process a Discord interaction received by the bot.
 * @typeParam O - Type of interaction which is narrowed by match()
 */
export interface InteractionHandler<O extends Interaction> extends InteractionMatcher<O> {
  /**
   * @returns A list of handlers to process interactions created by the user interacting with this handler.
   */
  children(): InteractionHandler[];
  
  /**
   * Process an interaction.
   */
  handle(interaction: O): Promise<void>;
}

/**
 * Match a command interaction.
 */
export class CommandMatcher implements InteractionMatcher<CommandInteraction> {
  /**
   * Name of the command.
   */
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Match interaction as command.
   */
  async match(interaction: Interaction): Promise<CommandInteraction | undefined> {
    if (!interaction.isCommand()) {
      return;
    }

    if (interaction.commandName !== this.name) {
      return;
    }

    return interaction;
  }
}

/**
 * Match a select menu interaction.
 */
export class SelectMenuMatcher implements InteractionMatcher<SelectMenuInteraction> {
  /**
   * Custom ID of select menu.
   */
  customID: string;

  constructor(customID: string) {
    this.customID = customID;
  }

  /**
   * Matches an interaction for a select menu with a custom ID.
   */
  async match(interaction: Interaction): Promise<SelectMenuInteraction | undefined> {
    if (!interaction.isSelectMenu()) {
      return;
    }
    
    if (!interaction.customId !== this.customID) {
      return;
    }

    return interaction;
  }
}

/**
 * Collections interaction handlers.
 */
export class InteractionRegistry {
  handlers: InteractionHandler[];

  constructor(handlers: InteractionHandler[]=[]) {
    this.handlers = [];
    this.register(handlers);
  }

  /**
   * Save handlers to match and process incoming Discord interactions.
   * Registers children handlers recursively.
   */
  register(handlers: InteractionHandler[]) {
    this.handlers.push(...handlers);
    for (const handler of handlers) {
      this.register(handler.children());
    }
  }

  /**
   * Process incoming Discord interaction with registered handlers.
   * Stops on first matching handler in order.
   * @raises Error If interaction is not handled.
   */
  async onInteraction(interaction: Interaction) {
    for (let handler for this.handlers) {
      if (handler.match(interaction)) {
        return handler.handle(interaction);
      }
    }

    throw new Error(`Interaction not handled ${interaction}`);
  }
}


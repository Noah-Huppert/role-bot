import {
  SlashCommandBuilder,
  SlashCommandStringOption,
} from "@discordjs/builders";
import { Routes as DiscordRESTRoutes } from "discord-api-types/v9";
import { REST as DiscordREST } from "@discordjs/rest";
import {
  Client as DiscordClient,
  Intents as DiscordIntents,
  CommandInteraction,
  SelectMenuInteraction,
  ButtonInteraction,
} from "discord.js";

import { RoleManager } from "../../roles";

import { CreateRoleListDescriber } from "./create-role-list";

/**
 * Object which handles a Discord command interaction.
 */
export interface CommandHandler {
  /**
   * Function which will process a Discord API command interaction when it is created.
   */
  onCommand: (cmd: CommandInteraction) => Promise<void>;
};

/**
 * {@link CommandDescription} fields without type tag.
 */
type CommandDescriptionSpec = {
    /**
   * String user types to invoke command.
   */
  name: string;

  /**
   * User friendly short description of the interaction.
   */
  description: string;

  /**
   */
  arguments?: CommandDescriptionArgument[],

  /**
   * Factory method to create a CommandHandler.
   */
  factory(): CommandHandler;
}

/**
 * A type of argument used in a command description.
 */
type CommandDescriptionArgument = CommandDescriptionStringArgument;

/**
 * A command string argument.
 */
type CommandDescriptionStringArgument = {
  /**
   * Indicates the type of the argument.
   */
  type: "string";
} & CommandDescriptionStringArgumentSpec;


/**
 * {@link CommandDescriptionStringArgument}
 */
type CommandDescriptionStringArgumentSpec = {
  /**
   * True if the argument must be provided.
   */
  required: boolean;

  /**
   * The name of the argument.
   */
  name: string;

  /**
   * Description of the argument.
   */
  description: string;
};

/**
 * Describes a Discord interaction command and provides logic for its handling.
 */
export type CommandDescription = {
  /**
   * Type of interaction, indicates it is a command.
   */
  type: "command";
} & CommandDescriptionSpec;

/**
 * Create a new CommandDescription.
 * @param spec - Data fields of the CommandDescription.
 * @returns Command description fields provided with a type tag added.
 */
export function newCommandDescription(spec: CommandDescriptionSpec): CommandDescription {
  return {
    type: "command",
    ...spec,
  };
}

/**
 * Checks if a InteractionDescription is of type CommandDescription.
 */
export function isCommandDescription(desc: InteractionDescription): desc is CommandDescription {
  return desc.type === "command";
}

/**
 * Create a new CommandDescriptionStringArgument.
 * @param spec - Data fields of a CommandDescriptionStringArgument.
 * @returns Command description argument string fields provided with a type tag added.
 */
export function newCommandDescriptionStringArgument(spec: CommandDescriptionStringArgumentSpec): CommandDescriptionStringArgument {
  return {
    type: "string",
    ...spec,
  };
}

/**
 * Checks if CommandDescriptionArgument is a CommandDescriptionStringArgument.
 */
export function isCommandDescriptionStringArgument(arg: CommandDescriptionArgument): arg is CommandDescriptionStringArgument {
  return arg.type === "string";
}

/**
 * Object which handles a Discord select menu interaction.
 */
export interface SelectMenuHandler {
  /**
   * Function which will process a Discord API select menu interaction when it is created.
   */
  onSelectMenu: (cmd: SelectMenuInteraction) => Promise<void>;
};

/**
 * {@link SelectMenuDescription} fields without type tag.
 */
type SelectMenuDescriptionSpec = {
  /**
   * A logical ID defined by this application which indicates which select menu the interaction was generated by.
   */
  customID: string;

  /**
   * Factory method to create a SelectMenuHandler.
   */
  factory(): SelectMenuHandler;
}

/**
 * Describes a Discord select menu interaction and provides logic for its handling.
 */
export type SelectMenuDescription = {
  /**
   * Type of interaction, indicates it is a select menu interaction.
   */
  type: "select_menu";
} & SelectMenuDescriptionSpec;


/**
 * Create a new SelectMenuDescription.
 * @param spec - Data fields of the SelectMenuDescription.
 * @returns Select menu description fields provided with a type tag added.
 */
export function newSelectMenuDescription(spec: SelectMenuDescriptionSpec): SelectMenuDescription {
  return {
    type: "select_menu",
    ...spec,
  };
}

/**
 * Checks if a InteractionDescription is of type SelectMenuDescription.
 */
export function isSelectMenuDescription(desc: InteractionDescription): desc is SelectMenuDescription {
  return desc.type == "select_menu";
}

/**
 * Object which handles a Discord button interaction.
 */
export interface ButtonHandler {
  /**
   * Function which will process a Discord API button interaction when it is created.
   */
  onButton: (cmd: ButtonInteraction) => Promise<void>;
};

/**
 * {@link ButtonDescription} with type tag field.
 */
type ButtonDescriptionSpec = {
  
  /**
   * A logical ID defined by this application which indicates which button the interaction was generated by.
   */
  customID: string;
  
  /**
   * Factory method to create a ButtonHandler.
   */
  factory(): ButtonHandler;
};

/**
 * Describes a Discord button interaction command and provides logic for its handling.
 */
export type ButtonDescription = {
  /**
   * Type of interaction, indicates it is a button interaction.
   */
  type: "button";
} & ButtonDescriptionSpec;


/**
 * Create a new ButtonDescription.
 * @param spec - Data fields of the ButtonDescription.
 * @returns Button description fields provided with a type tag added.
 */
export function newButtonDescription(spec: ButtonDescriptionSpec): ButtonDescription {
  return {
    type: "button",
    ...spec,
  };
}

/**
 * Checks if a InteractionDescription is of type ButtonDescription.
 */
export function isButtonDescription(desc: InteractionDescription): desc is ButtonDescription {
  return desc.type == "button";
}

/**
 * A handler for a certain type of interaction.
 */
export type InteractionDescription = CommandDescription | SelectMenuDescription | ButtonDescription;

/**
 * Is able to provide metadata about an InteractionDescription.
 */
export interface HandlerDescriber {
  /**
   * @returns A description of what Discord interactions to respond and how to handle the interaction.
   */
  getHandlerDescriptions(): InteractionDescription[];
}

/**
 * Discord API configuration for behavior and authentication.
 */
export interface DiscordConfig {
  /**
   * Discord API credentials client ID.
   */
  clientID: string;

  /**
   * Discord API authentication token.
   */
  apiToken: string;

  /**
   * Discord IDs of servers (aka guilds) which the bot should act within.
   * Keys are nicknames of the servers. Values are the guild IDs.
   */
  guildIDs: { [key: string]: string };

  /**
   * The Discord ID of the server which will own custom emojis.
   */
  emojiGuildID: string;
}

export class DiscordAdapter {
  /**
   * Discord API configuration.
   */
  config: DiscordConfig;

  /**
   * The port used to manage roles.
   */
  roleManager: RoleManager;

  /**
   * Creates a DiscordAdapter.
   * @param config - Discord configuration.
   * @param roleManager - The role manager used by adapter.
   */
  constructor({
    config,
    roleManager,
  }: {
    config: DiscordConfig,
    roleManager: RoleManager;
  }) {
    this.config = config;
    this.roleManager = roleManager;
  }

  /**
   * Discord interaction to which Discord adapater will respond.
   */
  getInteractionDescriptions(): InteractionDescription[] {
    const describers = [
      new CreateRoleListDescriber({
        roleManager: this.roleManager,
      }),
    ];

    let allDescs: InteractionDescription[] = [];

    for (let desc of describers) {
      allDescs.push(...desc.getInteractionDescriptions());
    }

    return allDescs;
  }
  
  /**
   * Sets up a Discord API client listen for Discord interaction events.
   */
  async setup(): Promise<void> {
    const interactionDescs = this.getInteractionDescriptions();

    const cmdDescs = interactionDescs.filter(isCommandDescription);
    const selectMenuDescs = interactionDescs.filter(isSelectMenuDescription);
    const buttonDescs = interactionDescs.filter(isButtonDescription);

    const cmdDescsByName: { [key: string]: CommandDescription } = {};
    const selectMenuDescsByCustomID: { [key: string]: SelectMenuDescription } = {};
    const buttonDescsByCustomID: { [key: string]: ButtonDescription } = {};

    cmdDescs.forEach((desc) => cmdDescsByName[desc.name] = desc);
    selectMenuDescs.forEach((desc) => selectMenuDescsByCustomID[desc.customID] = desc);
    buttonDescs.forEach((desc) => buttonDescsByCustomID[desc.customID] = desc);

    // Set the commands to display in Discord
    const slashCmds = cmdDescs.map((cmd) => {
      const builder = new SlashCommandBuilder();
      
      builder.setName(cmd.name);
      builder.setDescription(cmd.description);

      if (cmd.arguments !== undefined) {
        cmd.arguments.forEach((arg) => {
          if (isCommandDescriptionStringArgument(arg)) {
            const argBuilder = new SlashCommandStringOption();
            argBuilder.setName(arg.name);
            argBuilder.setDescription(arg.description);
            argBuilder.setRequired(arg.required)

            builder.addStringOption(argBuilder)
            ;
          }
        });
      }

      return builder;
    });
    const cmdsJSON = slashCmds.map((cmd) => cmd.toJSON());

    const discordREST = new DiscordREST({ version: "9" }).setToken(this.config.apiToken);

    await Promise.all(Object.values(this.config.guildIDs).map(async (guildID) => {
      console.log(`Setup Discord commands for ${guildID}`);
      await discordREST.put(DiscordRESTRoutes.applicationGuildCommands(this.config.clientID, guildID), { body: cmdsJSON });
    }));

    // Setup handler for commands
    const discordClient = new DiscordClient({ intents: [ DiscordIntents.FLAGS.GUILDS ] });

    // Wait for Discord client to be ready
    discordClient.on("interactionCreate", async (interaction) => {
      // If a command interaction
      if (interaction.isCommand()) {
        const matched = cmdDescsByName[interaction.commandName];
        
        let handler = matched.factory();
        handler.onCommand(interaction);
      } else if (interaction.isSelectMenu()) { // If a select menu interaction
        const matched = selectMenuDescsByCustomID[interaction.customId];

        let handler = matched.factory();
        handler.onSelectMenu(interaction);
      } else if (interaction.isButton()) { // If a button interaction
        const matched = buttonDescsByCustomID[interaction.customId];

        let handler = matched.factory();
        handler.onButton(interaction);
      }
    });

    discordClient.login(this.config.apiToken);
  }
}

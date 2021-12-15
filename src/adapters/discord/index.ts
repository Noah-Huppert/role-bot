import { Command } from "./definitions";
import {
  Client as DiscordClient,
  Intents as DiscordIntents,
  Interaction as DiscordInteraction,
} from "discord.js";
import { DiscordREST } from "@discordjs/rest";

import { DiscordCommandAdapter } from "./commands.ts";
import { RolesPort } from "../ports/roles.ts"

/**
 * Discord bot permissions for normal servers which us te bot.
 * 
 * Permissions:
 * - General permissions
 *   - Manage roles
 * - Text permissions
 *   - Use external emojis
 *   - Use slash commands
 */
const DISCORD_NORMAL_INVITE_PERMS = 2416181248;

/**
 * Discord bot permissions for the emoji management server.
 * 
 * Permissions:
 * - General permissions
 *   - Manage roles
 *   - Manage Emojis and Stickers
 * - Text permissions
 *   - Use external emojis
 *   - Use slash commands
 */
const DISCORD_EMOJI_INVITE_PERMS = 3489923072;

/**
 * Scopes required for OAuth.
 */
const DISCORD_OAUTH_SCOPES = [
  "applications.commands",
  "bot",
];

/**
 * The interface between this software's internal representation of commands and the Discord API.
 */
class DiscordAdapter {
  /**
   * The client ID of Discord.
   */
  discordClientID: string;

  /**
   * IDs of Discord guilds the adapter should call the command port.
   */
  discordGuildIDs: string[];

  /**
   * Discord standard API client.
   */
  discordAPI: DiscordClient;

  /**
   * Command definitions.
   */
  commands: Command[];

  /**
   * Command adapter.
   */
  discordCommandAdapater: DiscordCommandAdapater;

  /**
   * Initialize the manager.
   * @param discordClientID - Value of {@link discordClientID}
   */
  constructor({
    discordClientID,
    discordAPIToken,
    discordGuildIDs,
  }: {
    discordClientID: string;
    discordAPIToken: string;
    discordGuildIDs: string[];
  }) {
    // Setup Discord API
    this.discordClientID = discordClientID;
    this.discordGuildIDs = discordGuildIDs;
    
    this.discordAPI = new DiscordClient({
      intents: [
        DiscordIntents.FLAGS.GUILDS,
      ],
    });
    this.discordAPI.on("ready", this.onDiscordReady.bind(this));
    this.discordAPI.on("interactionCreate", this.onDiscordInteraction.bind(this));
    this.discordAPI.login(discordAPIToken);

    // Setup sub-adapters
    this.discordCommandAdapater = new DiscordCommandAdapater({
      discordGuildIDs,
      discordAPIToken,
      commands: [],
    });
  }

  /**
   * Setup this adapters connection to the Discord API.
   */
  async setup(): Promise<void> {
    // Inform user of Discord guild specific authentication requirements
    console.log(`For normal use of the Discord bot invite it with this link:
${this.discordInviteLink(DISCORD_NORMAL_INVITE_PERMS, DISCORD_OAUTH_SCOPES)}
`);
    await this.discordCommandAdapter.setup();
  }
  
  /**
   * Constructs a Discord bot invite link.
   */
  discordInviteLink(permissions: number, scopes: string[]): string {
    return`https://discord.com/api/oauth2/authorize?client_id=${this.cfg.discord.clientID}&scope=${encodeURIComponent(scopes.join(" "))}&permissions=${permissions}`;
  }

  /**
   * Handles when the Discord API client has logged in.
   */
  onDiscordReady() {
    console.log("Discord API ready");
    // this.discordAPI.guilds.cache.first(1)[0].emojis.cache.each(e => console.log(e.name));
  }

  /**
   * Handles a new Discord interaction.
   */
  async onDiscordInteraction(interaction: DiscordInteraction) {
    console.log(`Received interaction: ${interaction}`);

    // Ensure for a guild we are serving
    if (!interaction?.guildId || !Object.values(this.discordGuildIDs).includes(interaction.guildId)) {
      // Not responding for this guild
      return;
    }

    // Handle interaction
    if (interaction.isCommand()) {
      await this.discordCommandAdapater.onCommandInteraction(interaction);
    }
  }
}

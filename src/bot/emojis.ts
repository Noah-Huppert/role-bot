/**
 * Directory in which custom Discord emoji files reside.
 */
const CUSTOM_DISCORD_EMOJIS_DIR = path.resolve(path.join(__dirname, "/../assets/custom-emojis"));

/**
 * Custom emoji type definition.
 */
type CustomDiscordEmojiDef = {
  /**
   * File path relative to CUSTOM_DISCORD_EMOJIS_DIR which points to an emoji image.
   */
  file: string;
};

/**
 * List of custom emoji details.
 */
export const CUSTOM_DISCORD_EMOJIS: { [key: string]: CustomDiscordEmojiDef } = {
  /**
   * Icon used to convey the creation of a resource.
   */
  "create": {
    file: "create.png",
  },
};

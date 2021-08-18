import {
  MessageActionRow,
  MessageSelectMenu,
} from "discord.js";

export const SELECT_ID = "select-role";

/**
 * View which lets user select which role list to edit.
 */
export function SelectRoleListView(): MessageActionRow[] {
  return [
    new MessageActionRow()
      .addComponents(
        new MessageSelectMenu()
          .setCustomId(SELECT_ID)
          .setPlaceholder("Select role list to edit, or create new one.")
          .addOptions([
            {
              label: "Choice 1",
              description: "Description of thing",
              value: "choice_1",
            }
          ]),
      )
  ];
}

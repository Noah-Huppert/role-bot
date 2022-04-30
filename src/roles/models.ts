/**
 * A role to be managed by the bot.
 */
export interface Role {
  /**
   * Unique internal identifier for the role.
   */
  id: string;

  /**
   * Name of role.
   */
  name: string;
}

/**
 * A list of roles.
 */
export interface RoleList {
  /**
   * Unique internal identifier.
   */
  id: string;

  /**
   * Title of list.
   */
  name: string;

  /**
   * Short blurb about the purpose of the list.
   */
  description: string;
}

/**
 * Membership of role in role list.
 */
export interface RoleListRole {
  /**
   * Unique identifier of join table row.
   */
  id: string;

  /**
   * ID of role list.
   */
  roleListID: string;

  /**
   * ID of role.
   */
  roleID: string;

  /**
   * Emoji which is used to represent role in role list.
   */
  emoji: string;
}

/**
 * A role to be managed by the bot.
 */
export type Role {
  /**
   * Name of role.
   */
  name: string;

  /**
   * Description of role.
   */
  description: string;
}

/**
 * Port for managing roles.
 */
export interface RoleManager {
  /**
   * Provide a list of all the roles which exist within the system.
   */
  async listRoles(): Promise<Role[]>;
}

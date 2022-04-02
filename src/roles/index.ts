import {
  Result,
  Ok,
  Err,
} from "ts-results";

/**
 * A role to be managed by the bot.
 */
export interface Role {
  /**
   * Unique internal identifier for the role.
   */
  id: string;

  /**
   * Single emoji which represents role.
   */
  emoji: string;
  
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
 * Port for managing roles and role lists.
 */
export interface RoleListManager {
  /**
   * Provide a list of all the role lists.
   * @returns Array of role lists.
   */
  listRoleLists(): Promise<ListRoleListsResult>;

  /**
   * Make a new role list.
   * @param roleList - The new role list to create. The id field will be ignored.
   * @returns Role list creation result.
   */
  createRoleList(roleList: RoleList): Promise<CreateRoleListResult>;
}

/**
 * Result of the list role lists operation.
 */
export type ListRoleListsResult = Result<RoleList[], string>;

/**
 * Result of a role list creation attempt.
 */
export type CreateRoleListResult = Result<RoleList, string>;

/**
 * Stores and retrieves roles.
 */
export interface RoleListRepository {
  /**
   * Get role lists by IDs.
   * @param roleListIDs - IDs of role lists to retrieve, or null to retrieve them all.
   * @returns Role lists specified by arguments.
   */
  listRoleLists(roleListIDs: string[] | null): Promise<Result<RoleList[], string>>;
}

/**
 * RoleRepository implementation using a Postgres database.
 */
export class PGRoleListRepository implements RoleListRepository {
  async listRoleLists(roleListIDs: string[] | null): Promise<Result<RoleList[], string>> {
    return Ok([]);
  }
}

/**
 * RoleManager implementation.
 */
export class RoleListManagerImpl implements RoleListManager {
  /**
   * A repository used to store and retrieve roles and role lists.
   */
  roleListRepo: RoleListRepository;

  constructor({
    roleListRepo,
  }: {
    readonly roleListRepo: RoleListRepository,
  }) {
    this.roleListRepo = roleListRepo;
  }

  async listRoleLists(): Promise<ListRoleListsResult> {
    return Ok([]);
  }

  async createRoleList(roleList: RoleList): Promise<CreateRoleListResult> {
    return Ok(roleList);
  }
}

import {
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
} from "ts-results";
import { Client as PGClient } from "ts-postgres";

import { PostgresConfig } from "../config";

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

  /**
   * Store a new role list.
   * @param roleList - New role list to create. The id field will be ignored.
   * @returns New role list with id field set.
   */
  createRoleList(roleList: RoleList): Promise<Result<RoleList, string>>;

  
  /**
   * Get the roles which are part of a role list.
   * @param roleListId - ID of the role list for which to get roles.
   * @returns Role list role membership join entities.
   */
  listRoleListRoles(roleListID: string): Promise<Result<RoleListRole[], string>>;
}

/**
 * RoleRepository implementation using a Postgres database.
 */
export class PGRoleListRepository implements RoleListRepository {
  /**
   * Details about how to connect to the database and where to store data.
   */
  cfg: PostgresConfig;

  /**
   * The database connection. Singleton which should be accessed via db.
   */
  _db: Option<PGClient>;

  /**
   * Initializes a PGRoleListRepository.
   * @param cfg - {@link cfg}
   */
  constructor(cfg: PostgresConfig) {
    this.cfg = cfg;
    this._db = None;
  }

  /**
   * Access the db singleton. Creates a database connection if not already made.
   * @returns Promise which resolves with database client.
   */
  async db(): Promise<PGClient> {
    if (this._db.some) {
      // Database client already made
      return this._db.val;
    } else {
      // No database connection yet, create one and save
      const db = new PGClient({
        ...this.cfg,
      });

      this._db = Some(db);

      return db;
    }
  }
  
  
  async listRoleLists(roleListIDs: string[] | null): Promise<Result<RoleList[], string>> {
    return Ok([]);
  }

  async createRoleList(roleList: RoleList): Promise<Result<RoleList, string>> {
    return Ok(roleList);
  }

  async listRoleListRoles(roleListID: string): Promise<Result<RoleListRole[], string>> {
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
    const res = await this.roleListRepo.listRoleLists(null);

    // Error
    if (!res.ok) {
      console.error("Failed to list role lists, repository error: ", res.val);
      
      return Err("Failed to retrieve role lists.");
    }

    // Success
    return Ok(res.val);
  }

  async createRoleList(roleList: RoleList): Promise<CreateRoleListResult> {
    const res = await this.roleListRepo.createRoleList(roleList);

    // Error
    if (!res.ok) {
      console.error("Failed to create new role list, repository error: ", res.val);

      return Err("Failed to store new role list.");
    }

    // Success
    return Ok(res.val);
  }
}

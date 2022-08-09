import {
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
} from "ts-results";

import { RoleList } from "./models";
import {
  RoleListRepository,
  RoleListSummary,
} from "./repo";

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
export type ListRoleListsResult = Result<RoleListSummary[], string>;

/**
 * Result of a role list creation attempt.
 */
export type CreateRoleListResult = Result<RoleList, string>;


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
    // Get role lists
    const res = await this.roleListRepo.summarizeRoleLists(null);
    if (!res.ok) {
      console.error("Failed to list role lists, repository error: ", res.val);
      
      return Err("Failed to retrieve role lists.");
    }

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

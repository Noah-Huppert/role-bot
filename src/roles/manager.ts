import {
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
} from "ts-results";

import { RoleList } from "./models";
import { RoleListRepository } from "./repo";

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
 * Provides an overview of a role list.
 */
export type RoleListSummary = RoleList & {
  /**
   * The number of roles the list contains.
   */
  numberRoles: number;
};

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
    const listRolesRes = await this.roleListRepo.listRoleLists(null);
    if (!listRolesRes.ok) {
      console.error("Failed to list role lists, repository error: ", listRolesRes.val);
      
      return Err("Failed to retrieve role lists.");
    }

    // Get role counts
    const countRolesRes = await this.roleListRepo.countRolesForRoleLists(null);
    if (!countRolesRes.ok) {
      console.error("Failed to get role counts for role lists, repository error: ", countRolesRes.val);

      return Err("Failed to retrieve count of roles for each role list.");
    }

    // Combine results
    return Ok(listRolesRes.val.map((roleList) => {
      return {
        ...roleList,
        numberRoles: countRolesRes.val[roleList.id] || 0,
      };
    }));
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

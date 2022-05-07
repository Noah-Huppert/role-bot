import {
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
} from "ts-results";

import {
  RoleList,
  RoleListRole,
} from "./models";
import {
  db,
  pool,
  schema,
} from "../pg";

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
   * Counts the number of roles which are part of each role list.
   * @param roleListIDs - IDs of role lists for which to get role counts, or null to retrieve for all role lists.
   * @returns A count of the roles for each role list. If a list does not have any roles then its key in the result will be undefined.
   */
  countRolesForRoleLists(roleListIDs: string[] | null): Promise<Result<RoleListRoleCounts, string>>;

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
 * Count of the number of roles in each role list.
 * Keys are role list IDs.
 * Values are counts of roles in that role list.
 */
export type RoleListRoleCounts = { [key: string]: number };

/**
 * RoleRepository implementation using a Postgres database.
 */
export class PGRoleListRepository implements RoleListRepository {
  async listRoleLists(roleListIDs: string[] | null): Promise<Result<RoleList[], string>> {
    // Determine if getting specific role lists or all of them
    const query = (() => {
      if (roleListIDs === null) {
        // Getting all role lists
        return db.sql<schema.role_list.SQL, schema.role_list.Selectable[]>`SELECT id, name, description FROM role_list`;
      } else {
        // Getting specific role lists
        return db.sql<db.ColumnValues<string[]>, schema.role_list.Selectable[]>`
SELECT id, name, description 
FROM role_list
WHERE id IN ${db.vals(roleListIDs)}`;
      }
    })();

    const res = await query.run(pool);
    return Ok(res.map((row) => {
      return {
        ...row,
        id: row.id.toString(),
      };
    }));
  }

  async countRolesForRoleLists(roleListIDs: string[] | null): Promise<Result<RoleListRoleCounts, string>> {
    // Determine if getting counts for specific role lists or all
    const query = (() => {
      if (roleListIDs === null) {
        // Getting counts for all role lists
        return db.sql<void, { role_list_id: number, role_count: number }[]>`
SELECT
  role_list.id as role_list_id,
  COUNT(role_list_roles.id) as role_count
FROM role_list
JOIN role_list_roles ON role_list_roles.role_list_id = role_list.id
GROUP BY role_list.id
`;
      } else {
        // Getting counts for specific role lists
        return db.sql<db.ColumnValues<string[]>, { role_list_id: number, role_count: number }[]>`
SELECT
  role_list.id as role_list_id,
  COUNT(role_list_roles.id) as role_count
FROM role_list
JOIN role_list_roles ON role_list_roles.role_list_id = role_list.id
WHERE role_list.id IN ${db.vals(roleListIDs)}
GROUP BY role_list.id
`;
      }
    })();

    // Query
    const res = await query.run(pool);
    const counts: RoleListRoleCounts = {};
    res.forEach((row) => {
      counts[row.role_list_id] = row.role_count;
    });

    return Ok(counts);
  }

  async createRoleList(roleList: RoleList): Promise<Result<RoleList, string>> {
    const roleListIns = {
      name: roleList.name,
      description: roleList.description,
    };
    
    const query = db.sql<schema.role_list.SQL, schema.role_list.Selectable[]>`
INSERT INTO role_list (name, description) VALUES (${db.vals(roleListIns)}) RETURNING id`;
    const res = await query.run(pool);
    if (res.length !== 1) {
      return Err(`Expected 1 row to be returned from insert, got ${res.length}`);
    }
    
    return Ok({
      ...roleList,
      id: res[0].id.toString(),
    });
  }

  async listRoleListRoles(roleListID: string): Promise<Result<RoleListRole[], string>> {
//     const query = db.sql<schema.role_list_membership.SQL, schema.role_list_membership.Selectable[]>`
// SELECT
//   role_list_roles.id,
//   role_list_roles.role_id,
//   role_list_roles.role_list_id,
  
    // `;
    // ^^^ wip join query
    return Ok([]);
  }
}

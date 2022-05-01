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
import { db } from "../pg";

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
  async listRoleLists(roleListIDs: string[] | null): Promise<Result<RoleList[], string>> {
    console.log(db);
//     const db = await this.db();

//     // Determine if getting specific role lists or all of them
//     const query = (() => {
//       if (roleListIDs === null) {
//         // Getting all role lists
//         return new PGQuery("SELECT id, name, description FROM role_list");
//       } else {
//         // Getting specific role lists
//         return new PGQuery(`
// SELECT id, name, description 
// FROM role_list
// WHERE id IN $1`, [roleListIDs]);
//       }
//     })();

//     // Map results
//     const res = await db.execute(query);
//     const roleLists = [...res].map((row) => {
//       console.log(row);
//       // return {
//       //   id: row.get<number>("id")!,
//       //   name: row.get<string>("name")!,
//       //   description: row.get<string>("description")!,
//       // };
//     });

    return Ok([]);
  }

  async createRoleList(roleList: RoleList): Promise<Result<RoleList, string>> {
    // const db = await this.db();
    
    // const query = new PGQuery("INSERT INTO role_list (name, description) VALUES ($1, $2) RETURNING id",
    //                           [roleList.name, roleList.description]);

    // const res = await db.execute(query);
    // if (res.rows.length !== 1) {
    //   return Err(`Expected 1 row returned by insert query, got: ${res.rows.length}`);
    // }

    // return Ok({
    //   ...roleList,
    //   id: res.rows[0].id
    // });
    return Ok(roleList);
  }

  async listRoleListRoles(roleListID: string): Promise<Result<RoleListRole[], string>> {
    return Ok([]);
  }
}

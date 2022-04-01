import {
  Result,
  Ok,
  Err,
} from "ts-results";

/**
 * A role to be managed by the bot.
 */
export type Role = {
  /**
   * Unique internal identifier for the role.
   */
  id: string;
  
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
  listRoles(): Promise<RoleDescription[]>;

  /**
   * Make a new role.
   * @param role - The new role to create. The id field will be ignored.
   * @returns Role creation result.
   */
  createRole(role: Role): Promise<CreateRoleResult>;
}

/**
 * Result of a role creation attempt.
 */
export type CreateRoleResult = Result<{
  /**
   * The role that was created, null if the role creation failed.
   */
  role: Role;

  /**
   * A role description for the role.
   */
  roleDesc: RoleDescription;
}, {
  /**
   * Error message if not a success. Null if success.
   */
  error: string;
}>;

/**
 * User focused description of a role.
 */
export interface RoleDescription {
  /**
   * Name of the role.
   */
  name: string;

  /**
   * Short blurb providing context about the role.
   */
  tagline: string;
}

/**
 * Stores and retrieves roles.
 */
export interface RoleRepository {
  /**
   * Get roles by ID.
   * @param roleIDs - IDs of roles to fetch, if null then get all Roles.
   * @returns List of roles as requested by roleIDs.
   */
  getRoles(roleIDs: string[] | null): Promise<Role[]>;

  /**
   * Store a new role list.
   * @param role - The new role to create. The id field will be ignored. the repository will internally assign an ID.
   * @returns The new role, with its id field filled in.
   */
  createRole(role: Role): Promise<Role>;
}

/**
 * RoleRepository implementation using a Postgres database.
 */
export class PGRoleRepository implements RoleRepository {
  async getRoles(roleIDs: string[] | null): Promise<Role[]> {
    return [];
  }

  async createRole(role: Role): Promise<Role> {
    return {
      ...role,
      id: "id",
    }
  }
}

/**
 * RoleManager implementation.
 */
export class RoleManagerImpl implements RoleManager {
  /**
   * A repository used to store and retrieve roles.
   */
  roleRepo: RoleRepository;

  constructor({
    roleRepo,
  }: {
    readonly roleRepo: RoleRepository,
  }) {
    this.roleRepo = roleRepo;
  }

  /**
   * Maps a role to a role description.
   * @param role - The role to convert.
   * @returns Role description for the role.
   */
  roleToDesc(role: Role): RoleDescription {
    return {
      name: role.name,
      tagline: role.description,
    };
  }
  
  async listRoles(): Promise<RoleDescription[]> {
    const roles = await this.roleRepo.getRoles(null);
    
    return roles.map((role) => this.roleToDesc(role));
  }

  async createRole(role: Role): Promise<CreateRoleResult> {
    const newRole = await this.roleRepo.createRole(role);

    return Ok({
      role: newRole,
      roleDesc: this.roleToDesc(newRole),
    });
  }
}

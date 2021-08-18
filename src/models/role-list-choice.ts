import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
} from "typeorm";

import { RoleList } from "./role-list";

/**
 * A potential choice within a role list. Maps a Discord reaction to a role which will be assigned to the reacting user.
 */
@Entity()
export class RoleListChoice {
  /**
   * Unique identifier.
   */
  @PrimaryColumn()
  id: number;

  /**
   * Friendly name which will be displayed to users.
   */
  @Column()
  name: string;

  /**
   * List to which choice belongs.
   */
  @ManyToOne(() => RoleList, list => list.choices)
  list: RoleList;
}

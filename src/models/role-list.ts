import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
} from "typeorm";

import { RoleListChoice } from "./role-list-choice";

/**
 * A message within a Discord server which lists a series of roles and their associated purposes. Users can then react to this message with an emoji associated with each role.
 */
@Entity()
export class RoleList {
  /**
   * Unique identifier.
   */
  @PrimaryColumn()
  id: number;

  /**
   * ID of Discord emoji to show for list.
   */
  @Column()
  emoji: string;

  /**
   * Friendly name which will be displayed to users.
   */
  @Column()
  name: string;

  /**
   * Summary of the purpose of the list for users to read.
   */
  @Column()
  description: string;

  /**
   * Roles which user can select from the list.
   */
  @OneToMany(() => RoleListChoice, choice => choice.role_list)
  choices: RoleListChoice[];
}

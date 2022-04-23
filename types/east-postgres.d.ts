declare module "east-postgres" {
  import { Client } from "pg";
  export type EastPGClient = {
    db: Client,
  };
}

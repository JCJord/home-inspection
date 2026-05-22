import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1779483137421 implements MigrationInterface {
    name = ' $npmConfigName1779483137421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invite_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "max_uses" integer NOT NULL DEFAULT '1', "used_count" integer NOT NULL DEFAULT '0', "notes" character varying, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e8034125cb28e0814cd5a526c20" UNIQUE ("code"), CONSTRAINT "PK_6c0ede25edb23ae63c935138e33" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invite_codes"`);
    }

}

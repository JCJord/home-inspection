import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInviteCodes1779651000000 implements MigrationInterface {
    name = 'CreateInviteCodes1779651000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "invite_codes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "code" character varying NOT NULL, 
                "max_uses" integer NOT NULL DEFAULT '1', 
                "used_count" integer NOT NULL DEFAULT '0', 
                "notes" character varying, 
                "expires_at" TIMESTAMP, 
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "UQ_invite_code" UNIQUE ("code"), 
                CONSTRAINT "PK_invite_code" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invite_codes"`);
    }
}

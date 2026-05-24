import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerification1779634463491 implements MigrationInterface {
    name = 'AddEmailVerification1779634463491'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "is_email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "inspectors" SET "is_email_verified" = true`);
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "email_verification_token" character varying`);
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "email_verification_expires" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "email_verification_expires"`);
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "email_verification_token"`);
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "is_email_verified"`);
    }

}

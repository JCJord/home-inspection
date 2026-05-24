import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResetPasswordFieldsToInspector1779479759146 implements MigrationInterface {
    name = 'AddResetPasswordFieldsToInspector1779479759146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "reset_password_token" character varying`);
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "reset_password_expires" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "reset_password_expires"`);
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "reset_password_token"`);
    }

}

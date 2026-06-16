import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleAuth1781571568967 implements MigrationInterface {
    name = 'AddGoogleAuth1781571568967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" ALTER COLUMN "password_hash" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "google_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "google_id"`);
        await queryRunner.query(`ALTER TABLE "inspectors" ALTER COLUMN "password_hash" SET NOT NULL`);
    }
}

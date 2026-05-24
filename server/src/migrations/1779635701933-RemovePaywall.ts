import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePaywall1779635701933 implements MigrationInterface {
    name = 'RemovePaywall1779635701933'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "subscription_status"`);
        await queryRunner.query(`ALTER TABLE "inspectors" DROP COLUMN "free_inspections_used"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "free_inspections_used" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "inspectors" ADD "subscription_status" character varying NOT NULL DEFAULT 'free'`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReportSentAtToInspection1779650000000 implements MigrationInterface {
    name = 'AddReportSentAtToInspection1779650000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspections" ADD "report_sent_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspections" DROP COLUMN "report_sent_at"`);
    }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1779501745003 implements MigrationInterface {
    name = ' $npmConfigName1779501745003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspections" ADD "report_sent_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspections" DROP COLUMN "report_sent_at"`);
    }

}

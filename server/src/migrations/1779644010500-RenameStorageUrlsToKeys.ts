import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1779644010500 implements MigrationInterface {
    name = ' $npmConfigName1779644010500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "photos" RENAME COLUMN "storage_url" TO "photo_key"`);
        await queryRunner.query(`ALTER TABLE "reports" RENAME COLUMN "pdf_url" TO "pdf_key"`);
        await queryRunner.query(`ALTER TABLE "inspections" RENAME COLUMN "cover_photo_url" TO "cover_photo_key"`);
        await queryRunner.query(`ALTER TABLE "inspectors" RENAME COLUMN "logo_url" TO "logo_key"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inspectors" RENAME COLUMN "logo_key" TO "logo_url"`);
        await queryRunner.query(`ALTER TABLE "inspections" RENAME COLUMN "cover_photo_key" TO "cover_photo_url"`);
        await queryRunner.query(`ALTER TABLE "reports" RENAME COLUMN "pdf_key" TO "pdf_url"`);
        await queryRunner.query(`ALTER TABLE "photos" RENAME COLUMN "photo_key" TO "storage_url"`);
    }

}

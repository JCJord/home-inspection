import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1779390371958 implements MigrationInterface {
    name = 'Initial1779390371958'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."inspectors_sop_name_enum" AS ENUM('InterNACHI', 'ASHI', 'TREC', 'Custom')`);
        await queryRunner.query(`CREATE TABLE "inspectors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "name" character varying, "company_name" character varying, "phone" character varying, "license_number" character varying, "logo_url" character varying, "signature" text, "certifications" character varying, "subscription_status" character varying NOT NULL DEFAULT 'free', "free_inspections_used" integer NOT NULL DEFAULT '0', "brand_primary_color" character varying NOT NULL DEFAULT '#1E40AF', "brand_font_family" character varying NOT NULL DEFAULT 'modern', "report_footer_text" character varying(150), "sop_name" "public"."inspectors_sop_name_enum" NOT NULL DEFAULT 'InterNACHI', "custom_legal_disclaimer" text, "use_standard_definitions" boolean NOT NULL DEFAULT true, "custom_safety_hazard_def" text, "custom_major_defect_def" text, "custom_minor_defect_def" text, "custom_maintenance_item_def" text, "custom_informational_item_def" text, "default_send_email_confirmation" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_22254a143769c4b64d72e71d0df" UNIQUE ("email"), CONSTRAINT "PK_12b84fe4433ab103177c75c2e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "finding_id" uuid NOT NULL, "storage_url" character varying NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "caption" character varying, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5220c45b8e32d49d767b9b3d725" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "findings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inspection_id" uuid NOT NULL, "section" character varying NOT NULL, "severity" character varying NOT NULL, "location" character varying, "description" character varying NOT NULL DEFAULT '', "recommendation" character varying, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ae9807d6293c23c13ff8804d09c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "inspector_id" uuid, "structure" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inspections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inspector_id" uuid NOT NULL, "address" character varying, "client_name" character varying NOT NULL, "client_email" character varying, "client_phone" character varying, "year_built" integer, "square_footage" integer, "status" character varying NOT NULL DEFAULT 'scheduled', "scheduled_date" TIMESTAMP, "agreed_price" numeric(10,2), "weather" character varying, "temperature" double precision, "occupancy" character varying, "attendees" character varying, "foundation_type" character varying, "cover_photo_url" character varying, "template_id" uuid, "template_snapshot" jsonb, "metadata_values" jsonb, "section_statuses" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a484980015782324454d8c88abe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inspection_id" uuid NOT NULL, "pdf_url" character varying, "status" character varying NOT NULL DEFAULT 'pending', "published_at" TIMESTAMP, CONSTRAINT "REL_4a00316ce4498f82cc26390ef5" UNIQUE ("inspection_id"), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inspector_id" uuid NOT NULL, "hashed_refresh_token" character varying NOT NULL, "user_agent" character varying, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "FK_792215a75a0c9cf53270777e1e9" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "findings" ADD CONSTRAINT "FK_16631a786e93d0f142f069263ea" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_4f52e40ddc4c204eafa3b2c88f1" FOREIGN KEY ("inspector_id") REFERENCES "inspectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inspections" ADD CONSTRAINT "FK_be0708872a150482d84fafdf5ca" FOREIGN KEY ("inspector_id") REFERENCES "inspectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inspections" ADD CONSTRAINT "FK_5f65d7193b3063c3eb3b2c7bd9d" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_4a00316ce4498f82cc26390ef52" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_9ccb859061dde771f02d0c2230b" FOREIGN KEY ("inspector_id") REFERENCES "inspectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_9ccb859061dde771f02d0c2230b"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_4a00316ce4498f82cc26390ef52"`);
        await queryRunner.query(`ALTER TABLE "inspections" DROP CONSTRAINT "FK_5f65d7193b3063c3eb3b2c7bd9d"`);
        await queryRunner.query(`ALTER TABLE "inspections" DROP CONSTRAINT "FK_be0708872a150482d84fafdf5ca"`);
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_4f52e40ddc4c204eafa3b2c88f1"`);
        await queryRunner.query(`ALTER TABLE "findings" DROP CONSTRAINT "FK_16631a786e93d0f142f069263ea"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "FK_792215a75a0c9cf53270777e1e9"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TABLE "inspections"`);
        await queryRunner.query(`DROP TABLE "templates"`);
        await queryRunner.query(`DROP TABLE "findings"`);
        await queryRunner.query(`DROP TABLE "photos"`);
        await queryRunner.query(`DROP TABLE "inspectors"`);
        await queryRunner.query(`DROP TYPE "public"."inspectors_sop_name_enum"`);
    }

}

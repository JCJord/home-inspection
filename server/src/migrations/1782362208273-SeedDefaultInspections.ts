import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedDefaultInspections1782362208273 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Get all inspectors
        const inspectors = await queryRunner.query(`SELECT id FROM "inspectors"`);
        
        // Find template 'Full Residential (InterNACHI)'
        let templateId: string | null = null;
        let templateSnapshotStr: string | null = null;
        const templates = await queryRunner.query(`SELECT id, structure FROM "templates" WHERE name = 'Full Residential (InterNACHI)' LIMIT 1`);
        if (templates && templates.length > 0) {
            templateId = templates[0].id;
            templateSnapshotStr = JSON.stringify(templates[0].structure);
        } else {
            // Fallback: get any template
            const anyTemplates = await queryRunner.query(`SELECT id, structure FROM "templates" LIMIT 1`);
            if (anyTemplates && anyTemplates.length > 0) {
                templateId = anyTemplates[0].id;
                templateSnapshotStr = JSON.stringify(anyTemplates[0].structure);
            }
        }

        const address = "1 Happy Trails, Pleasantville FL";
        const clientName = "Happy Customer";
        const yearBuilt = 1976;
        const status = "in_progress";
        const metadataValues = JSON.stringify({});
        const sectionStatuses = JSON.stringify({});

        for (const inspector of inspectors) {
            // Check if the inspector already has a sample inspection to avoid duplicates
            const existing = await queryRunner.query(
                `SELECT id FROM "inspections" WHERE inspector_id = $1 AND client_name = $2 AND address = $3 LIMIT 1`,
                [inspector.id, clientName, address]
            );
            
            if (existing && existing.length > 0) {
                continue;
            }

            // Insert sample inspection
            const insertResult = await queryRunner.query(
                `INSERT INTO "inspections" (
                    "inspector_id", "address", "client_name", "year_built", "status", 
                    "template_id", "template_snapshot", "metadata_values", "section_statuses"
                ) VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS jsonb), CAST($8 AS jsonb), CAST($9 AS jsonb)) RETURNING id`,
                [
                    inspector.id, 
                    address, 
                    clientName, 
                    yearBuilt, 
                    status, 
                    templateId, 
                    templateSnapshotStr, 
                    metadataValues, 
                    sectionStatuses
                ]
            );

            const inspectionId = insertResult[0].id;

            // Insert sample findings
            const findingsData = [
                {
                    section: "Electrical",
                    location: "Exterior / Roof Line",
                    severity: "Major Defect",
                    description: "The electrical service conductors are rubbing against the roof, presenting a serious mechanical damage and fire risk. Trees are also growing directly into the electric service lines."
                },
                {
                    section: "Foundation and Structure",
                    location: "Florida Room (North Side)",
                    severity: "Major Defect",
                    description: "The foundation on the Florida room (north side) has visibly settled. Some floor tiles are cracked and patched with concrete filler."
                },
                {
                    section: "Plumbing",
                    location: "Exterior Yard",
                    severity: "Safety Hazard / Defect",
                    description: "A metal cap was observed at ground level that appears to belong to a buried, abandoned fuel storage tank. The metal is deteriorating and there is a noticeable smell of fuel still present."
                },
                {
                    section: "Roofing",
                    location: "Roof / Chimney",
                    severity: "Defect",
                    description: "The chimney crown is cracked and the protective sealant around the chimney base is actively deteriorating in multiple areas, creating a high risk for water intrusion."
                },
                {
                    section: "Exterior",
                    location: "Exterior Siding & Eaves",
                    severity: "Defect",
                    description: "Significant wood rot and water damage was observed in multiple areas along the exterior siding, eaves, and fascias."
                }
            ];

            for (let i = 0; i < findingsData.length; i++) {
                const f = findingsData[i];
                await queryRunner.query(
                    `INSERT INTO "findings" (
                        "inspection_id", "section", "severity", "location", "description", "sort_order"
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        inspectionId,
                        f.section,
                        f.severity,
                        f.location,
                        f.description,
                        i
                    ]
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const address = "1 Happy Trails, Pleasantville FL";
        const clientName = "Happy Customer";
        
        // Findings will be cascading deleted because of foreign key "FK_16631a786e93d0f142f069263ea"
        await queryRunner.query(
            `DELETE FROM "inspections" WHERE address = $1 AND client_name = $2`,
            [address, clientName]
        );
    }

}

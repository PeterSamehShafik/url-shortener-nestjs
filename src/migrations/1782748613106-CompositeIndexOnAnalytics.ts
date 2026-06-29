import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompositeIndexOnAnalytics1782748613106 implements MigrationInterface {
  name = 'CompositeIndexOnAnalytics1782748613106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a6fb370b52fc3284ff6fa28f7"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_223142e54a9f465a4cebbdf02e" ON "url_analytics"  ("urlId", "clickedAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_223142e54a9f465a4cebbdf02e"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a6fb370b52fc3284ff6fa28f7" ON "url_analytics" USING btree ("urlId") `,
    );
  }
}

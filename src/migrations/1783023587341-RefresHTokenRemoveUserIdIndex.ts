import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefresHTokenRemoveUserIdIndex1783023587341 implements MigrationInterface {
  name = 'RefresHTokenRemoveUserIdIndex1783023587341';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" USING btree ("userId") `,
    );
  }
}

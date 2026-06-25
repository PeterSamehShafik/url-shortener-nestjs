import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokensAddIndexOnToken1782136698830 implements MigrationInterface {
  name = 'RefreshTokensAddIndexOnToken1782136698830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens"  ("tokenHash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c25bc63d248ca90e8dcc1d92d0"`,
    );
  }
}

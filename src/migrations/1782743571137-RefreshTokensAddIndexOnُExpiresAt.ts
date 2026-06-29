import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokensAddIndexOnُExpiresAt1782743571137 implements MigrationInterface {
  name = 'RefreshTokensAddIndexOnُExpiresAt1782743571137';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_56b91d98f71e3d1b649ed6e9f3" ON "refresh_tokens"  ("expiresAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56b91d98f71e3d1b649ed6e9f3"`,
    );
  }
}

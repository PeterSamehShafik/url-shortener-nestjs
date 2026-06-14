import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1781444353435 implements MigrationInterface {
  name = 'InitialSchema1781444353435';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "url_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "urlId" uuid NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_d6c8cdda1d00809d14102582a3f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8106b248708f09e05df01606b" ON "url_tags"  ("urlId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "urls" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "originalUrl" text NOT NULL, "slug" character varying NOT NULL, "userId" uuid, "isActive" boolean NOT NULL DEFAULT true, "expiresAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c97a495e728c180054971888447" UNIQUE ("slug"), CONSTRAINT "PK_eaf7bec915960b26aa4988d73b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c97a495e728c18005497188844" ON "urls"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3088b58113241e3f5f6c10cf1f" ON "urls"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d79ee3778b01205238c90d34bc" ON "urls"  ("expiresAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "url_analytics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "urlId" uuid NOT NULL, "clickedAt" TIMESTAMP NOT NULL DEFAULT now(), "ipAddress" character varying(64), "userAgent" text, "referer" character varying(255), CONSTRAINT "PK_25b9ce28f474dc664e525a5fa21" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a6fb370b52fc3284ff6fa28f7" ON "url_analytics"  ("urlId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "url_tags" ADD CONSTRAINT "FK_a8106b248708f09e05df01606bb" FOREIGN KEY ("urlId") REFERENCES "urls"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "urls" ADD CONSTRAINT "FK_3088b58113241e3f5f6c10cf1fb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_analytics" ADD CONSTRAINT "FK_2a6fb370b52fc3284ff6fa28f7f" FOREIGN KEY ("urlId") REFERENCES "urls"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "url_analytics" DROP CONSTRAINT "FK_2a6fb370b52fc3284ff6fa28f7f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "urls" DROP CONSTRAINT "FK_3088b58113241e3f5f6c10cf1fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_tags" DROP CONSTRAINT "FK_a8106b248708f09e05df01606bb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a6fb370b52fc3284ff6fa28f7"`,
    );
    await queryRunner.query(`DROP TABLE "url_analytics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d79ee3778b01205238c90d34bc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3088b58113241e3f5f6c10cf1f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c97a495e728c18005497188844"`,
    );
    await queryRunner.query(`DROP TABLE "urls"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a8106b248708f09e05df01606b"`,
    );
    await queryRunner.query(`DROP TABLE "url_tags"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}

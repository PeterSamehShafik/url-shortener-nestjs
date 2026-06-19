import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import 'tsconfig-paths/register';
import { join } from 'path';
import { User } from '@/users/entities/user.entity';
import { Url } from '@/urls/entities/url.entity';
import { UrlAnalytic } from '@/analytics/entities/url-analytic.entity';
import { UrlTag } from '@/urls/entities/url-tag.entity';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'url_shortener',
  entities: [User, Url, UrlAnalytic, UrlTag, RefreshToken],
  migrations: [join(__dirname, 'src/migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
  migrationsRun: false,
  logging: true,
});

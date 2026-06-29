import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Url } from '@/urls/entities/url.entity';

@Entity('url_analytics')
@Index(['urlId', 'clickedAt'])
export class UrlAnalytic {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  urlId!: string;

  @ManyToOne(() => Url, (url) => url.analytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'urlId' })
  url!: Url;

  @CreateDateColumn()
  clickedAt!: Date;

  @Column({ nullable: true, type: 'varchar', length: 64 })
  ipAddress!: string | null;

  @Column({ nullable: true, type: 'text' })
  userAgent!: string | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  referer!: string | null;
}

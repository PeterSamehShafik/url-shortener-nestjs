import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Url } from '@/urls/entities/url.entity';

@Entity('url_tags')
export class UrlTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  urlId!: string;

  @ManyToOne(() => Url, (url) => url.tags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'urlId' })
  url!: Url;

  @Column()
  name!: string;
}

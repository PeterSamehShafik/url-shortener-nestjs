import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UrlAnalytic } from './url-analytic.entity';
import { UrlTag } from './url-tag.entity';

@Entity('urls')
export class Url {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  originalUrl!: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId!: string | null;

  @ManyToOne(() => User, (user) => user.urls, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  @Column({ default: true })
  isActive!: boolean;

  @Index()
  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt!: Date | null;

  @OneToMany(() => UrlAnalytic, (analytic) => analytic.url)
  analytics!: UrlAnalytic[];

  @OneToMany(() => UrlTag, (tag) => tag.url)
  tags!: UrlTag[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

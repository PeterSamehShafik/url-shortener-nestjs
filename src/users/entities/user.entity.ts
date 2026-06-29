import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';
import { Url } from '@/urls/entities/url.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum userRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @ApiProperty({
    description: 'Unique identifier of the user.',
    example: '8e6c4b5d-7f2b-4c2d-9c5d-4f3f72d7d9b4',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    description: 'Unique email address of the user.',
    example: 'john.doe@example.com',
  })
  @Index()
  @Column({ unique: true })
  email!: string;

  @ApiHideProperty()
  @Column({ select: false })
  passwordHash!: string;

  @ApiProperty({
    description: 'Role assigned to the user.',
    enum: userRole,
    example: userRole.USER,
  })
  @Column({ type: 'enum', enum: userRole, default: userRole.USER })
  role!: userRole;

  @ApiHideProperty()
  @OneToMany(() => Url, (url) => url.user)
  urls!: Url[];

  @ApiHideProperty()
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  @ApiProperty({
    description: 'Timestamp when the user account was created.',
    example: '2026-06-29T12:34:56.789Z',
  })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the user account was last updated.',
    example: '2026-06-29T13:45:12.123Z',
  })
  @UpdateDateColumn()
  updatedAt!: Date;
}

import {
  Entity, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { Tank } from './tank.entity';

/** A registered object in the photo bucket. The bytes never transit through the API. */
@Entity({ tableName: 'tank_photos' })
export class TankPhoto {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Tank, { deleteRule: 'cascade' })
  tank!: Tank;

  /** Object key, `tanks/<tankId>/<uuid>.<ext>`; the public URL derives from it. */
  @Property({
    length: 255,
    unique: true,
  })
  storageKey!: string;

  @Property({ length: 100 })
  contentType!: string;

  @Property({ unsigned: true })
  sizeBytes!: number;

  @Property({
    length: 200,
    nullable: true,
  })
  caption?: string | null = null;

  @Property({ nullable: true })
  takenAt?: Date | null = null;

  @ManyToOne(() => User)
  uploadedBy!: User;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();
}

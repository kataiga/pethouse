import { 
  Entity, 
  PrimaryKey, 
  Property, 
} from '@mikro-orm/core';

@Entity()
export class Tank {
  @PrimaryKey()
    id: number;

  @Property()
    name: string;

  @Property({ nullable: true })
    description?: string;

  @Property({ onCreate: () => new Date() })
    createdAt: Date = new Date();
}

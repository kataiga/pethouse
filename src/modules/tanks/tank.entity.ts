import {
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
} from 'typeorm';

@Entity()
export class Tank {
  @PrimaryGeneratedColumn()
    id: number;

  @Column()
    name: string;

  @Column({ nullable: true })
    description?: string;

  @CreateDateColumn()
    createdAt: Date;
}

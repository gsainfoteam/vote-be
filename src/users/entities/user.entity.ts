import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  studentId: string; // IdP에서 오는 학번

  @Column()
  name: string; // 실명

  @Column()
  email: string; // GIST 이메일

  @Column({ nullable: true })
  department: string; // 학과

  @Column({ unique: true, nullable: true })
  nickname: string; // 사용자가 설정할 닉네임

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
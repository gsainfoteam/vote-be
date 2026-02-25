import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({ description: '닉네임 (필수, 고유값)' })
    @IsString()
    @MaxLength(30)
    nickname: string;

    @ApiPropertyOptional({ description: '학과' })
    @IsOptional()
    @IsString()
    department?: string;
}

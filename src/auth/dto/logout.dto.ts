import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
    @ApiProperty({ description: '현재 세션의 Refresh Token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

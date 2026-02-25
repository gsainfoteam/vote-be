import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
    @ApiProperty({ description: '발급된 Refresh Token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

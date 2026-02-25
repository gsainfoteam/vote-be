import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
    @ApiProperty({ maxLength: 150 })
    @IsString()
    @MaxLength(150)
    content: string;
}

import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerDto {
    @ApiProperty({ description: '질문 ID' })
    @IsInt()
    questionId: number;

    @ApiPropertyOptional({ description: '객관식 선택지 ID 목록 (단일/복수)' })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    optionIds?: number[];

    @ApiPropertyOptional({ description: '주관식 답변 텍스트' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    text?: string;
}

export class SubmitVoteDto {
    @ApiProperty({ type: [AnswerDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}

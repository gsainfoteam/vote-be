import { IsString, IsBoolean, IsOptional, IsDateString, IsInt, IsEnum, IsArray, ValidateNested, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class CreateOptionDto {
    @ApiProperty()
    @IsString()
    @MaxLength(200)
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    imageUrl?: string;
}

export class CreateQuestionDto {
    @ApiProperty({ enum: QuestionType })
    @IsEnum(QuestionType)
    type: QuestionType;

    @ApiProperty()
    @IsString()
    @MaxLength(500)
    content: string;

    @ApiPropertyOptional({ type: [CreateOptionDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOptionDto)
    options?: CreateOptionDto[];
}

export class CreateSurveyDto {
    @ApiProperty()
    @IsString()
    @MaxLength(200)
    title: string;

    @ApiProperty()
    @IsString()
    @MaxLength(2000)
    description: string;

    @ApiProperty({ default: true })
    @IsBoolean()
    isAnonymous: boolean;

    @ApiProperty({ example: '2026-03-10T23:59:59.000Z' })
    @IsDateString()
    deadline: string;

    @ApiPropertyOptional({ description: '예상 완료 시간(초). 없으면 자동 계산' })
    @IsOptional()
    @IsInt()
    estimatedTime?: number;

    @ApiPropertyOptional({ description: '설문 대상 제한. 예: ALL, MALE, FEMALE, DEPT_CS' })
    @IsOptional()
    @IsString()
    targetConstraint?: string;

    @ApiProperty({ type: [CreateQuestionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => CreateQuestionDto)
    questions: CreateQuestionDto[];
}

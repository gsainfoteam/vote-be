import {
    IsString,
    IsBoolean,
    IsOptional,
    IsDateString,
    IsInt,
    IsArray,
    ValidateNested,
    MaxLength,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateQuestionDto, TargetConstraintDto } from './create-survey.dto';

export class UpdateSurveyDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isAnonymous?: boolean;

    @ApiPropertyOptional({ example: '2026-03-10T23:59:59.000Z' })
    @IsOptional()
    @IsDateString()
    deadline?: string;

    @ApiPropertyOptional({ description: '예상 완료 시간(초). 없으면 문항 기준으로 자동 계산됩니다!' })
    @IsOptional()
    @IsInt()
    estimatedTime?: number;

    @ApiPropertyOptional({ type: [TargetConstraintDto], description: '설문 대상 조건 목록' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TargetConstraintDto)
    targetConstraints?: TargetConstraintDto[];

    @ApiPropertyOptional({ type: [CreateQuestionDto], description: '문항 전체 교체' })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateQuestionDto)
    questions?: CreateQuestionDto[];
}

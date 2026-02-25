import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindSurveysQueryDto {
    @ApiPropertyOptional({ enum: ['ongoing', 'closing', 'popular'], default: 'ongoing' })
    @IsOptional()
    @IsIn(['ongoing', 'closing', 'popular'])
    tab?: 'ongoing' | 'closing' | 'popular';

    @ApiPropertyOptional({ description: '페이지 번호', default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ description: '페이지 크기', default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}

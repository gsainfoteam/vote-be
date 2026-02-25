import { IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '@prisma/client';

export class CreateReportDto {
    @ApiProperty({ enum: ReportType, description: '신고 대상 타입: SURVEY | COMMENT' })
    @IsEnum(ReportType)
    targetType: ReportType;

    @ApiProperty({ description: '신고 대상 ID (설문 ID 또는 댓글 ID)' })
    @IsInt()
    targetId: number;
}

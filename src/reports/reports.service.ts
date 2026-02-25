import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportType } from '@prisma/client';

const REPORT_THRESHOLD = 5;

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async createReport(reporterId: string, dto: CreateReportDto) {
        // Check for duplicate report
        const existing = await this.prisma.report.findUnique({
            where: {
                reporterId_targetType_targetId: {
                    reporterId,
                    targetType: dto.targetType,
                    targetId: dto.targetId,
                },
            },
        });
        if (existing) throw new ConflictException('이미 신고한 항목입니다.');

        await this.prisma.report.create({
            data: { reporterId, targetType: dto.targetType, targetId: dto.targetId },
        });

        // Count reports for this target
        const reportCount = await this.prisma.report.count({
            where: { targetType: dto.targetType, targetId: dto.targetId },
        });

        // Auto-hide if threshold reached
        if (reportCount >= REPORT_THRESHOLD) {
            await this.hideTarget(dto.targetType, dto.targetId);
        }

        return { message: '신고가 접수되었습니다.' };
    }

    private async hideTarget(targetType: ReportType, targetId: number) {
        if (targetType === ReportType.SURVEY) {
            const survey = await this.prisma.survey.update({
                where: { id: targetId },
                data: { isHidden: true },
            });
            await this.prisma.notification.create({
                data: {
                    userId: survey.authorId,
                    type: 'REPORT_HIDDEN',
                    content: `내 설문 "${survey.title}"이 신고 누적으로 숨김 처리되었습니다.`,
                },
            });
        } else {
            const comment = await this.prisma.comment.update({
                where: { id: targetId },
                data: { isHidden: true },
            });
            await this.prisma.notification.create({
                data: {
                    userId: comment.authorId,
                    type: 'REPORT_HIDDEN',
                    content: `내 댓글이 신고 누적으로 숨김 처리되었습니다.`,
                },
            });
        }
    }
}

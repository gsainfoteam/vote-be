import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async getMe(uuid: string) {
        return this.prisma.user.findUnique({ where: { uuid } });
    }

    async updateProfile(uuid: string, dto: UpdateProfileDto) {
        return this.prisma.user.update({
            where: { uuid },
            data: dto,
        });
    }

    async getMySurveys(uuid: string) {
        return this.prisma.survey.findMany({
            where: { authorId: uuid },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, title: true, deadline: true, isHidden: true, createdAt: true,
                _count: { select: { responses: true } },
            },
        });
    }

    async getMyResponses(uuid: string) {
        return this.prisma.response.findMany({
            where: { userId: uuid },
            orderBy: { updatedAt: 'desc' },
            include: {
                survey: { select: { id: true, title: true, deadline: true } },
            },
        });
    }

    async getMyComments(uuid: string) {
        return this.prisma.comment.findMany({
            where: { authorId: uuid },
            orderBy: { createdAt: 'desc' },
            include: {
                survey: { select: { id: true, title: true } },
            },
        });
    }

    async getMyNotifications(uuid: string) {
        return this.prisma.notification.findMany({
            where: { userId: uuid },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteMySurvey(uuid: string, surveyId: number) {
        // Ensure ownership
        await this.prisma.survey.findFirstOrThrow({ where: { id: surveyId, authorId: uuid } });
        return this.prisma.survey.delete({ where: { id: surveyId } });
    }

    async closeMySurvey(uuid: string, surveyId: number) {
        await this.prisma.survey.findFirstOrThrow({ where: { id: surveyId, authorId: uuid } });
        return this.prisma.survey.update({
            where: { id: surveyId },
            data: { deadline: new Date() }, // Set deadline to now = close immediately
        });
    }
}

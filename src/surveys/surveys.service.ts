import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SubmitVoteDto } from './dto/submit-vote.dto';
import { Prisma, QuestionType } from '@prisma/client';

const ESTIMATED_TIME_SINGLE = 20;
const ESTIMATED_TIME_MULTIPLE = 25;
const ESTIMATED_TIME_SUBJECTIVE = 60;

@Injectable()
export class SurveysService {
    constructor(private readonly prisma: PrismaService) { }

    async create(authorId: string, dto: CreateSurveyDto) {
        const deadline = new Date(dto.deadline);
        const maxDeadline = new Date();
        maxDeadline.setDate(maxDeadline.getDate() + 14);
        if (deadline > maxDeadline) {
            throw new BadRequestException('마감일은 최대 14일 이내로 설정해야 합니다.');
        }

        const estimatedTime =
            dto.estimatedTime ??
            dto.questions.reduce((acc, q) => {
                if (q.type === QuestionType.SINGLE) return acc + ESTIMATED_TIME_SINGLE;
                if (q.type === QuestionType.MULTIPLE) return acc + ESTIMATED_TIME_MULTIPLE;
                return acc + ESTIMATED_TIME_SUBJECTIVE;
            }, 0);

        return this.prisma.survey.create({
            data: {
                title: dto.title,
                description: dto.description,
                isAnonymous: dto.isAnonymous,
                deadline,
                estimatedTime,
                targetConstraint: dto.targetConstraint,
                authorId,
                questions: {
                    create: dto.questions.map((q) => ({
                        type: q.type,
                        content: q.content,
                        options: q.options ? { create: q.options } : undefined,
                    })),
                },
            },
            include: { questions: { include: { options: true } } },
        });
    }

    async findAll(tab: 'ongoing' | 'closing' | 'popular' = 'ongoing') {
        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);

        const baseWhere: any = { isHidden: false, deadline: { gt: now } };
        let orderBy: any = { createdAt: 'desc' };

        if (tab === 'closing') {
            baseWhere.deadline = { gt: now, lte: threeDaysLater };
        } else if (tab === 'popular') {
            orderBy = { responses: { _count: 'desc' } };
        }

        return this.prisma.survey.findMany({
            where: baseWhere,
            orderBy,
            select: {
                id: true,
                title: true,
                deadline: true,
                estimatedTime: true,
                isAnonymous: true,
                _count: { select: { responses: true } },
            },
        });
    }

    async findOne(id: number, userId: string) {
        const survey = await this.prisma.survey.findUnique({
            where: { id },
            include: {
                author: { select: { nickname: true, department: true, uuid: true } },
                questions: { include: { options: true } },
                _count: { select: { responses: true } },
            },
        });
        if (!survey || survey.isHidden) throw new NotFoundException('설문을 찾을 수 없습니다.');

        const hasVoted = await this.prisma.response.findUnique({
            where: { surveyId_userId: { surveyId: id, userId } },
        });

        return { ...survey, hasVoted: !!hasVoted };
    }

    async vote(surveyId: number, userId: string, dto: SubmitVoteDto) {
        const survey = await this.prisma.survey.findUnique({
            where: { id: surveyId },
        });
        if (!survey || survey.isHidden) throw new NotFoundException('설문을 찾을 수 없습니다.');
        if (new Date() > survey.deadline) throw new ForbiddenException('마감된 설문입니다.');

        const existing = await this.prisma.response.findUnique({
            where: { surveyId_userId: { surveyId, userId } },
        });

        return this.prisma.$transaction(async (tx) => {
            if (existing) {
                await tx.answer.deleteMany({ where: { responseId: existing.id } });
                await tx.response.delete({ where: { id: existing.id } });
            }

            const response = await tx.response.create({ data: { surveyId, userId } });

            const answers = dto.answers.flatMap((a) => {
                if (a.text) {
                    return [{ responseId: response.id, questionId: a.questionId, text: a.text }];
                }
                return (a.optionIds ?? []).map((optionId) => ({
                    responseId: response.id,
                    questionId: a.questionId,
                    optionId,
                }));
            });
            await tx.answer.createMany({ data: answers });

            return { message: '투표가 완료되었습니다.' };
        });
    }

    async getResults(surveyId: number, userId: string) {
        const hasVoted = await this.prisma.response.findUnique({
            where: { surveyId_userId: { surveyId, userId } },
        });
        if (!hasVoted) throw new ForbiddenException('설문에 참여한 후 결과를 확인할 수 있습니다.');

        return this.prisma.survey.findUnique({
            where: { id: surveyId },
            include: {
                questions: {
                    include: {
                        options: {
                            include: { _count: { select: { answers: true } } },
                        },
                        answers: {
                            where: { text: { not: null } },
                            include: {
                                response: {
                                    include: { user: { select: { nickname: true, uuid: true } } },
                                },
                            },
                        },
                    },
                },
                _count: { select: { responses: true } },
            },
        });
    }
}

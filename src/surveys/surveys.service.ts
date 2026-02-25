import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto, TargetConstraintDto } from './dto/create-survey.dto';
import { SubmitVoteDto } from './dto/submit-vote.dto';
import { QuestionType, TargetType } from '@prisma/client';
import { UpdateSurveyDto } from './dto/update-survey.dto';

const ESTIMATED_TIME_SINGLE = 20;
const ESTIMATED_TIME_MULTIPLE = 25;
const ESTIMATED_TIME_SUBJECTIVE = 60;
const SUBJECTIVE_MAX_LENGTH = 1000;
type FindAllTab = 'ongoing' | 'closing' | 'popular';

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

        this.validateTargetConstraints(dto.targetConstraints);

        return this.prisma.survey.create({
            data: {
                title: dto.title,
                description: dto.description,
                isAnonymous: dto.isAnonymous,
                deadline,
                estimatedTime,
                authorId,
                targetConstraints: dto.targetConstraints
                    ? {
                        create: dto.targetConstraints.map((constraint) => ({
                            type: constraint.type,
                            value: constraint.value?.trim() || null,
                        })),
                    }
                    : undefined,
                questions: {
                    create: dto.questions.map((q) => ({
                        type: q.type,
                        content: q.content,
                        options: q.options ? { create: q.options } : undefined,
                    })),
                },
            },
            include: {
                targetConstraints: true,
                questions: { include: { options: true } },
            },
        });
    }

    async updateSurvey(surveyId: number, authorId: string, dto: UpdateSurveyDto) {
        const survey = await this.prisma.survey.findFirst({
            where: { id: surveyId, authorId, isHidden: false },
        });
        if (!survey) throw new NotFoundException('설문을 찾을 수 없습니다.');

        const responseCount = await this.prisma.response.count({ where: { surveyId } });
        if (responseCount > 0) {
            throw new ForbiddenException('응답이 존재하는 설문은 수정할 수 없습니다.');
        }

        if (dto.deadline) {
            const deadline = new Date(dto.deadline);
            const maxDeadline = new Date();
            maxDeadline.setDate(maxDeadline.getDate() + 14);
            if (deadline > maxDeadline) {
                throw new BadRequestException('마감일은 최대 14일 이내로 설정해야 합니다.');
            }
        }

        this.validateTargetConstraints(dto.targetConstraints);

        return this.prisma.$transaction(async (tx) => {
            if (dto.questions) {
                await tx.question.deleteMany({ where: { surveyId } });
            }

            const estimatedTime =
                dto.estimatedTime ??
                (dto.questions
                    ? dto.questions.reduce((acc, q) => {
                        if (q.type === QuestionType.SINGLE) return acc + ESTIMATED_TIME_SINGLE;
                        if (q.type === QuestionType.MULTIPLE) return acc + ESTIMATED_TIME_MULTIPLE;
                        return acc + ESTIMATED_TIME_SUBJECTIVE;
                    }, 0)
                    : undefined);

            return tx.survey.update({
                where: { id: surveyId },
                data: {
                    title: dto.title,
                    description: dto.description,
                    isAnonymous: dto.isAnonymous,
                    deadline: dto.deadline ? new Date(dto.deadline) : undefined,
                    estimatedTime,
                    targetConstraints: dto.targetConstraints
                        ? {
                            deleteMany: {},
                            create: dto.targetConstraints.map((constraint) => ({
                                type: constraint.type,
                                value: constraint.value?.trim() || null,
                            })),
                        }
                        : undefined,
                    questions: dto.questions
                        ? {
                            create: dto.questions.map((q) => ({
                                type: q.type,
                                content: q.content,
                                options: q.options ? { create: q.options } : undefined,
                            })),
                        }
                        : undefined,
                },
                include: {
                    targetConstraints: true,
                    questions: { include: { options: true } },
                },
            });
        });
    }

    async findAll(tab: FindAllTab = 'ongoing', page = 1, limit = 20) {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const closingStart = new Date(todayStart);
        closingStart.setDate(closingStart.getDate() + 1); // D-1 시작
        const closingEndExclusive = new Date(todayStart);
        closingEndExclusive.setDate(closingEndExclusive.getDate() + 4); // D-3 끝 (exclusive)
        const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
        const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.trunc(limit))) : 20;

        const baseWhere: any = { isHidden: false, deadline: { gt: now } };
        let orderBy: any = { createdAt: 'desc' };

        if (tab === 'closing') {
            baseWhere.deadline = { gte: closingStart, lt: closingEndExclusive };
        } else if (tab === 'popular') {
            orderBy = { responses: { _count: 'desc' } };
        }

        return this.prisma.survey.findMany({
            where: baseWhere,
            orderBy,
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
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
                targetConstraints: true,
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
            include: {
                targetConstraints: true,
                questions: {
                    include: {
                        options: { select: { id: true } },
                    },
                },
            },
        });
        if (!survey || survey.isHidden) throw new NotFoundException('설문을 찾을 수 없습니다.');
        if (new Date() > survey.deadline) throw new ForbiddenException('마감된 설문입니다.');

        const voter = await this.prisma.user.findUnique({
            where: { uuid: userId },
            select: { uuid: true, department: true, studentId: true, nickname: true },
        });
        if (!voter) throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');

        if (!this.isUserAllowedByConstraints(voter, survey.targetConstraints)) {
            throw new ForbiddenException('이 설문에 참여할 수 있는 대상자가 아닙니다.');
        }

        const questionMap = new Map(survey.questions.map((q) => [q.id, q]));
        const seenQuestionIds = new Set<number>();

        for (const answer of dto.answers) {
            const question = questionMap.get(answer.questionId);
            if (!question) {
                throw new BadRequestException(`유효하지 않은 문항입니다. questionId=${answer.questionId}`);
            }

            if (seenQuestionIds.has(answer.questionId)) {
                throw new BadRequestException(`중복 답변이 존재합니다. questionId=${answer.questionId}`);
            }
            seenQuestionIds.add(answer.questionId);

            const optionIds = answer.optionIds ?? [];
            const text = answer.text?.trim();
            const allowedOptionIds = new Set(question.options.map((option) => option.id));
            for (const optionId of optionIds) {
                if (!allowedOptionIds.has(optionId)) {
                    throw new BadRequestException(
                        `문항에 속하지 않은 선택지입니다. questionId=${answer.questionId}, optionId=${optionId}`,
                    );
                }
            }

            if (question.type === QuestionType.SINGLE) {
                if (optionIds.length !== 1) {
                    throw new BadRequestException(`SINGLE 문항은 optionIds가 정확히 1개여야 합니다. questionId=${answer.questionId}`);
                }
                if (text) {
                    throw new BadRequestException(`SINGLE 문항에는 text를 보낼 수 없습니다. questionId=${answer.questionId}`);
                }
            }

            if (question.type === QuestionType.MULTIPLE) {
                if (optionIds.length < 1) {
                    throw new BadRequestException(`MULTIPLE 문항은 optionIds가 1개 이상이어야 합니다. questionId=${answer.questionId}`);
                }
                if (text) {
                    throw new BadRequestException(`MULTIPLE 문항에는 text를 보낼 수 없습니다. questionId=${answer.questionId}`);
                }
            }

            if (question.type === QuestionType.SUBJECTIVE) {
                if (!text) {
                    throw new BadRequestException(`SUBJECTIVE 문항은 text가 반드시 필요합니다. questionId=${answer.questionId}`);
                }
                if (text.length > SUBJECTIVE_MAX_LENGTH) {
                    throw new BadRequestException(`주관식 답변은 ${SUBJECTIVE_MAX_LENGTH}자를 초과할 수 없습니다. questionId=${answer.questionId}`);
                }
                if (optionIds.length > 0) {
                    throw new BadRequestException(`SUBJECTIVE 문항에는 optionIds를 보낼 수 없습니다. questionId=${answer.questionId}`);
                }
            }
        }

        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.response.findUnique({
                where: { surveyId_userId: { surveyId, userId } },
            });

            if (existing) {
                await tx.answer.deleteMany({ where: { responseId: existing.id } });
                await tx.response.delete({ where: { id: existing.id } });
            }

            const response = await tx.response.create({ data: { surveyId, userId } });

            const answerRows: Array<{
                responseId: number;
                questionId: number;
                optionId?: number;
                text?: string;
            }> = [];

            for (const a of dto.answers) {
                const text = a.text?.trim();
                if (text) {
                    answerRows.push({ responseId: response.id, questionId: a.questionId, text });
                    continue;
                }

                for (const optionId of a.optionIds ?? []) {
                    answerRows.push({
                        responseId: response.id,
                        questionId: a.questionId,
                        optionId,
                    });
                }
            }

            await tx.answer.createMany({ data: answerRows });

            return { message: '투표가 완료되었습니다.' };
        });
    }

    async getResults(surveyId: number, userId: string, page = 1, limit = 50) {
        const hasVoted = await this.prisma.response.findUnique({
            where: { surveyId_userId: { surveyId, userId } },
        });
        if (!hasVoted) throw new ForbiddenException('설문에 참여한 후 결과를 확인할 수 있습니다.');

        const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
        const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.trunc(limit))) : 50;

        const survey = await this.prisma.survey.findUnique({
            where: { id: surveyId },
            include: {
                targetConstraints: true,
                questions: {
                    include: {
                        options: {
                            include: { _count: { select: { answers: true } } },
                        },
                        answers: {
                            where: { text: { not: null } },
                            orderBy: { id: 'desc' },
                            skip: (safePage - 1) * safeLimit,
                            take: safeLimit,
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

        if (!survey || survey.isHidden) throw new NotFoundException('설문을 찾을 수 없습니다.');

        if (!survey.isAnonymous) {
            return {
                ...survey,
                subjectiveAnswersPagination: { page: safePage, limit: safeLimit },
            };
        }

        return {
            ...survey,
            subjectiveAnswersPagination: { page: safePage, limit: safeLimit },
            questions: survey.questions.map((question) => ({
                ...question,
                answers: question.answers.map((answer) => ({
                    ...answer,
                    response: {
                        ...answer.response,
                        user: answer.response.user
                            ? {
                                ...answer.response.user,
                                nickname: '익명',
                                uuid: null,
                            }
                            : null,
                    },
                })),
            })),
        };
    }

    private validateTargetConstraints(targetConstraints?: TargetConstraintDto[]) {
        if (!targetConstraints || targetConstraints.length === 0) return;

        const hasAll = targetConstraints.some((constraint) => constraint.type === TargetType.ALL);
        if (hasAll && targetConstraints.length > 1) {
            throw new BadRequestException('TargetType.ALL은 다른 조건과 함께 사용할 수 없습니다.');
        }

        for (const constraint of targetConstraints) {
            const value = constraint.value?.trim();
            if (constraint.type === TargetType.ALL && value) {
                throw new BadRequestException('TargetType.ALL에는 value를 지정할 수 없습니다.');
            }
            if (constraint.type !== TargetType.ALL && !value) {
                throw new BadRequestException(`대상 조건 ${constraint.type}에는 value가 필요합니다.`);
            }
        }
    }

    private isUserAllowedByConstraints(
        user: { uuid: string; department: string | null; studentId: string | null; nickname: string | null },
        constraints: Array<{ type: TargetType; value: string | null }>,
    ) {
        if (!constraints || constraints.length === 0) return true;
        if (constraints.some((constraint) => constraint.type === TargetType.ALL)) return true;

        return constraints.some((constraint) => {
            const value = (constraint.value ?? '').trim();
            if (!value) return false;

            if (constraint.type === TargetType.DEPARTMENT) {
                return user.department === value;
            }
            if (constraint.type === TargetType.STUDENT_ID_PREFIX) {
                return !!user.studentId?.startsWith(value);
            }
            if (constraint.type === TargetType.NICKNAME) {
                return user.nickname === value;
            }
            if (constraint.type === TargetType.UUID) {
                return user.uuid === value;
            }

            return false;
        });
    }
}

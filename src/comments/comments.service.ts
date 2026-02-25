import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
    constructor(private readonly prisma: PrismaService) { }

    async createComment(surveyId: number, authorId: string, dto: CreateCommentDto) {
        const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
        if (!survey || survey.isHidden) throw new NotFoundException('설문을 찾을 수 없습니다.');

        const comment = await this.prisma.comment.create({
            data: { surveyId, authorId, content: dto.content },
        });

        // Notify survey author if different from comment author
        if (survey.authorId !== authorId) {
            await this.prisma.notification.create({
                data: {
                    userId: survey.authorId,
                    type: 'NEW_COMMENT',
                    content: `내 설문 "${survey.title}"에 새 댓글이 달렸습니다.`,
                },
            });
        }

        return comment;
    }

    async getComments(surveyId: number) {
        return this.prisma.comment.findMany({
            where: { surveyId, isHidden: false },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { nickname: true, uuid: true } },
            },
        });
    }

    async updateComment(id: number, userId: string, dto: CreateCommentDto) {
        const comment = await this.prisma.comment.findUnique({ where: { id } });
        if (!comment) throw new NotFoundException();
        if (comment.authorId !== userId) throw new ForbiddenException('본인의 댓글만 수정할 수 있습니다.');
        return this.prisma.comment.update({ where: { id }, data: { content: dto.content } });
    }

    async deleteComment(id: number, userId: string) {
        const comment = await this.prisma.comment.findUnique({ where: { id } });
        if (!comment) throw new NotFoundException();
        if (comment.authorId !== userId) throw new ForbiddenException('본인의 댓글만 삭제할 수 있습니다.');
        return this.prisma.comment.delete({ where: { id } });
    }
}

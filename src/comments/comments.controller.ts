import { Controller, Post, Get, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Comments (댓글)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) { }

    @Post('surveys/:surveyId/comments')
    @ApiOperation({ summary: '댓글 작성 (최대 150자)' })
    createComment(
        @Param('surveyId', ParseIntPipe) surveyId: number,
        @CurrentUser() user: { uuid: string },
        @Body() dto: CreateCommentDto,
    ) {
        return this.commentsService.createComment(surveyId, user.uuid, dto);
    }

    @Get('surveys/:surveyId/comments')
    @ApiOperation({ summary: '설문 댓글 목록 조회' })
    getComments(@Param('surveyId', ParseIntPipe) surveyId: number) {
        return this.commentsService.getComments(surveyId);
    }

    @Patch('comments/:id')
    @ApiOperation({ summary: '댓글 수정 (작성자만)' })
    updateComment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { uuid: string },
        @Body() dto: CreateCommentDto,
    ) {
        return this.commentsService.updateComment(id, user.uuid, dto);
    }

    @Delete('comments/:id')
    @ApiOperation({ summary: '댓글 삭제 (작성자만)' })
    deleteComment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { uuid: string }) {
        return this.commentsService.deleteComment(id, user.uuid);
    }
}

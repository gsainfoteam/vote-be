import { Controller, Get, Patch, Delete, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Users (유저)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: '내 프로필 조회' })
    getMe(@CurrentUser() user: { uuid: string }) {
        return this.usersService.getMe(user.uuid);
    }

    @Patch('me/profile')
    @ApiOperation({ summary: '프로필 설정 (닉네임, 학과)' })
    updateProfile(@CurrentUser() user: { uuid: string }, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateProfile(user.uuid, dto);
    }

    @Get('me/surveys')
    @ApiOperation({ summary: '내가 만든 설문 목록' })
    getMySurveys(@CurrentUser() user: { uuid: string }) {
        return this.usersService.getMySurveys(user.uuid);
    }

    @Delete('me/surveys/:id')
    @ApiOperation({ summary: '내 설문 삭제' })
    deleteMySurvey(@CurrentUser() user: { uuid: string }, @Param('id', ParseIntPipe) id: number) {
        return this.usersService.deleteMySurvey(user.uuid, id);
    }

    @Post('me/surveys/:id/close')
    @ApiOperation({ summary: '내 설문 조기 마감' })
    closeMySurvey(@CurrentUser() user: { uuid: string }, @Param('id', ParseIntPipe) id: number) {
        return this.usersService.closeMySurvey(user.uuid, id);
    }

    @Get('me/responses')
    @ApiOperation({ summary: '내가 참여한 설문 목록' })
    getMyResponses(@CurrentUser() user: { uuid: string }) {
        return this.usersService.getMyResponses(user.uuid);
    }

    @Get('me/comments')
    @ApiOperation({ summary: '내가 쓴 댓글 목록' })
    getMyComments(@CurrentUser() user: { uuid: string }) {
        return this.usersService.getMyComments(user.uuid);
    }

    @Get('me/notifications')
    @ApiOperation({ summary: '내 알림 목록' })
    getMyNotifications(@CurrentUser() user: { uuid: string }) {
        return this.usersService.getMyNotifications(user.uuid);
    }
}

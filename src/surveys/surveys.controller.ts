import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SubmitVoteDto } from './dto/submit-vote.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Surveys (설문)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
    constructor(private readonly surveysService: SurveysService) { }

    @Post()
    @ApiOperation({ summary: '설문 생성' })
    create(@CurrentUser() user: { uuid: string }, @Body() dto: CreateSurveyDto) {
        return this.surveysService.create(user.uuid, dto);
    }

    @Get()
    @ApiOperation({ summary: '설문 목록 조회 (탭: ongoing | closing | popular)' })
    @ApiQuery({ name: 'tab', required: false, enum: ['ongoing', 'closing', 'popular'] })
    findAll(@Query('tab') tab: 'ongoing' | 'closing' | 'popular') {
        return this.surveysService.findAll(tab);
    }

    @Get(':id')
    @ApiOperation({ summary: '설문 상세 조회 (투표 여부 포함)' })
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { uuid: string }) {
        return this.surveysService.findOne(id, user.uuid);
    }

    @Post(':id/vote')
    @ApiOperation({ summary: '설문 투표 (재투표 가능)' })
    vote(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { uuid: string },
        @Body() dto: SubmitVoteDto,
    ) {
        return this.surveysService.vote(id, user.uuid, dto);
    }

    @Get(':id/results')
    @ApiOperation({ summary: '설문 결과 조회 (투표자만 가능)' })
    getResults(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { uuid: string }) {
        return this.surveysService.getResults(id, user.uuid);
    }
}

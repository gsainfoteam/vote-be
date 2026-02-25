import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@ApiTags('Auth (인증)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @ApiOperation({
    summary: 'GIST IdP 로그인',
    description: 'IdP에서 받은 Access Token으로 로그인하고, 서비스 자체 JWT 토큰을 발급합니다.',
  })
  @ApiResponse({ status: 200, description: 'Access Token + Refresh Token 반환' })
  @ApiResponse({ status: 401, description: 'IdP 인증 실패' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Access Token 갱신',
    description: 'Refresh Token을 사용해 새 Access Token을 발급합니다.',
  })
  @ApiResponse({ status: 200, description: '새 Access Token + Refresh Token 반환' })
  @ApiResponse({ status: 401, description: '유효하지 않은 Refresh Token' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '로그아웃',
    description: 'Refresh Token 세션을 폐기하고 Access Token을 블랙리스트에 등록합니다.',
  })
  @ApiResponse({ status: 200, description: '로그아웃 완료' })
  async logout(
    @CurrentUser() user: { uuid: string; jti?: string; exp?: number },
    @Body() logoutDto: LogoutDto,
  ) {
    return this.authService.logout(user, logoutDto);
  }
}
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IdpService } from './idp.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { LogoutDto } from './dto/logout.dto';

type RefreshTokenPayload = {
  sub: string;
  name: string;
  tokenType: 'refresh';
  jti: string;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly idpService: IdpService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async login(loginDto: LoginDto) {
    const { idpToken } = loginDto;

    // 1. Fetch user info from GIST IdP
    const idpUser = await this.idpService.getUserInfo(idpToken);

    // 2. Upsert the user in our DB
    const user = await this.prisma.user.upsert({
      where: { uuid: idpUser.uuid },
      update: {
        email: idpUser.email,
        name: idpUser.name,
        picture: idpUser.picture,
        studentId: idpUser.studentId,
      },
      create: {
        uuid: idpUser.uuid,
        email: idpUser.email,
        name: idpUser.name,
        picture: idpUser.picture,
        studentId: idpUser.studentId,
      },
    });

    // 3. Issue our own dual tokens
    const tokens = await this.issueTokens(user.uuid, user.name);

    return {
      ...tokens,
      isNewUser: !user.nickname, // true if user hasn't set up their profile yet
    };
  }

  async refresh(refreshDto: RefreshDto) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshDto.refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
      }

      const tokenHash = this.hashToken(refreshDto.refreshToken);
      const session = await this.prisma.refreshTokenSession.findFirst({
        where: {
          userId: payload.sub,
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException('이미 폐기되었거나 유효하지 않은 Refresh Token입니다.');
      }

      await this.prisma.refreshTokenSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      const tokens = await this.issueTokens(payload.sub, payload.name);
      return tokens;
    } catch {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
    }
  }

  async logout(user: { uuid: string; jti?: string; exp?: number }, logoutDto: LogoutDto) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(logoutDto.refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.tokenType !== 'refresh' || payload.sub !== user.uuid) {
        throw new UnauthorizedException('유효하지 않은 로그아웃 요청입니다.');
      }

      await this.prisma.refreshTokenSession.updateMany({
        where: {
          userId: user.uuid,
          tokenHash: this.hashToken(logoutDto.refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      if (user.jti && user.exp) {
        await this.blacklistAccessToken(user.jti, user.exp);
      }

      return { message: '로그아웃되었습니다.' };
    } catch {
      throw new UnauthorizedException('유효하지 않은 로그아웃 요청입니다.');
    }
  }

  private async issueTokens(uuid: string, name: string) {
    const secret = this.configService.get<string>('JWT_SECRET');
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: uuid, name, tokenType: 'access', jti: accessJti },
      {
        secret,
        expiresIn: '5m',
      },
    );
    const refreshToken = this.jwtService.sign(
      { sub: uuid, name, tokenType: 'refresh', jti: refreshJti },
      {
        secret,
        expiresIn: '24h',
      },
    );

    const decodedRefresh = this.jwtService.decode(refreshToken) as RefreshTokenPayload | null;
    if (!decodedRefresh?.exp) {
      throw new UnauthorizedException('토큰 발급에 실패했습니다.');
    }

    await this.prisma.refreshTokenSession.create({
      data: {
        userId: uuid,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(decodedRefresh.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async blacklistAccessToken(jti: string, exp: number) {
    const expiresAt = new Date(exp * 1000);
    await this.prisma.tokenBlacklist.upsert({
      where: { jti },
      update: { expiresAt },
      create: { jti, expiresAt },
    });

    await this.prisma.tokenBlacklist.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
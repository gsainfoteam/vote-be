import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IdpService } from './idp.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
    const tokens = this.issueTokens(user.uuid, user.name);

    return {
      ...tokens,
      isNewUser: !user.nickname, // true if user hasn't set up their profile yet
    };
  }

  async refresh(refreshDto: RefreshDto) {
    try {
      const payload = this.jwtService.verify(refreshDto.refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const tokens = this.issueTokens(payload.sub, payload.name);
      return tokens;
    } catch {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
    }
  }

  private issueTokens(uuid: string, name: string) {
    const payload = { sub: uuid, name };
    const secret = this.configService.get<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: '5m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: '24h',
    });
    return { accessToken, refreshToken };
  }
}
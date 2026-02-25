import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: { sub: string; name: string; tokenType: string; jti?: string; exp?: number }) {
        if (payload.tokenType !== 'access') {
            throw new UnauthorizedException('유효하지 않은 Access Token입니다.');
        }

        if (payload.jti) {
            const blacklisted = await this.prisma.tokenBlacklist.findUnique({ where: { jti: payload.jti } });
            if (blacklisted && blacklisted.expiresAt > new Date()) {
                throw new UnauthorizedException('폐기된 Access Token입니다.');
            }
        }

        return { uuid: payload.sub, name: payload.name, jti: payload.jti, exp: payload.exp };
    }
}

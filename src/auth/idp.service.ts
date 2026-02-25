import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IdpService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async getUserInfo(idpToken: string) {
        const idpUrl = this.configService.get<string>('IDP_URL');
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${idpUrl}/userinfo`, {
                    headers: { Authorization: `Bearer ${idpToken}` },
                }),
            );
            return {
                uuid: data.sub as string,
                email: (data.email as string) || null,
                name: data.name as string,
                picture: (data.picture as string) || null,
                studentId: (data.student_id as string) || null,
            };
        } catch {
            throw new UnauthorizedException('IdP 인증에 실패했습니다.');
        }
    }
}

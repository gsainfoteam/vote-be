import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { code, codeVerifier } = loginDto;


    const tokenUrl = 'https://api.idp.gistory.me/oauth/token';
    const clientId = this.configService.get<string>('GIST_IDP_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GIST_IDP_CLIENT_SECRET');

 
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const tokenResponse = await lastValueFrom(
        this.httpService.post(
          tokenUrl,
          new URLSearchParams({
            code: code,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${basicAuth}`,
            },
          },
        ),
      );

      const accessToken = tokenResponse.data.access_token;


      const userInfoUrl = 'https://api.idp.gistory.me/oauth/userinfo';
      const userInfoResponse = await lastValueFrom(
        this.httpService.get(userInfoUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      const gistUser = userInfoResponse.data;


      console.log('GIST User Info:', gistUser); 
      
      return gistUser;

    } catch (error) {

      console.error('IdP Error:', error.response?.data || error.message);
      throw new UnauthorizedException('GIST 인증에 실패했습니다.');
    }
  }
}
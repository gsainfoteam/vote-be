import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { IdpService } from './idp.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    HttpModule,
    PassportModule,
    JwtModule.register({}), // Secret is passed per-call for flexibility
  ],
  controllers: [AuthController],
  providers: [AuthService, IdpService, JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule { }
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-auth0';
import { ConfigService } from '@nestjs/config';

class NullStateStore {
  store(req: any, callback: any) {
    callback(null, 'dummy_state');
  }
  verify(req: any, state: string, callback: any) {
    callback(null, true, 'dummy_state');
  }
}

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(private configService: ConfigService) {
    super({
      domain: configService.get<string>('auth.auth0Domain'),
      clientID: configService.get<string>('auth.auth0ClientId'),
      clientSecret: configService.get<string>('auth.auth0ClientSecret'),
      callbackURL: configService.get<string>('auth.auth0CallbackUrl'),
      scope: 'openid profile email',
      state: true,
      store: new NullStateStore(),
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: any,
  ) {
    console.log('Auth0 profile:', profile);

    return profile;
  }
}

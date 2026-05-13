import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { Inspector } from '../inspectors/inspector.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InspectorsService } from '../inspectors/inspectors.service';
import { AuthRegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly inspectorsService: InspectorsService,
    private readonly jwtService: JwtService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Inspector)
    private readonly inspectorRepository: Repository<Inspector>,
  ) {}

  async register(authRegisterDto: AuthRegisterDto) {
    const { email, password, name } = authRegisterDto;

    const existingUser = await this.inspectorsService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      const inspector = await this.inspectorsService.create({
        email,
        name,
        password_hash: hashedPassword,
      });

      const tokens = await this.generateTokens(inspector);

      return {
        user: {
          id: inspector.id,
          email: inspector.email,
          name: inspector.name,
          subscription_status: inspector.subscription_status,
        },
        ...tokens,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error registering new user');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Security best practice: generic error message for both cases
    const errorMessage = 'Invalid credentials';

    const inspector = await this.inspectorsService.findByEmail(email);
    if (!inspector) {
      throw new UnauthorizedException(errorMessage);
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      inspector.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(errorMessage);
    }

    const tokens = await this.generateTokens(inspector);

    return {
      user: {
        id: inspector.id,
        email: inspector.email,
        name: inspector.name,
        subscription_status: inspector.subscription_status,
      },
      ...tokens,
    };
  }

  async me(userId: string) {
    const inspector = await this.inspectorsService.findOne(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...result } = inspector;
    return result;
  }

  async generateTokens(user: any, userAgent?: string) {
    const payload = { sub: user.id, email: user.email };
    
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepository.create({
      inspector_id: user.id,
      hashed_refresh_token: hashedRefreshToken,
      user_agent: userAgent,
      expires_at: expiresAt,
    });
    await this.sessionRepository.save(session);

    return { access_token, refresh_token };
  }

  async refreshTokens(refreshToken: string, userAgent?: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const userId = payload.sub;

      const sessions = await this.sessionRepository.find({
        where: { inspector_id: userId },
      });

      let currentSession: Session | null = null;
      for (const session of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.hashed_refresh_token);
        if (isMatch) {
          currentSession = session;
          break;
        }
      }

      if (!currentSession || currentSession.expires_at < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Rotation: Delete old session
      await this.sessionRepository.delete(currentSession.id);

      // Create new session
      const user = await this.inspectorsService.findOne(userId);
      return this.generateTokens(user, userAgent);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      if (!payload || !payload.sub) return;

      const sessions = await this.sessionRepository.find({
        where: { inspector_id: payload.sub },
      });

      for (const session of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.hashed_refresh_token);
        if (isMatch) {
          await this.sessionRepository.delete(session.id);
          break;
        }
      }
    } catch (e) {
      // Ignore errors during logout
    }
  }
}


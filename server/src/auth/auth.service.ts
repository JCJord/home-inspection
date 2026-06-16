import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from './session.entity';
import { Inspector } from '../inspectors/inspector.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InspectorsService } from '../inspectors/inspectors.service';
import { AuthRegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { InviteCodeService } from './invite-code.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly inspectorsService: InspectorsService,
    private readonly jwtService: JwtService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Inspector)
    private readonly inspectorRepository: Repository<Inspector>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly inviteCodeService: InviteCodeService,
  ) {}

  async register(authRegisterDto: AuthRegisterDto) {
    const { email, password, name } = authRegisterDto;

    const existingUser = await this.inspectorsService.findByEmail(email);
    if (existingUser && existingUser.is_email_verified) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      const inspector = await this.inspectorRepository.manager.transaction(async (manager) => {

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        let saved;
        if (existingUser && !existingUser.is_email_verified) {
          // Overwrite the unverified user
          existingUser.name = name;
          existingUser.password_hash = hashedPassword;
          existingUser.email_verification_token = hashedToken;
          existingUser.email_verification_expires = expiresAt;
          saved = await manager.save(existingUser);
        } else {
          // Create the user manually via manager to participate in the transaction
          const newInspector = this.inspectorRepository.create({
            email,
            name,
            password_hash: hashedPassword,
            is_email_verified: false,
            email_verification_token: hashedToken,
            email_verification_expires: expiresAt,
          });
          saved = await manager.save(newInspector);
        }

        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
        const verifyLink = `${frontendUrl}/auth/confirm-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
        await this.mailService.sendEmailVerification(email, verifyLink, name);

        return saved;
      });

      return {
        message: 'Registration successful. Please check your email to verify your account.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
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

    if (!inspector.is_email_verified) {
      throw new UnauthorizedException('Email not verified. Please check your inbox.');
    }

    const tokens = await this.generateTokens(inspector);

    return {
      user: {
        id: inspector.id,
        email: inspector.email,
        name: inspector.name,
      },
      ...tokens,
    };
  }

  async verifyEmail(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const inspector = await this.inspectorRepository.findOne({
      where: { email_verification_token: hashedToken },
    });

    if (!inspector) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (inspector.is_email_verified) {
      const tokens = await this.generateTokens(inspector);
      return {
        user: {
          id: inspector.id,
          email: inspector.email,
          name: inspector.name,
        },
        ...tokens,
      };
    }

    if (inspector.email_verification_expires && inspector.email_verification_expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    inspector.is_email_verified = true;
    inspector.email_verification_token = null as any;
    inspector.email_verification_expires = null as any;
    await this.inspectorRepository.save(inspector);

    const tokens = await this.generateTokens(inspector);

    return {
      user: {
        id: inspector.id,
        email: inspector.email,
        name: inspector.name,
      },
      ...tokens,
    };
  }

  async validateOAuthUser(profile: any) {
    const { email, firstName, lastName, googleId } = profile;
    const existingUser = await this.inspectorsService.findByEmail(email);

    if (existingUser) {
      if (!existingUser.google_id) {
        existingUser.google_id = googleId;
        await this.inspectorRepository.save(existingUser);
      }
      if (!existingUser.is_email_verified) {
        existingUser.is_email_verified = true;
        await this.inspectorRepository.save(existingUser);
      }
      return existingUser;
    }

    const newInspector = this.inspectorRepository.create({
      email,
      name: `${firstName} ${lastName}`.trim(),
      google_id: googleId,
      is_email_verified: true,
    });
    
    return await this.inspectorRepository.save(newInspector);
  }

  async resendVerificationEmail(email: string) {
    const inspector = await this.inspectorsService.findByEmail(email);
    if (!inspector) {
      // Prevent email enumeration
      return { message: 'If the account exists, a verification email has been sent.' };
    }

    if (inspector.is_email_verified) {
      throw new BadRequestException('Email is already verified.');
    }

    if (inspector.email_verification_expires) {
      const twoMinutesAgoExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000 - 2 * 60 * 1000);
      if (inspector.email_verification_expires > twoMinutesAgoExpiration) {
        throw new BadRequestException('Please wait before requesting another email');
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    inspector.email_verification_token = hashedToken;
    inspector.email_verification_expires = expiresAt;
    await this.inspectorRepository.save(inspector);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const verifyLink = `${frontendUrl}/auth/confirm-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
    await this.mailService.sendEmailVerification(email, verifyLink, inspector.name);

    return { message: 'Verification email sent.' };
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

    // Use SHA-256 to avoid bcrypt's 72-byte string limit which silently truncates JWTs!
    const hashedRefreshToken = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Clean up old expired sessions for this user to prevent DB bloat
    await this.sessionRepository.delete({
      inspector_id: user.id,
      expires_at: LessThan(new Date()),
    });

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

      // Clean up old expired sessions to prevent matching them
      await this.sessionRepository.delete({
        inspector_id: userId,
        expires_at: LessThan(new Date()),
      });

      const sessions = await this.sessionRepository.find({
        where: { inspector_id: userId },
        order: { expires_at: 'DESC' },
      });

      let currentSession: Session | null = null;
      for (const session of sessions) {
        let isMatch = false;
        if (session.hashed_refresh_token.startsWith('$2b$') || session.hashed_refresh_token.startsWith('$2a$')) {
          isMatch = await bcrypt.compare(refreshToken, session.hashed_refresh_token);
        } else {
          const hashedInput = crypto.createHash('sha256').update(refreshToken).digest('hex');
          isMatch = (hashedInput === session.hashed_refresh_token);
        }

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
      const tokens = await this.generateTokens(user, userAgent);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      if (!payload || !payload.sub) return;

      const userId = payload.sub;

      await this.sessionRepository.delete({
        inspector_id: userId,
        expires_at: LessThan(new Date()),
      });

      const sessions = await this.sessionRepository.find({
        where: { inspector_id: userId },
        order: { expires_at: 'DESC' },
      });

      for (const session of sessions) {
        let isMatch = false;
        if (session.hashed_refresh_token.startsWith('$2b$') || session.hashed_refresh_token.startsWith('$2a$')) {
          isMatch = await bcrypt.compare(refreshToken, session.hashed_refresh_token);
        } else {
          const hashedInput = crypto.createHash('sha256').update(refreshToken).digest('hex');
          isMatch = (hashedInput === session.hashed_refresh_token);
        }
        
        if (isMatch) {
          await this.sessionRepository.delete(session.id);
          break;
        }
      }
    } catch (e) {
      // Ignore errors during logout
    }
  }

  async forgotPassword(email: string) {
    const inspector = await this.inspectorsService.findByEmail(email);
    if (!inspector) {
      // Generic success to prevent email enumeration
      return { message: 'If an account exists, a recovery link has been sent to the provided email.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    inspector.reset_password_token = hashedToken;
    inspector.reset_password_expires = expiresAt;
    await this.inspectorRepository.save(inspector);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    await this.mailService.sendPasswordResetEmail(email, resetLink);

    return { message: 'If an account exists, a recovery link has been sent to the provided email.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const inspector = await this.inspectorRepository.findOne({
      where: { reset_password_token: hashedToken },
    });

    if (!inspector) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (inspector.reset_password_expires < new Date()) {
      inspector.reset_password_token = null as any;
      inspector.reset_password_expires = null as any;
      await this.inspectorRepository.save(inspector);
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    inspector.password_hash = hashedPassword;
    inspector.reset_password_token = null as any;
    inspector.reset_password_expires = null as any;
    await this.inspectorRepository.save(inspector);

    return { message: 'Password has been reset successfully' };
  }
}


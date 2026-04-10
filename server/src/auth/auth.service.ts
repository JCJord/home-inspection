import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
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

      const payload = { sub: inspector.id, email: inspector.email };
      const access_token = await this.jwtService.signAsync(payload);

      return {
        user: {
          id: inspector.id,
          email: inspector.email,
          name: inspector.name,
        },
        access_token,
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

    const payload = { sub: inspector.id, email: inspector.email };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: inspector.id,
        email: inspector.email,
        name: inspector.name,
      },
      access_token,
    };
  }

  async me(userId: string) {
    const inspector = await this.inspectorsService.findOne(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...result } = inspector;
    return result;
  }
}


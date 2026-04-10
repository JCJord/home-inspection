import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InspectorsService } from '../inspectors/inspectors.service';
import { AuthRegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly inspectorsService: InspectorsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(authRegisterDto: AuthRegisterDto) {
    const { email, password, name } = authRegisterDto;

    // Check if email already exists
    const existingUser = await this.inspectorsService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      // Create and save the new inspector
      const inspector = await this.inspectorsService.create({
        email,
        name,
        password_hash: hashedPassword,
      });

      // Generate JWT
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
}

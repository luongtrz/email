import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class GmailAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.googleRefreshToken) {
      throw new UnauthorizedException('Gmail account not connected. Please connect your Gmail account first.');
    }

    // Attach user with Gmail tokens to request
    request.user = dbUser;

    return true;
  }
}


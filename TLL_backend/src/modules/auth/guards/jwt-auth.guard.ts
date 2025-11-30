import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Extract token from request for logging/debugging
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token && !isPublic) {
      throw new UnauthorizedException('No token provided');
    }

    // Attach token to request for later use
    request.token = token;

    return super.canActivate(context);
  }

  /**
   * Extract JWT token from cookie or Authorization header
   * Priority: Cookie > Authorization header
   */
  private extractTokenFromHeader(request: any): string | undefined {
    // First try to get token from cookie (set by Google OAuth callback)
    if (request.cookies?.accessToken) {
      return request.cookies.accessToken;
    }

    // Fallback to Authorization header (for API clients)
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      // Provide more specific error messages based on the error type
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      }
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    // Extract and format user information similar to auth.service.ts
    // The user is already fetched from database by JwtStrategy.validate()
    // Return the full user entity so it's available in the request
    const request = context.switchToHttp().getRequest();
    
    // Ensure token is attached to request
    if (!request.token) {
      request.token = this.extractTokenFromHeader(request);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      googleId: user.googleId,
      // Include full user object for backward compatibility
      ...user,
    };
  }
}

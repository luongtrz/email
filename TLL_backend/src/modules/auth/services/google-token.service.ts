import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class GoogleTokenService {
  private oauth2Client: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    const googleConfig = this.configService.get('app.google');
    this.oauth2Client = new OAuth2Client(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri,
    );
  }

  /**
   * Get valid access token for user, refreshing if necessary
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.googleRefreshToken) {
      throw new UnauthorizedException('Gmail account not connected. Please connect your Gmail account.');
    }

    // Check if token is expired or will expire in the next 5 minutes
    const now = new Date();
    const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

    if (!user.googleTokenExpiry || user.googleTokenExpiry <= expiryBuffer) {
      // Token expired or about to expire, refresh it
      await this.refreshAccessToken(userId);
      // Reload user to get new token
      const refreshedUser = await this.userRepository.findOne({
        where: { id: userId },
      });
      return refreshedUser.googleAccessToken;
    }

    return user.googleAccessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.googleRefreshToken) {
      throw new UnauthorizedException('No refresh token available');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: user.googleRefreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update user with new tokens
      const expiryDate = new Date();
      if (credentials.expiry_date) {
        expiryDate.setTime(credentials.expiry_date);
      } else {
        expiryDate.setSeconds(expiryDate.getSeconds() + 3600); // Default 1 hour
      }

      await this.userRepository.update(userId, {
        googleAccessToken: credentials.access_token,
        googleRefreshToken: credentials.refresh_token || user.googleRefreshToken,
        googleTokenExpiry: expiryDate,
      });
    } catch (error) {
      // Refresh token is invalid, user needs to re-authenticate
      await this.userRepository.update(userId, {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      });
      throw new UnauthorizedException('Gmail access expired. Please reconnect your Gmail account.');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: Date;
    userInfo: any;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new UnauthorizedException('Failed to obtain access token');
      }

      // Get user info - prefer ID token (works with Gmail scopes), fallback to userinfo endpoint
      this.oauth2Client.setCredentials(tokens);
      let userInfo: any;
      
      // Try ID token first (works even with just Gmail scopes)
      if (tokens.id_token) {
        try {
          const ticket = await this.oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: this.configService.get('app.google.clientId'),
          });
          const idTokenPayload = ticket.getPayload();
          if (idTokenPayload?.email) {
            userInfo = idTokenPayload;
          }
        } catch (idTokenError) {
          console.warn('ID token verification failed, trying userinfo endpoint:', idTokenError.message);
        }
      }

      // Fallback to userinfo endpoint if ID token didn't work
      if (!userInfo || !userInfo.email) {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });

          if (response.ok) {
            const userinfoData = await response.json();
            if (userinfoData?.email) {
              userInfo = userinfoData;
            }
          } else {
            console.warn(`Userinfo API returned ${response.status}: ${response.statusText}`);
          }
        } catch (userinfoError) {
          console.warn('Userinfo endpoint failed:', userinfoError.message);
        }
      }

      // If still no email, throw error
      if (!userInfo || !userInfo.email) {
        throw new Error('User email not found in Google response. The OAuth token may not include email scope.');
      }

      const expiryDate = new Date();
      if (tokens.expiry_date) {
        expiryDate.setTime(tokens.expiry_date);
      } else {
        expiryDate.setSeconds(expiryDate.getSeconds() + 3600); // Default 1 hour
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate,
        userInfo,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to exchange authorization code: ' + error.message);
    }
  }

  /**
   * Get OAuth2 client instance
   */
  getOAuth2Client(): OAuth2Client {
    return this.oauth2Client;
  }

  /**
   * Generate authorization URL
   */
  generateAuthUrl(state?: string): string {
    const googleConfig = this.configService.get('app.google');
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: googleConfig.scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: state || undefined,
    });
  }
}


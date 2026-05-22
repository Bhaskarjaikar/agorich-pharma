import bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';
import { UserRepository } from '../repositories/userRepository';
import { AuthRepository } from '../repositories/authRepository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { config } from '../config';

export class AuthService {
  private userRepository: UserRepository;
  private authRepository: AuthRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.authRepository = new AuthRepository();
  }

  async signup(data: {
    email: string;
    password: string;
    name: string;
    mobile: string;
    role: UserRole;
    gstNumber?: string;
    dlNumber?: string;
    address?: string;
    territory?: string;
  }) {
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const existingMobile = await this.userRepository.findByMobile(data.mobile);
    if (existingMobile) {
      throw new Error('Mobile number already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      mobile: data.mobile,
      role: data.role,
      gstNumber: data.gstNumber,
      dlNumber: data.dlNumber,
      address: data.address,
      territory: data.territory,
    });

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await this.authRepository.createRefreshToken({
      token: refreshToken,
      user: { connect: { id: user.id } },
      expiresAt: refreshTokenExpiry,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active');
    }

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await this.authRepository.createRefreshToken({
      token: refreshToken,
      user: { connect: { id: user.id } },
      expiresAt: refreshTokenExpiry,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshTokenStr: string) {
    const payload = verifyRefreshToken(refreshTokenStr);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    const storedToken = await this.authRepository.findRefreshToken(refreshTokenStr);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token expired');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new Error('User not found or inactive');
    }

    await this.authRepository.deleteRefreshToken(refreshTokenStr);

    const newAccessToken = generateAccessToken(user.id, user.email, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await this.authRepository.createRefreshToken({
      token: newRefreshToken,
      user: { connect: { id: user.id } },
      expiresAt: refreshTokenExpiry,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenStr: string) {
    try {
      await this.authRepository.deleteRefreshToken(refreshTokenStr);
    } catch (error) {
    }
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.authRepository.deleteAllRefreshTokensForUser(userId);
    return { message: 'Logged out from all devices' };
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

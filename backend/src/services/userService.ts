import { User, UserRole, UserStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/userRepository';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(data: {
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

    return this.userRepository.create({
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
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return this.sanitizeUser(user);
  }

  async getUsers(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    territory?: string;
  }) {
    const [users, total] = await Promise.all([
      this.userRepository.findAll(params),
      this.userRepository.count(params),
    ]);

    return {
      users: users.map(this.sanitizeUser),
      total,
      page: params.page || 1,
      limit: params.limit || 10,
    };
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.userRepository.findByEmail(data.email as string);
      if (existing) {
        throw new Error('Email already exists');
      }
    }

    if (data.mobile && data.mobile !== user.mobile) {
      const existing = await this.userRepository.findByMobile(data.mobile as string);
      if (existing) {
        throw new Error('Mobile number already exists');
      }
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 12);
    }

    const updatedUser = await this.userRepository.update(id, data);
    return this.sanitizeUser(updatedUser);
  }

  async deactivateUser(id: string) {
    return this.updateUser(id, { status: 'INACTIVE' });
  }

  async activateUser(id: string) {
    return this.updateUser(id, { status: 'ACTIVE' });
  }

  async assignTerritory(id: string, territory: string) {
    return this.updateUser(id, { territory });
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

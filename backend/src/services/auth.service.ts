import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL ERROR: JWT_SECRET must be defined in production environment variables.');
}
const SECRET_TO_USE = JWT_SECRET || 'dasha_super_secret_key_2026_fepro';

export class AuthService {
  static async register(data: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('El correo ya está registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_TO_USE, {
      expiresIn: '7d',
    });

    return { user, token };
  }

  static async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);

    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_TO_USE, {
      expiresIn: '7d',
    });

    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return { user: userWithoutPassword, token };
  }

  static generateToken(user: { id: string; role: string }) {
    return jwt.sign({ id: user.id, role: user.role }, SECRET_TO_USE, {
      expiresIn: '7d',
    });
  }
}

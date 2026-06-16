import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, studentNumber } = req.body;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        student: studentNumber ? {
          create: {
            studentNumber,
            gradeLevel: 10,
            className: 'A',
            dateOfBirth: new Date('2010-01-01'),
            gender: 'F',
          }
        } : undefined,
      },
      include: { student: true },
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.json({
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};
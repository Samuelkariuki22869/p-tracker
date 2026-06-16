import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const createGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, subjectId, gradeType, score, maxScore = 100, comments } = req.body;
    
    // Calculate grade letter
    const percentage = (score / maxScore) * 100;
    const gradeLetter = percentage >= 90 ? 'A+' 
      : percentage >= 80 ? 'A' 
      : percentage >= 70 ? 'B' 
      : percentage >= 60 ? 'C' 
      : percentage >= 50 ? 'D' 
      : 'F';
    
    const grade = await prisma.grade.create({
      data: {
        studentId,
        subjectId,
        teacherId: req.user!.id,
        gradeType,
        score,
        maxScore,
        gradeLetter,
        comments,
      },
      include: { student: true, subject: true },
    });
    
    // Check for low performance notification
    if (percentage < 50) {
      await prisma.notification.create({
        data: {
          userId: grade.student.userId,
          type: 'LOW_GRADE',
          title: 'Low Grade Alert',
          message: `Your grade in ${subjectId} is below 50% (${percentage.toFixed(1)}%)`,
          priority: 'HIGH',
        },
      });
    }
    
    res.status(201).json(grade);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create grade' });
  }
};

export const getStudentGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: { 
        subject: { select: { name: true, code: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: { recordedAt: 'desc' },
    });
    
    // Calculate average
    const average = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
    
    res.json({
      grades,
      average: average || 0,
      count: grades.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

export const updateGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { score, maxScore, comments, gradeType } = req.body;
    
    // Calculate new grade letter
    const percentage = (score / maxScore) * 100;
    const gradeLetter = percentage >= 90 ? 'A+' 
      : percentage >= 80 ? 'A' 
      : percentage >= 70 ? 'B' 
      : percentage >= 60 ? 'C' 
      : percentage >= 50 ? 'D' 
      : 'F';
    
    const grade = await prisma.grade.update({
      where: { id },
      data: { score, maxScore, comments, gradeType, gradeLetter },
      include: { student: true, subject: true },
    });
    
    res.json(grade);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update grade' });
  }
};

export const getClassAverage = async (req: AuthRequest, res: Response) => {
  try {
    const { className } = req.params;
    
    const students = await prisma.student.findMany({
      where: { className },
      select: { id: true },
    });
    
    const studentIds = students.map(s => s.id);
    
    const grades = await prisma.grade.findMany({
      where: { studentId: { in: studentIds } },
      select: { score: true },
    });
    
    const average = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
    
    res.json({
      className,
      average: average || 0,
      totalGrades: grades.length,
      totalStudents: students.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate class average' });
  }
};
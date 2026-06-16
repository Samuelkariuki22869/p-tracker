import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.user!;
    
    let where: any = {};
    
    // Filter by role
    if (role === Role.TEACHER) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user!.id },
        select: { id: true },
      });
      where = { teacherId: teacher?.id };
    }
    
    // Get all grades
    const grades = await prisma.grade.findMany({
      where,
      include: { student: true, subject: true },
    });
    
    // Calculate average grade
    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length 
      : 0;
    
    // Get attendance stats
    const attendance = await prisma.attendance.findMany({
      where: {
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    
    const attendanceRate = attendance.length > 0
      ? (attendance.filter(a => a.status === 'PRESENT').length / attendance.length) * 100
      : 100;
    
    // Get top performers
    const studentGrades = await prisma.grade.groupBy({
      by: ['studentId'],
      avg: { score: true },
      count: { score: true },
    });
    
    const topPerformers = studentGrades
      .sort((a, b) => b.avg.score - a.avg.score)
      .slice(0, 5)
      .map(g => {
        const student = grades.find(grade => grade.studentId === g.studentId)?.student;
        return {
          id: g.studentId,
          name: `${student?.firstName} ${student?.lastName}`,
          average: g.avg.score,
          gradesCount: g.count.score,
        };
      });
    
    // Get low performers (for notifications)
    const lowPerformers = studentGrades
      .filter(g => g.avg.score < 50)
      .slice(0, 5)
      .map(g => {
        const student = grades.find(grade => grade.studentId === g.studentId)?.student;
        return {
          id: g.studentId,
          name: `${student?.firstName} ${student?.lastName}`,
          average: g.avg.score,
        };
      });
    
    // Get subject breakdown
    const subjectBreakdown = await prisma.grade.groupBy({
      by: ['subjectId'],
      avg: { score: true },
    });
    
    const subjects = subjectBreakdown.map(g => {
      const subject = grades.find(grade => grade.subjectId === g.subjectId)?.subject;
      return {
        id: g.subjectId,
        name: subject?.name,
        average: g.avg.score,
      };
    });
    
    res.json({
      averageGrade: averageGrade,
      attendanceRate: attendanceRate,
      topPerformers: topPerformers,
      lowPerformers: lowPerformers,
      subjectBreakdown: subjects,
      totalStudents: await prisma.student.count(),
      totalSubjects: await prisma.subject.count(),
      totalGrades: grades.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
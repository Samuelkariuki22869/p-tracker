import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const recordAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, date, status, notes } = req.body;
    
    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        date: new Date(date),
        status,
        recordedBy: req.user!.id,
        notes,
      },
      include: { student: true },
    });
    
    // Check for absenteeism notification
    if (status === 'ABSENT') {
      const recentAbsences = await prisma.attendance.count({
        where: {
          studentId,
          status: 'ABSENT',
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });
      
      if (recentAbsences >= 3) {
        await prisma.notification.create({
          data: {
            userId: attendance.student.userId,
            type: 'ABSENTNESS',
            title: 'High Absenteeism Alert',
            message: `You have been absent ${recentAbsences} times in the last 7 days`,
            priority: 'HIGH',
          },
        });
      }
    }
    
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where: any = { studentId };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
    
    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    
    // Calculate attendance rate
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const rate = total > 0 ? (present / total) * 100 : 100;
    
    res.json({
      attendance,
      total: total,
      present: present,
      absent: attendance.filter(a => a.status === 'ABSENT').length,
      late: attendance.filter(a => a.status === 'LATE').length,
      attendanceRate: rate,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const getClassAttendanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { className } = req.params;
    
    const students = await prisma.student.findMany({
      where: { className },
      select: { id: true, firstName: true, lastName: true },
    });
    
    const studentIds = students.map(s => s.id);
    
    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
    });
    
    const summary = students.map(student => {
      const studentAttendance = attendance.filter(a => a.studentId === student.id);
      const total = studentAttendance.length;
      const present = studentAttendance.filter(a => a.status === 'PRESENT').length;
      const rate = total > 0 ? (present / total) * 100 : 100;
      
      return {
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        totalDays: total,
        presentDays: present,
        attendanceRate: rate,
      };
    });
    
    const classAverage = summary.reduce((sum, s) => sum + s.attendanceRate, 0) / summary.length;
    
    res.json({
      className,
      students: summary,
      classAverage: classAverage || 0,
      totalStudents: summary.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class attendance' });
  }
};
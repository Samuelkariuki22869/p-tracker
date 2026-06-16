import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { PDFDocument, rgb } from 'pdf-lib';
import { stringify } from 'csv-stringify/sync';

export const exportStudentReportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { grades: { include: { subject: true } }, attendance: true },
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Calculate average
    const average = student.grades.length > 0
      ? student.grades.reduce((sum, g) => sum + g.score, 0) / student.grades.length
      : 0;
    
    const attendanceRate = student.attendance.length > 0
      ? (student.attendance.filter(a => a.status === 'PRESENT').length / student.attendance.length) * 100
      : 100;
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    
    // Draw content
    page.drawText('Student Performance Report', {
      x: 50,
      y: height - 50,
      size: 24,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Name: ${student.firstName} ${student.lastName}`, {
      x: 50,
      y: height - 100,
      size: 16,
    });
    
    page.drawText(`Grade: ${student.gradeLevel} | Class: ${student.className}`, {
      x: 50,
      y: height - 130,
      size: 16,
    });
    
    page.drawText(`Overall Average: ${average.toFixed(1)}%`, {
      x: 50,
      y: height - 180,
      size: 18,
    });
    
    page.drawText(`Attendance Rate: ${attendanceRate.toFixed(1)}%`, {
      x: 50,
      y: height - 210,
      size: 18,
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${studentId}.pdf`);
    res.send(pdfBytes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export PDF' });
  }
};

export const exportStudentReportCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { grades: { include: { subject: true } } },
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const data = student.grades.map(grade => ({
      Subject: grade.subject.name,
      Grade_Type: grade.gradeType,
      Score: grade.score,
      Max_Score: grade.maxScore,
      Grade_Letter: grade.gradeLetter,
      Comments: grade.comments || '',
      Date: grade.recordedAt.toISOString(),
    }));
    
    const csv = stringify(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${studentId}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};
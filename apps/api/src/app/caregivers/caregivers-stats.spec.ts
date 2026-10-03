import * as fs from 'fs';
import * as path from 'path';
import { CaregiversService } from './caregivers.service';
import { Caregiver } from './entities/caregiver.entity';
import { NotFoundException } from '@nestjs/common';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';

describe('Phase 8.3 — Caregiver Rolling Average Rating & Jobs Completed Stats', () => {
  const migrationPath = path.join(
    __dirname,
    '../../database/migrations/013_caregiver_rating_and_jobs_completed.sql'
  );

  describe('PostgreSQL Migration 013 Schema Verification', () => {
    it('should have migration file 013_caregiver_rating_and_jobs_completed.sql present', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('should define average_rating, total_ratings, and jobs_completed columns', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS total_ratings INTEGER NOT NULL DEFAULT 0');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS jobs_completed INTEGER NOT NULL DEFAULT 0');
    });

    it('should configure performance indexes for ratings and jobs sorting', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_rating ON caregivers (tenant_id, average_rating DESC);');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_jobs ON caregivers (tenant_id, jobs_completed DESC);');
    });

    it('should include backfill queries from assignments and feedback tables', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('UPDATE caregivers c');
      expect(sql).toContain("WHERE a.caregiver_id = c.id");
      expect(sql).toContain("AND a.status = 'completed'");
      expect(sql).toContain("SELECT ROUND(AVG(fb.rating)::numeric, 2)");
      expect(sql).toContain("WHERE fb.caregiver_id = c.id");
    });
  });

  describe('CaregiversService.recalculateCaregiverStats', () => {
    let service: CaregiversService;
    let mockCaregiverRepo: any;
    let mockFeedbackRepo: any;
    let mockAssignmentRepo: any;

    beforeEach(() => {
      mockCaregiverRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'cg-123',
          tenantId: 'tenant-123',
          fullName: 'Anitha Nair',
          averageRating: 0,
          totalRatings: 0,
          jobsCompleted: 0,
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      const feedbackQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          count: '4',
          avg: '4.75',
        }),
      };

      mockFeedbackRepo = {
        createQueryBuilder: jest.fn(() => feedbackQb),
      };

      const assignmentQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(12),
      };

      mockAssignmentRepo = {
        createQueryBuilder: jest.fn(() => assignmentQb),
      };

      service = new CaregiversService(
        {} as any,
        mockCaregiverRepo,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        undefined,
        mockFeedbackRepo,
        mockAssignmentRepo
      );
    });

    it('should compute rolling average rating and completed jobs accurately', async () => {
      const result = await service.recalculateCaregiverStats('cg-123', 'tenant-123');

      expect(result).toEqual({
        averageRating: 4.75,
        totalRatings: 4,
        jobsCompleted: 12,
      });

      expect(mockCaregiverRepo.update).toHaveBeenCalledWith(
        { id: 'cg-123' },
        {
          averageRating: 4.75,
          totalRatings: 4,
          jobsCompleted: 12,
        }
      );
    });

    it('should handle zero feedback reviews gracefully', async () => {
      mockFeedbackRepo.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          count: '0',
          avg: null,
        }),
      }));

      const result = await service.recalculateCaregiverStats('cg-123', 'tenant-123');

      expect(result.averageRating).toBe(0);
      expect(result.totalRatings).toBe(0);
      expect(result.jobsCompleted).toBe(12);
    });

    it('should throw NotFoundException if caregiver does not exist', async () => {
      mockCaregiverRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.recalculateCaregiverStats('cg-nonexistent', 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Caregiver Entity Instantiation', () => {
    it('should contain averageRating, totalRatings, and jobsCompleted default properties', () => {
      const cg = new Caregiver();
      cg.id = 'cg-1';
      cg.averageRating = 4.8;
      cg.totalRatings = 15;
      cg.jobsCompleted = 20;

      expect(cg.averageRating).toBe(4.8);
      expect(cg.totalRatings).toBe(15);
      expect(cg.jobsCompleted).toBe(20);
    });
  });
});

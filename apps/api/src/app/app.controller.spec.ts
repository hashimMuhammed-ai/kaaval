import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SKIP_TENANT_SESSION_KEY } from './common/decorators/tenant-session.decorator';
import { IS_PUBLIC_KEY } from './common/decorators/public.decorator';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      expect(appController.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('getHealth', () => {
    it('should return static health check status', () => {
      const health = appController.getHealth();
      expect(health).toEqual({
        status: 'ok',
        service: 'caregiver-agency-api',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should be decorated with @SkipTenantSession and @Public', () => {
      const skipSession = Reflect.getMetadata(
        SKIP_TENANT_SESSION_KEY,
        appController.getHealth
      );
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        appController.getHealth
      );

      expect(skipSession).toBe(true);
      expect(isPublic).toBe(true);
    });
  });
});

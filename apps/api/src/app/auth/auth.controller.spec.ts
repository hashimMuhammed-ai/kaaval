import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '../common/enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate login to AuthService', async () => {
    const dto = { email: 'owner@keralacare.com', password: 'Password123!' };
    const mockResponse: any = {
      accessToken: 'sample-jwt',
      tokenType: 'Bearer',
      user: { role: UserRole.OWNER },
    };

    mockAuthService.login.mockResolvedValue(mockResponse);

    const result = await controller.login(dto);
    expect(result).toBe(mockResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });

  it('should delegate getProfile to AuthService with user id', async () => {
    const mockProfile: any = { id: 'usr-1', name: 'Rahul' };
    mockAuthService.getProfile.mockResolvedValue(mockProfile);

    const result = await controller.getProfile('usr-1');
    expect(result).toBe(mockProfile);
    expect(mockAuthService.getProfile).toHaveBeenCalledWith('usr-1');
  });
});

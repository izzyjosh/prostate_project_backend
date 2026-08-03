import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { UpdateAdminSettingDto } from './dto/admin-action.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('clinicians/:id/approve')
  approveClinician(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.adminService.approveClinician(id, user.sub);
  }

  @Patch('clinicians/:id/reject')
  rejectClinician(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.adminService.rejectClinician(id, user.sub);
  }

  @Get('assessments')
  listAssessments() {
    return this.adminService.listAssessments();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings/:key')
  updateSetting(@Param('key') key: string, @Body() dto: UpdateAdminSettingDto) {
    return this.adminService.upsertSetting(key, dto);
  }
}

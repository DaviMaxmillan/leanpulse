import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private assertSuperAdmin(req: any) {
    if (req.user.role !== 'SUPERADMIN') throw new UnauthorizedException('Somente o SuperAdmin pode realizar esta ação.');
  }

  @Post('teachers')
  createTeacher(@Request() req: any, @Body() body: { email: string; password: string; name: string }) {
    this.assertSuperAdmin(req);
    return this.usersService.createTeacher(body.email, body.password, body.name);
  }

  @Patch('teachers/:id')
  updateTeacher(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; password?: string },
  ) {
    this.assertSuperAdmin(req);
    return this.usersService.updateTeacher(id, body);
  }

  @Delete('teachers/:id')
  deleteTeacher(@Request() req: any, @Param('id') id: string) {
    this.assertSuperAdmin(req);
    return this.usersService.deleteTeacher(id);
  }

  @Get('teachers')
  findAllTeachers(@Request() req: any) {
    this.assertSuperAdmin(req);
    return this.usersService.findAllTeachers();
  }
}

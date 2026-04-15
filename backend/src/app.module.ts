import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExamsModule } from './exams/exams.module';
import { SessionsModule } from './sessions/sessions.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { AiModule } from './ai/ai.module';
import { ClassesModule } from './classes/classes.module';
import { ActivitiesModule } from './activities/activities.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LessonPlansModule } from './lesson-plans/lesson-plans.module';

@Module({
  imports: [
    PrismaModule, AuthModule, ExamsModule, SessionsModule,
    MonitoringModule, EmailModule, UsersModule, RoomsModule,
    AiModule, ClassesModule, ActivitiesModule,
    AttendanceModule, LessonPlansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


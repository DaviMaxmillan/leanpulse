import { Module } from '@nestjs/common';
import { MonitoringGateway } from './monitoring.gateway';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  providers: [MonitoringGateway]
})
export class MonitoringModule {}

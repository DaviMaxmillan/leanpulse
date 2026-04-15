import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from '../sessions/sessions.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class MonitoringGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sessionsService: SessionsService) {}

  @SubscribeMessage('join_exam_room')
  handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(`room_${data.roomId}`);
  }

  @SubscribeMessage('report_violation')
  async handleViolation(@MessageBody() data: { roomId: string; sessionId: string; type: string; screenshot?: string }) {
    await this.sessionsService.recordViolation(data.sessionId, data.type, data.screenshot);
    await this.sessionsService.blockSession(data.sessionId);
    
    // Broadcast to teacher's monitoring view
    this.server.to(`room_${data.roomId}`).emit('violation_alert', {
      sessionId: data.sessionId,
      type: data.type,
      time: new Date().toISOString(),
      hasScreenshot: !!data.screenshot,
    });

    // Notify the student's own session to block their UI immediately
    this.server.emit('status_update', 'blocked');
  }
}

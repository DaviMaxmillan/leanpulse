import { Server, Socket } from 'socket.io';
import { SessionsService } from '../sessions/sessions.service';
export declare class MonitoringGateway {
    private readonly sessionsService;
    server: Server;
    constructor(sessionsService: SessionsService);
    handleJoinRoom(data: {
        roomId: string;
    }, client: Socket): void;
    handleViolation(data: {
        roomId: string;
        sessionId: string;
        type: string;
        screenshot?: string;
    }): Promise<void>;
}

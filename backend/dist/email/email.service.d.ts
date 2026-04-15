export declare class EmailService {
    private transporter;
    private readonly logger;
    constructor();
    private initializeTransporter;
    private get from();
    sendExamReport(to: string, studentName: string, examTitle: string, rawScore: number, finalGrade: number, weight: number, excelBuffer: Buffer, fileName: string): Promise<any>;
}

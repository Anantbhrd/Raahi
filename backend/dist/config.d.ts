export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly dbPath: string;
    readonly demoMode: boolean;
    admin: {
        readonly username: string;
        readonly password: string;
    };
    session: {
        readonly secret: string;
    };
    readonly deviceApiKeys: string[];
    cors: {
        readonly origin: string;
    };
    readonly staleTimeoutSec: number;
    readonly telemetryHistoryDays: number;
    eta: {
        readonly defaultSpeedKmph: number;
    };
};
//# sourceMappingURL=config.d.ts.map
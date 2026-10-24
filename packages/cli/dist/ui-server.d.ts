import http from "node:http";
export declare function createAmberUiServer(port?: number): {
    server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    listen: () => Promise<void>;
};
//# sourceMappingURL=ui-server.d.ts.map
export declare function validateMineruToken(apiPrefix: string, payload: {
    mineru_token: string;
}): Promise<any>;
export declare function validatePaddleToken(apiPrefix: string, payload: unknown): Promise<any>;
export declare function validateDeepSeekToken(apiPrefix: string, payload: unknown): Promise<any>;
export declare function queryDeepSeekBalance(apiPrefix: string, payload: unknown): Promise<any>;

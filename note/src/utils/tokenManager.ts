interface TokenData {
    token: string;
    expiresAt: number;
}

const TOKEN_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const TOKEN_EXPIRY_TIME = 12 * 60 * 60 * 1000; // 12小时过期

export const tokenManager = {
    setToken(token: string) {
        const expiresAt = Date.now() + TOKEN_EXPIRY_TIME;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
    },

    getToken(): string | null {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (!token || !expiresAt) {
            return null;
        }

        // 检查是否过期
        if (Date.now() > parseInt(expiresAt)) {
            this.removeToken();
            return null;
        }

        return token;
    },

    removeToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
    },

    isTokenValid(): boolean {
        return this.getToken() !== null;
    }
};
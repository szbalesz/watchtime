import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface User {
        id?: string;
        username?: string | null;
        displayName?: string | null;
    }

    interface Session {
        accessToken?: string;
        user: {
            id: string;
            username?: string | null;
            displayName?: string | null;
        } & DefaultSession['user'];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken?: string;
        providerAccountId?: string;
        username?: string | null;
        displayName?: string | null;
        picture?: string | null;
    }
}
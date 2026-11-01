import NextAuth, { NextAuthOptions } from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";

async function refreshAccessToken(token: any) {
    try {
        const url = "https://id.twitch.tv/oauth2/token";
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.TWITCH_CLIENT_ID!,
                client_secret: process.env.TWITCH_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
        });

        const refreshedTokens = await response.json();
        if (!response.ok) throw refreshedTokens;

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        TwitchProvider({
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid user:read:email user:read:follows",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            // 1. Első bejelentkezéskor
            if (account && user) {
                let realLogin = user.name;

                // Lekérjük a pontos, nyers login nevet a Twitch API-tól (mert a NextAuth alapból a Display Name-t adja)
                try {
                    const res = await fetch('https://api.twitch.tv/helix/users', {
                        headers: {
                            'Client-ID': process.env.TWITCH_CLIENT_ID!,
                            'Authorization': `Bearer ${account.access_token}`
                        }
                    });
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        realLogin = data.data[0].login;
                    }
                } catch (e) {
                    console.error("Nem sikerült lekérni a valós login nevet", e);
                }

                return {
                    ...token,
                    accessToken: account.access_token,
                    expiresAt: account.expires_at,
                    refreshToken: account.refresh_token,
                    id: user.id,
                    username: realLogin, // A VALÓS (kisbetűs) login név (pl. szbalesz)
                    displayName: user.name, // A megjelenített név (pl. كا)
                };
            }

            // 2. Ha a token még érvényes
            if (Date.now() < (token.expiresAt as number) * 1000 - 5 * 60 * 1000) {
                return token;
            }

            // 3. Ha lejárt, frissítjük
            return refreshAccessToken(token);
        },
        async session({ session, token }: any) {
            session.user.id = token.id;
            session.user.username = token.username; // Átadjuk a kliensnek a pontos login nevet
            session.user.displayName = token.displayName;
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
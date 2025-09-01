// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { eq, and } from 'drizzle-orm';
import db from '../database';
import { users, oauthProviders } from '../database/schema';
import { JWTPayload } from '../types'; // Import from centralized types instead

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    },
    async (payload: JWTPayload, done) => {
      try {
        const user = await db.select()
          .from(users)
          .where(and(eq(users.id, payload.id), eq(users.isActive, true)))
          .limit(1);

        if (user.length) {
          return done(null, {
            id: user[0].id,
            email: user[0].email,
            username: user[0].username,
            role: user[0].role || 'user', // Fixed: Handle nullable role
            firstName: user[0].firstName,
            lastName: user[0].lastName,
            avatar: user[0].avatar,
            isActive: user[0].isActive || true,
          });
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google account
        const existingProvider = await db.select()
          .from(oauthProviders)
          .innerJoin(users, eq(oauthProviders.userId, users.id))
          .where(
            and(
              eq(oauthProviders.provider, 'google'),
              eq(oauthProviders.providerId, profile.id)
            )
          )
          .limit(1);

        if (existingProvider.length) {
          // Update tokens
          await db.update(oauthProviders)
            .set({
              accessToken,
              refreshToken,
              tokenExpires: refreshToken ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
              updatedAt: new Date(),
            })
            .where(eq(oauthProviders.id, existingProvider[0].oauth_providers.id));

          // Return user with proper type conversion
          const dbUser = existingProvider[0].users;
          return done(null, {
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role || 'user', // Fixed: Handle nullable role
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            avatar: dbUser.avatar,
            isActive: dbUser.isActive || true,
          });
        }

        // Check if user exists with same email
        let user;
        if (profile.emails && profile.emails.length > 0) {
          const existingUser = await db.select()
            .from(users)
            .where(eq(users.email, profile.emails[0].value))
            .limit(1);

          if (existingUser.length) {
            user = existingUser[0];
          }
        }

        // Create new user if doesn't exist
        if (!user) {
          const [newUser] = await db.insert(users)
            .values({
              email: profile.emails?.[0]?.value || `${profile.id}@google.oauth`,
              username: profile.displayName?.replace(/\s+/g, '_').toLowerCase() || `user_${profile.id}`,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: true,
              isActive: true,
              role: 'user', // Set default role explicitly
            })
            .returning();
          user = newUser;
        }

        // Create OAuth provider record
        await db.insert(oauthProviders)
          .values({
            userId: user.id,
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            accessToken,
            refreshToken,
            tokenExpires: refreshToken ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
          });

        // Return user with proper type conversion
        return done(null, {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role || 'user', // Fixed: Handle nullable role
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isActive: user.isActive || true,
        });
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// GitHub OAuth Strategy
interface GitHubProfileEmail {
  value: string;
  verified?: boolean;
  primary?: boolean;
}

interface GitHubProfilePhoto {
  value: string;
}

interface GitHubProfile {
  id: string;
  username?: string;
  displayName?: string;
  emails?: GitHubProfileEmail[];
  photos?: GitHubProfilePhoto[];
}

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: GitHubProfile,
      done: (error: any, user?: any) => void
    ) => {
      try {
        // Check if user already exists with this GitHub account
        const existingProvider = await db.select()
          .from(oauthProviders)
          .innerJoin(users, eq(oauthProviders.userId, users.id))
          .where(
            and(
              eq(oauthProviders.provider, 'github'),
              eq(oauthProviders.providerId, profile.id)
            )
          )
          .limit(1);

        if (existingProvider.length) {
          // Update tokens
          await db.update(oauthProviders)
            .set({
              accessToken,
              refreshToken,
              tokenExpires: refreshToken ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
              updatedAt: new Date(),
            })
            .where(eq(oauthProviders.id, existingProvider[0].oauth_providers.id));

          // Return user with proper type conversion
          const dbUser = existingProvider[0].users;
          return done(null, {
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role || 'user', // Fixed: Handle nullable role
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            avatar: dbUser.avatar,
            isActive: dbUser.isActive || true,
          });
        }

        // Check if user exists with same email
        let user: any;
        if (profile.emails && profile.emails.length > 0) {
          const existingUser = await db.select()
            .from(users)
            .where(eq(users.email, profile.emails[0].value))
            .limit(1);

          if (existingUser.length) {
            user = existingUser[0];
          }
        }

        // Create new user if doesn't exist
        if (!user) {
          const [newUser] = await db.insert(users)
            .values({
              email: profile.emails?.[0]?.value || `${profile.username}@github.oauth`,
              username: profile.username || `user_${profile.id}`,
              firstName: profile.displayName?.split(' ')[0],
              lastName: profile.displayName?.split(' ').slice(1).join(' '),
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: true,
              isActive: true,
              role: 'user', // Set default role explicitly
            })
            .returning();
          user = newUser;
        }

        // Create OAuth provider record
        await db.insert(oauthProviders)
          .values({
            userId: user.id,
            provider: 'github',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            accessToken,
            refreshToken,
            tokenExpires: refreshToken ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
          });

        // Return user with proper type conversion
        return done(null, {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role || 'user', // Fixed: Handle nullable role
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isActive: user.isActive || true,
        });
      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize/deserialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user.length) {
      done(null, {
        id: user[0].id,
        email: user[0].email,
        username: user[0].username,
        role: user[0].role || 'user', // Fixed: Handle nullable role
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        avatar: user[0].avatar,
        isActive: user[0].isActive || true,
      });
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, null);
  }
});

export default passport;

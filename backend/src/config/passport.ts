import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { prisma } from './db';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuración de Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(new Error('No se encontró email de Google'));
        }

        // Buscar si ya existe el AuthProvider
        const authProvider = await prisma.authProvider.findUnique({
          where: {
            provider_providerId: {
              provider: 'google',
              providerId: profile.id,
            },
          },
          include: { user: true },
        });

        if (authProvider) {
          return done(null, authProvider.user);
        }

        // Si no existe el proveedor, buscamos si ya existe el usuario por email
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Crear nuevo usuario si no existe
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || 'Usuario de Google',
              avatarUrl: profile.photos?.[0].value,
            },
          });
        }

        // Vincular el AuthProvider
        await prisma.authProvider.create({
          data: {
            provider: 'google',
            providerId: profile.id,
            userId: user.id,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Configuración de Facebook
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'picture.type(large)'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        // En Facebook el email puede ser null si el usuario no lo compartió o si usó teléfono
        const fallbackEmail = email || `${profile.id}@facebook.dummy.com`;

        // Buscar si ya existe el AuthProvider
        const authProvider = await prisma.authProvider.findUnique({
          where: {
            provider_providerId: {
              provider: 'facebook',
              providerId: profile.id,
            },
          },
          include: { user: true },
        });

        if (authProvider) {
          return done(null, authProvider.user);
        }

        // Si no existe el proveedor, buscamos si ya existe el usuario por email
        let user = await prisma.user.findUnique({ where: { email: fallbackEmail } });

        if (!user) {
          // Crear nuevo usuario
          user = await prisma.user.create({
            data: {
              email: fallbackEmail,
              name: profile.displayName || 'Usuario de Facebook',
              avatarUrl: profile.photos?.[0].value,
            },
          });
        }

        // Vincular el AuthProvider
        await prisma.authProvider.create({
          data: {
            provider: 'facebook',
            providerId: profile.id,
            userId: user.id,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;

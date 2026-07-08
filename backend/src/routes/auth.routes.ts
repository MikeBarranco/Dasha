import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import passport from 'passport';
import { AuthService } from '../services/auth.service';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);

// === GOOGLE OAUTH ===
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const user = req.user as any;
    const token = AuthService.generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    // Redirigir al frontend con el token en la URL
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// === FACEBOOK OAUTH ===
router.get('/facebook', passport.authenticate('facebook'));

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const user = req.user as any;
    const token = AuthService.generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    // Redirigir al frontend con el token en la URL
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

export default router;

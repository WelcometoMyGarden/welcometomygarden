import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
// import passport from 'passport';
// import { Strategy } from 'passport-jwt';
import bodyParser from 'body-parser';
import session from 'express-session';
import sessionFileStore from 'session-file-store';
import * as sapper from '@sapper/server';
import dotenv from 'dotenv';

dotenv.config();

const FileStore = sessionFileStore(session);

const { PORT, NODE_ENV, SESSION_SECRET } = process.env;
const dev = NODE_ENV === 'development';

/*
passport.use(
  new Strategy(
    {
      clientID: 'someClientID',
      clientSecret: CLIENT_SECRET,
      callbackURL: dev
        ? 'http://localhost:3000/auth/callback'
        : `${PRODUCTION_API_URL}/auth/callback`
    },
    (accessToken, refreshToken, profile, cb) => {
      // console.log('success');
      return cb(null, profile);
    }
  )
);

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});
*/

polka()
  .use(bodyParser.json())
  .use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: 31536000,
        secure: dev
      },
      store: new FileStore({
        path: process.env.NOW ? `/tmp/sessions` : `.sessions`
      })
    })
  )
  .use(
    compression({ threshold: 0 }),
    sirv('static', { dev }),
    sapper.middleware({
      session: (req) => ({
        user: req.session && req.session.user
      })
    })
  )
  .listen(PORT, (err) => {
    if (err) console.log('error', err);
  });

import { pbkdf2Sync, randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import { Error } from 'mongoose';

import { Token } from '../middleware/auth';
import { User } from '../models';

export const signin = async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.sendStatus(404);
    return;
  }

  const temp = user.password.split('|');
  const encrypt = pbkdf2Sync(password, temp[1], 10000, 64, 'SHA512').toString('base64');

  if (temp[0] !== encrypt) {
    res.sendStatus(401);
    return;
  }

  const tempUser: Token = {
    _id: user._id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    email: user.email,
    name: user.name,
  };

  const accessToken = sign(tempUser, process.env.ACCESS_KEY!, {
    expiresIn: '7h',
  });
  const refreshToken = sign(tempUser, process.env.REFRESH_KEY!, {
    expiresIn: '7d',
  });

  res.status(200).send({ token: { accessToken, refreshToken } });
};

export const signup = async (req: Request, res: Response) => {
  const { name, email, password }: { name: string; email: string; password: string } = req.body;
  const salt = randomBytes(16).toString('base64');
  const user = new User({
    name,
    email,
    password: `${pbkdf2Sync(password, salt, 10000, 64, 'SHA512').toString('base64')}|${salt}`,
  });
  try {
    await user.save();
    res.sendStatus(200);
  } catch (err) {
    if (err instanceof Error.ValidationError) {
      console.error(err);
      res.status(400).send(err.message);
    } else {
      console.error(err);
      res.status(500).send(err);
    }
  }
};

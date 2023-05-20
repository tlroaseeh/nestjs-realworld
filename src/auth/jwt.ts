import { currentUser } from '@/common/decorators/user.decorator';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { sign, verify } from 'jsonwebtoken';
require('dotenv').config();

type TokenType = 'accessToken';

const common = {
    accessToken: {
        privateKey: process.env.ACCESS_TOKEN_PRIVATE_KEY,
        signOptions: {
            expiresIn: '30d',
        }
    },
}

export const generateToken = async (
    user: User,
    type: TokenType,
): Promise<string> => {
    const { privateKey, signOptions } = common[type];
    const token = await sign(
        {
            id: user.id,
        },
        privateKey,
        {
            ...signOptions,
            algorithm: 'HS256'
        }
    );
    return token;
}

export const verifyToken = async (
    token: string,
    type: TokenType,
): Promise<User> => {
    const { privateKey } = common[type];
    let currentUser;
    await verify(token, privateKey, async (err, data) => {
        if (err) return null;
        currentUser = await data;
    });
    return currentUser;
}

export const tradeToken = async (
    user: User,
    type: TokenType,
): Promise<string> => {
    const token = await generateToken(user, type);
    return token;
}
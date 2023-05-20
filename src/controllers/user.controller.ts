import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { prismaClient } from '@/common/prisma';
import { CreateUserDto, LoginUserDto, UpdateUserDto } from "@/common/dtos/user.dto";
import { RoleGuard } from "@/common/guards/role.guard";
import { currentUser } from "@/common/decorators/user.decorator";
import { tradeToken } from "@/auth/jwt";

type UserType = {
    user: User & { token: string };
}

type ProfileType = User & { following: boolean };

const u2Pt = async (user: User, myUser: User): Promise<ProfileType> => {
    const follow = await prismaClient.follows.findUnique({
        where: {
            followerId_followingId: {
                followerId: myUser.id,
                followingId: user.id,
            }
        }
    });

    return {
        ...user,
        following: !!follow,
    }
}

@Controller('')
export class UserController {
    constructor() { }

    @Post('users')
    async createUser(@Body() body: CreateUserDto): Promise<UserType> {
        const newUser = await prismaClient.user.create({
            data: {
                ...body.user,
            }
        });
        const token = await tradeToken(newUser, 'accessToken');
        return {
            user: {
                ...newUser,
                token,
            }
        };
    }

    @Post('users/login')
    async login(@Body() body: LoginUserDto): Promise<UserType> {
        const user = await prismaClient.user.findUnique({
            where: {
                email: body.user.email,
            },
        });
        if (!user) throw new NotFoundException('User not found');
        const token = await tradeToken(user, 'accessToken');
        return {
            user: {
                ...user,
                token,
            }
        };
    }

    @Get('user')
    @UseGuards(new RoleGuard())
    async getProfile(@currentUser() user: User): Promise<UserType> {
        const myUser = await prismaClient.user.findUnique({
            where: {
                id: user.id,
            },
        });
        const token = await tradeToken(myUser, 'accessToken');
        return { user: {
            ...myUser,
            token,
        } };
    }

    @Put('user')
    @UseGuards(new RoleGuard())
    async updateUser(@currentUser() user: User, @Body() body: UpdateUserDto): Promise<UserType> {
        const updatedUser = await prismaClient.user.update({
            where: {
                id: user.id,
            },
            data: {
                ...body.user
            }
        });
        const token = await tradeToken(user, 'accessToken');
        return { user: { ...updatedUser, token } };
    }

    @Get('profiles/:username')
    async getProfileByUsername(@Param('username') username: string, @currentUser() myUser: User): Promise<{ profile: ProfileType }> {
        const user = await prismaClient.user.findUnique({
            where: {
                username,
            },
        });
        return { profile: await u2Pt(user, myUser) }; 
    }

    @Post('profiles/:username/follow')
    @HttpCode(200)
    @UseGuards(new RoleGuard())
    async followUser(@currentUser() myUser: User, @Param('username') username: string): Promise<{ profile: ProfileType }> {
        const followedUser = await prismaClient.user.findUnique({
            where: {
                username,
            },
        });
        if (!followedUser) throw new NotFoundException('User not found');
        await prismaClient.follows.create({
            data: {
                followerId: myUser.id,
                followingId: followedUser.id,
            }
        });
        return {
            profile: await u2Pt(followedUser, myUser),
        };
    }

    @Delete('profiles/:username/follow')
    @UseGuards(new RoleGuard())
    async unfollowUser(@currentUser() myUser: User, @Param('username') username: string): Promise<{ profile: User }> {
        const followedUser = await prismaClient.user.findUnique({
            where: {
                username,
            },
        });
        if (!followedUser) throw new NotFoundException('User not found');
        await prismaClient.follows.delete({
            where: {
                followerId_followingId: {
                    followerId: myUser.id,
                    followingId: followedUser.id,
                }
            }
        }); 
        return { profile: await u2Pt(followedUser, myUser) };


    }

}
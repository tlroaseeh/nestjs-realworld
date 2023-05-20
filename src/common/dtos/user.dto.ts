
export class CreateUserDto {
    user: {
        email: string;
        password: string;
        username: string;
    }
}

export class LoginUserDto {
    user: {
        email: string;
        password: string;
    }
}

export class UpdateUserDto {
    user: {
        email?: string;
        password?: string;
        username?: string;
        bio?: string;
        image?: string;
    }
}
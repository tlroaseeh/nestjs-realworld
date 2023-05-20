import { verifyToken } from "@/auth/jwt";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class RoleGuard implements CanActivate {
    constructor() { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        if (!req.headers.authorization) return false;
        const token = req.headers.authorization.split(' ')[1];
        const user = await verifyToken(token, 'accessToken');
        if (user) return true;
        return false;
    }
}
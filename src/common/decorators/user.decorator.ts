import { verifyToken } from "@/auth/jwt";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";


export const currentUser = createParamDecorator(async (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.headers.authorization) return null;
    const token = req.headers.authorization.split(' ')[1];
    const user = await verifyToken(token, 'accessToken');
    return user;
})
import { prismaClient } from "@/common/prisma";
import { Controller, Get } from "@nestjs/common";
import { Tag } from "@prisma/client";

@Controller('tags')
export class TagController { 
    @Get()
    async getTags(): Promise<{tags: Tag[]}> {
        const tags = await prismaClient.tag.findMany();
        return {tags};
    }
}
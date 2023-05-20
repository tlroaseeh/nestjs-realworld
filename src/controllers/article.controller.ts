import { currentUser } from "@/common/decorators/user.decorator";
import { CreateArticleDto, GetArticlesDto, UpdateArticleDto } from "@/common/dtos/article.dto";
import { CreateCommentDto } from "@/common/dtos/comment.dto";
import { RoleGuard } from "@/common/guards/role.guard";
import { prismaClient } from "@/common/prisma";
import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Article, Comment, User } from "@prisma/client";

type ArticleType = (Omit<Article, 'tagList'> & {
        tagList: string[],
        favorited: boolean,
        favoritesCount: number,
        author: User,
});


type ArticleListType = {
    // tagList: string[] favorited: boolean favoritesCount: number author: User and other fields of Article
    articles: ArticleType[];
    articlesCount: number;
}

type CommentType = Comment & {
    author: User;
}

const a2Atype = async (article: Article, user: User): Promise<ArticleType> => {
    const favorites = await prismaClient.favorite.findMany({
        where: {
            articleId: article.id,
        },
    });
    const author = await prismaClient.user.findUnique({
        where: {
            id: article.authorId,
        },
    });
    const tagList = (await prismaClient.tagsOnArticles.findMany({
        where: {
            articleId: article.id,
        },
        include: {
            tag: true,
        },
    })).map(tagOnArticle => tagOnArticle.tag.name).sort();
    return {
        ...article,
        favorited: favorites.some(favorite => favorite.userId === user.id),
        favoritesCount: favorites.length,
        author,
        tagList,
    };
}

const getArticleList = async (articles: Article[], user: User): Promise<ArticleListType> => {
    const articlesWithInfo = await Promise.all(articles.map(async article => await a2Atype(article, user)));
    return {articles: articlesWithInfo, articlesCount: articlesWithInfo.length};
}

const c2Ctype = async (comment: Comment): Promise<CommentType> => {
    const author = await prismaClient.user.findUnique({
        where: {
            id: comment.authorId,
        },
    });
    return {
        ...comment,
        author,
    };
}

@Controller('articles')
export class ArticleController {
    @Get()
    async getArticles(@currentUser() user, @Query() query: GetArticlesDto): Promise<ArticleListType> {
        const { tag, author, favorited, limit, offset } = query;
        const articles = await prismaClient.article.findMany({
            where: {
                AND: [
                    tag ? {
                        tagList: {
                            some: {
                                tag: { name: tag }
                            }
                        }
                    } : {},
                    author ? { author: { username: author } } : {},
                    favorited ? {
                        favorites: {
                            some: {
                                user: { username: favorited }
                            }
                        }
                    } : {},
                ]
            },
            take: limit,
            skip: offset,
        });
        return await getArticleList(articles, user);
    }

    @Get('feed')
    @UseGuards(new RoleGuard())
    async getFeed(@Query() query: GetArticlesDto, @currentUser() user: User): Promise<ArticleListType> {
        const { limit, offset } = query;
        const articles = await prismaClient.article.findMany({
            where: {
                favorites: {
                    some: {
                        user: { username: user.username }
                    }
                },
            },
            take: limit,
            skip: offset,
        });
        return await getArticleList(articles, user);
    }

    @Get(':slug')
    async getArticle(@Param('slug') slug: string, @currentUser() user: User): Promise<{article: ArticleType}> {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        return {article: await a2Atype(article, user)};
    }

    @Post()
    @UseGuards(new RoleGuard())
    async createArticle(@currentUser() user: User, @Body() body: CreateArticleDto): Promise<{article: ArticleType}> {
        await Promise.all(body.article.tagList.map(async (tag) => {
            const existingTag = await prismaClient.tag.findUnique({
                where: {
                    name: tag,
                },
            });
            if (!existingTag) {
                await prismaClient.tag.create({
                    data: {
                        name: tag,
                    },
                });
            }
        }));
        const newArticle = await prismaClient.article.create({
            data: {
                ...body.article,
                tagList: {
                },
                // slug: yy-mm-dd-hh-mm-title
                slug: `${new Date().toISOString().slice(0, 16).replace(/-/g, '')}-${body.article.title.toLowerCase().replace(/ /g, '-')}`,
                author: {
                    connect: {
                        id: user.id,
                    }
                }
            }
        });
        await Promise.all(body.article.tagList.map(async (tag) => {
            const existingTag = await prismaClient.tag.findUnique({
                where: {
                    name: tag,
                },
            });
            await prismaClient.tagsOnArticles.create({
                data: {
                    articleId: newArticle.id,
                    tagId: existingTag.id,
                },
            });
        }));
        return {article: await a2Atype(newArticle, user)};
    }

    @Put(':slug')
    @UseGuards(new RoleGuard())
    async updateArticle(@currentUser() user: User, @Param('slug') slug: string, @Body() body: UpdateArticleDto): Promise<{article: ArticleType}> {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        if (user.id !== article.authorId) throw new ForbiddenException('You can only edit your own articles');
        const updatedArticle = await prismaClient.article.update({
            where: {
                slug,
            },
            data: {
                ...body.article,
            }
        });
        return {article: await a2Atype(updatedArticle, user)};
    }

    @Delete(':slug')
    @UseGuards(new RoleGuard())
    async deleteArticle(@currentUser() user: User, @Param('slug') slug: string) {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        if (user.id !== article.authorId) throw new ForbiddenException('You can only delete your own articles');
        await Promise.all([
            prismaClient.favorite.deleteMany({
                where: {
                    articleId: article.id,
                },
            }),
            prismaClient.tagsOnArticles.deleteMany({
                where: {
                    articleId: article.id,
                },
            }),

            prismaClient.comment.deleteMany({
                where: {
                    articleId: article.id,
                },
            }),

        ]);
        
        await prismaClient.article.delete({
            where: {
                id: article.id,
            },
        });
    }

    @Post(':slug/favorite')
    @UseGuards(new RoleGuard())
    async favoriteArticle(@currentUser() user: User, @Param('slug') slug: string): Promise<{article: ArticleType}> {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        if (!article) throw new ForbiddenException('Article not found');
        await prismaClient.favorite.create({
            data: {
                userId: user.id,
                articleId: article.id,
            }
        });
        return {article: await a2Atype(await prismaClient.article.findUnique({
            where: {
                slug,
            },
        }), user)}
    }

    @Delete(':slug/favorite')
    @UseGuards(new RoleGuard())
    async unfavoriteArticle(@currentUser() user: User, @Param('slug') slug: string): Promise<{article: ArticleType}> {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        if (!article) throw new ForbiddenException('Article not found');
        await prismaClient.favorite.delete({
            where: {
                userId_articleId: {
                    userId: user.id,
                    articleId: article.id,
                }
            }
        });
        return {article: await a2Atype(await prismaClient.article.findUnique({
            where: {
                slug,
            },
        }), user)}
    }

    @Post(':slug/comments')
    @UseGuards(new RoleGuard())
    async createComment(@currentUser() user: User, @Param('slug') slug: string, @Body() commentBody: CreateCommentDto): Promise<{comment: CommentType}> {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        if (!article) throw new ForbiddenException('Article not found');
        const comment = await prismaClient.comment.create({
            data: {
                body: commentBody.comment.body,
                articleId: article.id,
                authorId: user.id,
            }
        });
        return {comment: await c2Ctype(comment)};
    }

    @Get(':slug/comments')
    async getComments(@Param('slug') slug: string): Promise<{comments: CommentType[]}> {
        const article = await prismaClient.article.findUnique({
            where: {
                slug,
            },
        });
        if (!article) throw new ForbiddenException('Article not found');
        const comments = await prismaClient.comment.findMany({
            where: {
                articleId: article.id,
            }
        });
        return {
            comments: await Promise.all(comments.map(async (comment) => {
                return await c2Ctype(comment);
            }
        ))};

    }

}
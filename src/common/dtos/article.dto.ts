
export class GetArticlesDto {
    tag?: string;
    author?: string;
    favorited?: string;
    limit?: number;
    offset?: number;
}

export class CreateArticleDto {
    article: {
        title: string;
        description: string;
        body: string;
        tagList?: string[];
    }
}

export class UpdateArticleDto {
    article: {
        title?: string;
        description?: string;
        body?: string;
    }
}
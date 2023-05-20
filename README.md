
## Description

A [realworld](https://github.com/gothinkster/realworld) implementation using [Nest](https://github.com/nestjs/nest) framework and [prisma](https://www.prisma.io/) ORM.


## Installation

1. Clone this repository
2. Install dependencies using `yarn install`
3. Create a `.env` file in the root directory and add the following variables:
```sh
DATABASE_URL="your mysql database url"
ACCESS_TOKEN_PRIVATE_KEY="your private key for jwt"
```
4. Run `yarn prisma migrate dev` to create the database tables
5. Run `yarn start:dev` to start the server

## Test

keep the server running and open a new terminal and run `yarn test`
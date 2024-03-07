# Async local storage not available reproduction

## Getting started

```
pnpm install
npx prisma migrate dev
pnpm dev
```

Open `http://localhost:3000/graphql`. Run the following query:

```graphql
query Test {
  allUsers {
    id
    name
    posts {
      id
    }
  }
}
```

**Expected result**: Should log a request id both in the resolver and in the `$on('query')` handler.

**Actual result**:

```
[Nest] 14341  - 03/07/2024, 3:02:09 PM     LOG [UserResolver] allUsers, requestId: 'pg5gd36s'
[Nest] 14341  - 03/07/2024, 3:02:09 PM     LOG [PrismaService] handler, requestId: 'undefined'
[Nest] 14341  - 03/07/2024, 3:02:09 PM     LOG [PrismaService] handler, requestId: 'undefined'
[Nest] 14341  - 03/07/2024, 3:02:09 PM     LOG [PrismaService] handler, requestId: 'undefined'
```

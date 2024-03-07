# Async local storage not available reproduction

Uses Nest.js and `nestjs-cls` to demonstrate how async local storage cannot be accessed in primsa's `$on('query')` handlers.

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

<details>

<summary>Diff of changes made to starter template</summary>

```diff
diff --git a/package.json b/package.json
index 48ddea1..a692512 100644
--- a/package.json
+++ b/package.json
@@ -48,6 +48,7 @@
     "class-validator": "0.14.1",
     "graphql": "16.8.1",
     "graphql-tools": "9.0.1",
+    "nestjs-cls": "^4.2.0",
     "reflect-metadata": "0.2.1",
     "rimraf": "5.0.5",
     "rxjs": "7.8.1"
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index ab907a3..ed7a6c4 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -35,6 +35,9 @@ dependencies:
   graphql-tools:
     specifier: 9.0.1
     version: 9.0.1(graphql@16.8.1)
+  nestjs-cls:
+    specifier: ^4.2.0
+    version: 4.2.0(@nestjs/common@10.3.3)(@nestjs/core@10.3.3)(reflect-metadata@0.2.1)(rxjs@7.8.1)
   reflect-metadata:
     specifier: 0.2.1
     version: 0.2.1
@@ -4662,6 +4665,21 @@ packages:
     resolution: {integrity: sha512-Yd3UES5mWCSqR+qNT93S3UoYUkqAZ9lLg8a7g9rimsWmYGK8cVToA4/sF3RrshdyV3sAGMXVUmpMYOw+dLpOuw==}
     dev: true

+  /nestjs-cls@4.2.0(@nestjs/common@10.3.3)(@nestjs/core@10.3.3)(reflect-metadata@0.2.1)(rxjs@7.8.1):
+    resolution: {integrity: sha512-sdvdhBmM9eb9d1URtcK7642S3ufD9ZWaKRt4Ouf1gIGmd73YniiKCxxOFwChRqDU+sr7hwxT560JaA27R/7RJQ==}
+    engines: {node: '>=16'}
+    peerDependencies:
+      '@nestjs/common': '> 7.0.0 < 11'
+      '@nestjs/core': '> 7.0.0 < 11'
+      reflect-metadata: '*'
+      rxjs: '>= 7'
+    dependencies:
+      '@nestjs/common': 10.3.3(class-validator@0.14.1)(reflect-metadata@0.2.1)(rxjs@7.8.1)
+      '@nestjs/core': 10.3.3(@nestjs/common@10.3.3)(@nestjs/platform-express@10.3.3)(reflect-metadata@0.2.1)(rxjs@7.8.1)
+      reflect-metadata: 0.2.1
+      rxjs: 7.8.1
+    dev: false
+
   /node-abort-controller@3.1.1:
     resolution: {integrity: sha512-AGK2yQKIjRuqnc6VkX2Xj5d+QW8xZ87pa1UK6yA6ouUyuxfHuMP6umE5QK7UmTeOAymo+Zx1Fxiuw9rVx8taHQ==}

diff --git a/src/app.module.ts b/src/app.module.ts
index 2a20928..3a280d7 100644
--- a/src/app.module.ts
+++ b/src/app.module.ts
@@ -1,13 +1,21 @@
-import { Module } from '@nestjs/common'
-import { GraphQLModule } from '@nestjs/graphql'
-import { PrismaService } from './prisma.service'
-import { PostResolver } from './resolvers.post'
-import { UserResolver } from './resolvers.user'
-import { join } from 'path'
-import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
+import { Module } from '@nestjs/common';
+import { GraphQLModule } from '@nestjs/graphql';
+import { PrismaService } from './prisma.service';
+import { PostResolver } from './resolvers.post';
+import { UserResolver } from './resolvers.user';
+import { join } from 'path';
+import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
+import { ClsModule } from 'nestjs-cls';

 @Module({
   imports: [
+    ClsModule.forRoot({
+      global: true,
+      middleware: {
+        mount: true,
+        generateId: true,
+      },
+    }),
     GraphQLModule.forRoot<ApolloDriverConfig>({
       driver: ApolloDriver,
       autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
diff --git a/src/prisma.service.ts b/src/prisma.service.ts
index dbca67d..cdf3a9a 100644
--- a/src/prisma.service.ts
+++ b/src/prisma.service.ts
@@ -1,8 +1,24 @@
-import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common'
-import { PrismaClient } from '@prisma/client'
+import { Injectable, OnModuleInit, INestApplication, Logger } from '@nestjs/common'
+import { Prisma, PrismaClient } from '@prisma/client'
+import { ClsService } from 'nestjs-cls'

 @Injectable()
-export class PrismaService extends PrismaClient implements OnModuleInit {
+export class PrismaService
+  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
+  implements OnModuleInit
+{
+  constructor(private cls: ClsService) {
+    super({
+      log: [{ emit: 'event', level: 'query' }]
+    })
+
+    this.$on('query', (e) => {
+      const requestId = this.cls.getId()
+      this.logger.log(`handler, requestId: '${requestId}'`)
+    })
+  }
+
+  private readonly logger = new Logger(PrismaService.name)
   async onModuleInit() {
     // Note: this is optional
     await this.$connect()
diff --git a/src/resolvers.user.ts b/src/resolvers.user.ts
index 83b1ccf..153d876 100644
--- a/src/resolvers.user.ts
+++ b/src/resolvers.user.ts
@@ -10,11 +10,12 @@ import {
   InputType,
   Field,
 } from '@nestjs/graphql'
-import { Inject } from '@nestjs/common'
+import { Inject, Logger } from '@nestjs/common'
 import { Post } from './post'
 import { User } from './user'
 import { PrismaService } from './prisma.service'
 import { PostCreateInput } from './resolvers.post'
+import { ClsService } from 'nestjs-cls'

 @InputType()
 class UserUniqueInput {
@@ -39,7 +40,9 @@ class UserCreateInput {

 @Resolver(User)
 export class UserResolver {
-  constructor(@Inject(PrismaService) private prismaService: PrismaService) {}
+  constructor(@Inject(PrismaService) private prismaService: PrismaService, private cls: ClsService) {}
+
+  private readonly logger = new Logger(UserResolver.name)

   @ResolveField()
   async posts(@Root() user: User, @Context() ctx): Promise<Post[]> {
@@ -74,6 +77,8 @@ export class UserResolver {

   @Query((returns) => [User], { nullable: true })
   async allUsers(@Context() ctx) {
+    const requestId = this.cls.getId()
+    this.logger.log(`allUsers, requestId: '${requestId}'`)
     return this.prismaService.user.findMany()
   }

```

</details>

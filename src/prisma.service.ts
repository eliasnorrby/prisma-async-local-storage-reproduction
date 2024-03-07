import { Injectable, OnModuleInit, INestApplication, Logger } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { ClsService } from 'nestjs-cls'

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit
{
  constructor(private cls: ClsService) {
    super({
      log: [{ emit: 'event', level: 'query' }]
    })

    this.$on('query', (e) => {
      const requestId = this.cls.getId()
      this.logger.log(`handler, requestId: '${requestId}'`)
    })
  }

  private readonly logger = new Logger(PrismaService.name)
  async onModuleInit() {
    // Note: this is optional
    await this.$connect()
  }
}

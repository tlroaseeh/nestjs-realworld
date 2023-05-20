import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import * as Controllers from '@/controllers';

@Module({
  imports: [],
  controllers: [...Object.values(Controllers)],
  providers: [AppService],
})
export class AppModule {}

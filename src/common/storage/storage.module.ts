import { Global, Module } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';
import { StorageService } from './storage.service';

/**
 * StorageModule is marked @Global so it is available across the entire application
 * without being imported into every feature module.
 *
 * Import AppModule → StorageModule → AwsS3Service is available everywhere via StorageService.
 */
@Global()
@Module({
  providers: [AwsS3Service, StorageService],
  exports: [StorageService],
})
export class StorageModule {}

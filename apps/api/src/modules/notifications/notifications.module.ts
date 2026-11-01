import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ExpoPushClient } from '@core/push/expo-push.client';
import { HouseholdsModule } from '@modules/households/households.module';
import { DevicesController } from './controller/devices.controller';
import { DeviceToken } from './entity/device-token.entity';
import { NotificationDelivery } from './entity/notification-delivery.entity';
import { DeviceTokensService } from './service/device-tokens.service';
import { ExpoNotificationSender } from './service/expo-notification-sender';
import { NotificationSender } from './service/notification-sender';
import { PushReceiptsService } from './service/push-receipts.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([DeviceToken, NotificationDelivery]),
    HouseholdsModule,
  ],
  controllers: [DevicesController],
  providers: [
    ExpoPushClient,
    DeviceTokensService,
    ExpoNotificationSender,
    {
      provide: NotificationSender,
      useExisting: ExpoNotificationSender,
    },
    PushReceiptsService,
  ],
  exports: [NotificationSender, PushReceiptsService],
})
export class NotificationsModule {}

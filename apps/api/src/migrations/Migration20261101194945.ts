import { Migration } from '@mikro-orm/migrations';

export class Migration20261101194945 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `device_tokens` (`id` int unsigned not null auto_increment primary key, `user_id` int unsigned not null, `expo_push_token` varchar(255) not null, `platform` enum(\'ANDROID\', \'IOS\') not null, `last_seen_at` datetime not null, `revoked_at` datetime null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `device_tokens` add index `device_tokens_user_id_index`(`user_id`);');
    this.addSql('alter table `device_tokens` add unique `device_tokens_expo_push_token_unique`(`expo_push_token`);');

    this.addSql('create table `notification_deliveries` (`id` int unsigned not null auto_increment primary key, `occurrence_id` int unsigned not null, `user_id` int unsigned not null, `device_token_id` int unsigned not null, `attempt` int unsigned not null, `sent_at` datetime not null, `expo_ticket_id` varchar(64) null, `expo_receipt_status` enum(\'OK\', \'ERROR\', \'EXPIRED\') null, `error` varchar(255) null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `notification_deliveries` add index `notification_deliveries_occurrence_id_index`(`occurrence_id`);');
    this.addSql('alter table `notification_deliveries` add index `notification_deliveries_user_id_index`(`user_id`);');
    this.addSql('alter table `notification_deliveries` add index `notification_deliveries_device_token_id_index`(`device_token_id`);');
    this.addSql('alter table `notification_deliveries` add index `notification_deliveries_expo_receipt_status_sent_at_index`(`expo_receipt_status`, `sent_at`);');
    this.addSql('alter table `notification_deliveries` add unique `notification_deliveries_occurrence_id_device_token_fbeb7_unique`(`occurrence_id`, `device_token_id`, `attempt`);');

    this.addSql('alter table `device_tokens` add constraint `device_tokens_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `notification_deliveries` add constraint `notification_deliveries_occurrence_id_foreign` foreign key (`occurrence_id`) references `routine_occurrences` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `notification_deliveries` add constraint `notification_deliveries_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `notification_deliveries` add constraint `notification_deliveries_device_token_id_foreign` foreign key (`device_token_id`) references `device_tokens` (`id`) on update cascade on delete cascade;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `notification_deliveries` drop foreign key `notification_deliveries_device_token_id_foreign`;');

    this.addSql('drop table if exists `device_tokens`;');

    this.addSql('drop table if exists `notification_deliveries`;');
  }

}

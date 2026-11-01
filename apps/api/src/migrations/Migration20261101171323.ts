import { Migration } from '@mikro-orm/migrations';

export class Migration20261101171323 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `users` (`id` int unsigned not null auto_increment primary key, `email` varchar(255) not null, `password_hash` varchar(255) not null, `display_name` varchar(80) not null, `preferred_language` enum(\'fr\', \'en\') not null default \'fr\', `created_at` datetime not null, `updated_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `users` add unique `users_email_unique`(`email`);');

    this.addSql('create table `refresh_tokens` (`id` int unsigned not null auto_increment primary key, `user_id` int unsigned not null, `token_hash` varchar(64) not null, `expires_at` datetime not null, `revoked_at` datetime null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `refresh_tokens` add index `refresh_tokens_user_id_index`(`user_id`);');
    this.addSql('alter table `refresh_tokens` add unique `refresh_tokens_token_hash_unique`(`token_hash`);');

    this.addSql('alter table `refresh_tokens` add constraint `refresh_tokens_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on update cascade on delete cascade;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `refresh_tokens` drop foreign key `refresh_tokens_user_id_foreign`;');

    this.addSql('drop table if exists `users`;');

    this.addSql('drop table if exists `refresh_tokens`;');
  }

}

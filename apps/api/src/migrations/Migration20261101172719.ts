import { Migration } from '@mikro-orm/migrations';

export class Migration20261101172719 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `households` (`id` int unsigned not null auto_increment primary key, `name` varchar(80) not null, `timezone` varchar(64) not null, `created_by_id` int unsigned not null, `created_at` datetime not null, `updated_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `households` add index `households_created_by_id_index`(`created_by_id`);');

    this.addSql('create table `household_members` (`id` int unsigned not null auto_increment primary key, `household_id` int unsigned not null, `user_id` int unsigned not null, `role` enum(\'OWNER\', \'MEMBER\') not null, `joined_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `household_members` add index `household_members_household_id_index`(`household_id`);');
    this.addSql('alter table `household_members` add index `household_members_user_id_index`(`user_id`);');
    this.addSql('alter table `household_members` add unique `household_members_household_id_user_id_unique`(`household_id`, `user_id`);');

    this.addSql('create table `household_invites` (`id` int unsigned not null auto_increment primary key, `household_id` int unsigned not null, `code` varchar(16) not null, `created_by_id` int unsigned not null, `expires_at` datetime not null, `max_uses` int unsigned not null, `use_count` int unsigned not null default 0, `revoked_at` datetime null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `household_invites` add index `household_invites_household_id_index`(`household_id`);');
    this.addSql('alter table `household_invites` add unique `household_invites_code_unique`(`code`);');
    this.addSql('alter table `household_invites` add index `household_invites_created_by_id_index`(`created_by_id`);');

    this.addSql('alter table `households` add constraint `households_created_by_id_foreign` foreign key (`created_by_id`) references `users` (`id`) on update cascade;');

    this.addSql('alter table `household_members` add constraint `household_members_household_id_foreign` foreign key (`household_id`) references `households` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `household_members` add constraint `household_members_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `household_invites` add constraint `household_invites_household_id_foreign` foreign key (`household_id`) references `households` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `household_invites` add constraint `household_invites_created_by_id_foreign` foreign key (`created_by_id`) references `users` (`id`) on update cascade;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `household_members` drop foreign key `household_members_household_id_foreign`;');

    this.addSql('alter table `household_invites` drop foreign key `household_invites_household_id_foreign`;');

    this.addSql('drop table if exists `households`;');

    this.addSql('drop table if exists `household_members`;');

    this.addSql('drop table if exists `household_invites`;');
  }

}

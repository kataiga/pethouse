import { Migration } from '@mikro-orm/migrations';

export class Migration20261101181721 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `parameter_definitions` (`id` int unsigned not null auto_increment primary key, `slug` varchar(40) not null, `name` varchar(60) not null, `unit` varchar(16) not null, `decimals` int unsigned not null, `is_system` tinyint(1) not null, `household_id` int unsigned null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `parameter_definitions` add index `parameter_definitions_household_id_index`(`household_id`);');
    this.addSql('alter table `parameter_definitions` add unique `parameter_definitions_slug_household_id_unique`(`slug`, `household_id`);');

    this.addSql('create table `tank_parameter_overrides` (`id` int unsigned not null auto_increment primary key, `tank_id` int unsigned not null, `parameter_definition_id` int unsigned not null, `enabled` tinyint(1) null, `min_threshold` double null, `max_threshold` double null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `tank_parameter_overrides` add index `tank_parameter_overrides_tank_id_index`(`tank_id`);');
    this.addSql('alter table `tank_parameter_overrides` add index `tank_parameter_overrides_parameter_definition_id_index`(`parameter_definition_id`);');
    this.addSql('alter table `tank_parameter_overrides` add unique `tank_parameter_overrides_tank_id_parameter_definition_id_unique`(`tank_id`, `parameter_definition_id`);');

    this.addSql('create table `user_parameter_settings` (`id` int unsigned not null auto_increment primary key, `user_id` int unsigned not null, `tank_type` enum(\'AQUARIUM\', \'TERRARIUM\', \'PALUDARIUM\') not null, `parameter_definition_id` int unsigned not null, `enabled` tinyint(1) not null, `display_order` int unsigned not null, `min_threshold` double null, `max_threshold` double null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `user_parameter_settings` add index `user_parameter_settings_user_id_index`(`user_id`);');
    this.addSql('alter table `user_parameter_settings` add index `user_parameter_settings_parameter_definition_id_index`(`parameter_definition_id`);');
    this.addSql('alter table `user_parameter_settings` add unique `user_parameter_settings_user_id_tank_type_paramete_130ab_unique`(`user_id`, `tank_type`, `parameter_definition_id`);');

    this.addSql('alter table `parameter_definitions` add constraint `parameter_definitions_household_id_foreign` foreign key (`household_id`) references `households` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `tank_parameter_overrides` add constraint `tank_parameter_overrides_tank_id_foreign` foreign key (`tank_id`) references `tanks` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `tank_parameter_overrides` add constraint `tank_parameter_overrides_parameter_definition_id_foreign` foreign key (`parameter_definition_id`) references `parameter_definitions` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `user_parameter_settings` add constraint `user_parameter_settings_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `user_parameter_settings` add constraint `user_parameter_settings_parameter_definition_id_foreign` foreign key (`parameter_definition_id`) references `parameter_definitions` (`id`) on update cascade on delete cascade;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `tank_parameter_overrides` drop foreign key `tank_parameter_overrides_parameter_definition_id_foreign`;');

    this.addSql('alter table `user_parameter_settings` drop foreign key `user_parameter_settings_parameter_definition_id_foreign`;');

    this.addSql('drop table if exists `parameter_definitions`;');

    this.addSql('drop table if exists `tank_parameter_overrides`;');

    this.addSql('drop table if exists `user_parameter_settings`;');
  }

}

import { Migration } from '@mikro-orm/migrations';

export class Migration20261101191556 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `routine_templates` (`id` int unsigned not null auto_increment primary key, `tank_type` enum(\'AQUARIUM\', \'TERRARIUM\', \'PALUDARIUM\') not null, `name_key` varchar(120) not null, `description_key` varchar(120) not null, `default_rrule` varchar(255) not null, `is_system` tinyint(1) not null default true, `position` int not null default 0) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `routine_templates` add unique `routine_templates_tank_type_name_key_unique`(`tank_type`, `name_key`);');

    this.addSql('create table `routines` (`id` int unsigned not null auto_increment primary key, `tank_id` int unsigned not null, `name` varchar(120) not null, `description` varchar(500) null, `rrule` varchar(255) not null, `dtstart` varchar(16) not null, `is_active` tinyint(1) not null default true, `created_by_id` int unsigned not null, `reminder_repeat_minutes` int unsigned null, `reminder_max_repeats` int unsigned not null default 0, `created_at` datetime not null, `updated_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `routines` add index `routines_tank_id_index`(`tank_id`);');
    this.addSql('alter table `routines` add index `routines_created_by_id_index`(`created_by_id`);');

    this.addSql('create table `routine_occurrences` (`id` int unsigned not null auto_increment primary key, `routine_id` int unsigned not null, `scheduled_for` datetime not null, `status` enum(\'PENDING\', \'DONE\', \'SKIPPED\', \'MISSED\') not null default \'PENDING\', `completed_at` datetime null, `completed_by_id` int unsigned null, `reminders_sent` int unsigned not null default 0) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `routine_occurrences` add index `routine_occurrences_routine_id_index`(`routine_id`);');
    this.addSql('alter table `routine_occurrences` add index `routine_occurrences_completed_by_id_index`(`completed_by_id`);');
    this.addSql('alter table `routine_occurrences` add index `routine_occurrences_status_scheduled_for_index`(`status`, `scheduled_for`);');
    this.addSql('alter table `routine_occurrences` add unique `routine_occurrences_routine_id_scheduled_for_unique`(`routine_id`, `scheduled_for`);');

    this.addSql('alter table `routines` add constraint `routines_tank_id_foreign` foreign key (`tank_id`) references `tanks` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `routines` add constraint `routines_created_by_id_foreign` foreign key (`created_by_id`) references `users` (`id`) on update cascade;');

    this.addSql('alter table `routine_occurrences` add constraint `routine_occurrences_routine_id_foreign` foreign key (`routine_id`) references `routines` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `routine_occurrences` add constraint `routine_occurrences_completed_by_id_foreign` foreign key (`completed_by_id`) references `users` (`id`) on update cascade on delete set null;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `routine_occurrences` drop foreign key `routine_occurrences_routine_id_foreign`;');

    this.addSql('drop table if exists `routine_templates`;');

    this.addSql('drop table if exists `routines`;');

    this.addSql('drop table if exists `routine_occurrences`;');
  }

}

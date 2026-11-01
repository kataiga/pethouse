import { Migration } from '@mikro-orm/migrations';

export class Migration20261101174620 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `tank_subtypes` (`id` int unsigned not null auto_increment primary key, `tank_type` enum(\'AQUARIUM\', \'TERRARIUM\', \'PALUDARIUM\') not null, `slug` varchar(40) not null, `name` varchar(60) not null, `is_system` tinyint(1) not null, `household_id` int unsigned null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `tank_subtypes` add index `tank_subtypes_household_id_index`(`household_id`);');
    this.addSql('alter table `tank_subtypes` add unique `tank_subtypes_tank_type_slug_household_id_unique`(`tank_type`, `slug`, `household_id`);');

    this.addSql('create table `tanks` (`id` int unsigned not null auto_increment primary key, `household_id` int unsigned not null, `name` varchar(80) not null, `tank_type` enum(\'AQUARIUM\', \'TERRARIUM\', \'PALUDARIUM\') not null, `subtype_id` int unsigned null, `volume_liters` double null, `width_cm` double null, `height_cm` double null, `depth_cm` double null, `substrate` varchar(120) null, `started_at` date null, `description` text null, `created_at` datetime not null, `updated_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `tanks` add index `tanks_household_id_index`(`household_id`);');
    this.addSql('alter table `tanks` add index `tanks_subtype_id_index`(`subtype_id`);');

    this.addSql('alter table `tank_subtypes` add constraint `tank_subtypes_household_id_foreign` foreign key (`household_id`) references `households` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `tanks` add constraint `tanks_household_id_foreign` foreign key (`household_id`) references `households` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `tanks` add constraint `tanks_subtype_id_foreign` foreign key (`subtype_id`) references `tank_subtypes` (`id`) on update cascade on delete set null;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `tanks` drop foreign key `tanks_subtype_id_foreign`;');

    this.addSql('drop table if exists `tank_subtypes`;');

    this.addSql('drop table if exists `tanks`;');
  }

}

import { Migration } from '@mikro-orm/migrations';

export class Migration20261101183137 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `measurements` (`id` int unsigned not null auto_increment primary key, `tank_id` int unsigned not null, `parameter_definition_id` int unsigned not null, `value` double not null, `measured_at` datetime not null, `recorded_by_id` int unsigned not null, `note` varchar(500) null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `measurements` add index `measurements_tank_id_index`(`tank_id`);');
    this.addSql('alter table `measurements` add index `measurements_parameter_definition_id_index`(`parameter_definition_id`);');
    this.addSql('alter table `measurements` add index `measurements_recorded_by_id_index`(`recorded_by_id`);');
    this.addSql('alter table `measurements` add index `measurements_tank_id_parameter_definition_id_measured_at_index`(`tank_id`, `parameter_definition_id`, `measured_at`);');

    this.addSql('alter table `measurements` add constraint `measurements_tank_id_foreign` foreign key (`tank_id`) references `tanks` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `measurements` add constraint `measurements_parameter_definition_id_foreign` foreign key (`parameter_definition_id`) references `parameter_definitions` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `measurements` add constraint `measurements_recorded_by_id_foreign` foreign key (`recorded_by_id`) references `users` (`id`) on update cascade;');
  }

  override async down (): Promise<void> {
    this.addSql('drop table if exists `measurements`;');
  }

}

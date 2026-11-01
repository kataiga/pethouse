import { Migration } from '@mikro-orm/migrations';

export class Migration20261101175707 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `animal_species` (`id` int unsigned not null auto_increment primary key, `scientific_name` varchar(120) not null, `animal_group` enum(\'FISH\', \'INVERTEBRATE\', \'REPTILE\', \'AMPHIBIAN\', \'ARTHROPOD\') not null, `image_key` varchar(255) null, `min_temperature_c` double null, `max_temperature_c` double null, `min_ph` double null, `max_ph` double null, `adult_size_cm` double null, `min_tank_volume_l` double null, `temperament` enum(\'PEACEFUL\', \'SEMI_AGGRESSIVE\', \'AGGRESSIVE\') null, `is_system` tinyint(1) not null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `animal_species` add unique `animal_species_scientific_name_unique`(`scientific_name`);');

    this.addSql('create table `animal_species_names` (`id` int unsigned not null auto_increment primary key, `animal_species_id` int unsigned not null, `language` enum(\'fr\', \'en\') not null, `common_name` varchar(120) not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `animal_species_names` add index `animal_species_names_animal_species_id_index`(`animal_species_id`);');
    this.addSql('alter table `animal_species_names` add unique `animal_species_names_animal_species_id_language_unique`(`animal_species_id`, `language`);');

    this.addSql('create table `plant_species` (`id` int unsigned not null auto_increment primary key, `scientific_name` varchar(120) not null, `image_key` varchar(255) null, `light_requirement` enum(\'LOW\', \'MEDIUM\', \'HIGH\') null, `growth_rate` enum(\'SLOW\', \'MEDIUM\', \'FAST\') null, `co2required` tinyint(1) null, `placement` enum(\'FOREGROUND\', \'MIDGROUND\', \'BACKGROUND\', \'FLOATING\', \'EPIPHYTE\') null, `min_temperature_c` double null, `max_temperature_c` double null, `min_ph` double null, `max_ph` double null, `is_system` tinyint(1) not null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `plant_species` add unique `plant_species_scientific_name_unique`(`scientific_name`);');

    this.addSql('create table `plant_species_names` (`id` int unsigned not null auto_increment primary key, `plant_species_id` int unsigned not null, `language` enum(\'fr\', \'en\') not null, `common_name` varchar(120) not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `plant_species_names` add index `plant_species_names_plant_species_id_index`(`plant_species_id`);');
    this.addSql('alter table `plant_species_names` add unique `plant_species_names_plant_species_id_language_unique`(`plant_species_id`, `language`);');

    this.addSql('create table `tank_plants` (`id` int unsigned not null auto_increment primary key, `tank_id` int unsigned not null, `plant_species_id` int unsigned not null, `quantity` int unsigned not null, `added_at` date not null, `removed_at` date null, `notes` varchar(500) null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `tank_plants` add index `tank_plants_tank_id_index`(`tank_id`);');
    this.addSql('alter table `tank_plants` add index `tank_plants_plant_species_id_index`(`plant_species_id`);');

    this.addSql('create table `tank_animals` (`id` int unsigned not null auto_increment primary key, `tank_id` int unsigned not null, `animal_species_id` int unsigned not null, `quantity` int unsigned not null, `added_at` date not null, `removed_at` date null, `notes` varchar(500) null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `tank_animals` add index `tank_animals_tank_id_index`(`tank_id`);');
    this.addSql('alter table `tank_animals` add index `tank_animals_animal_species_id_index`(`animal_species_id`);');

    this.addSql('alter table `animal_species_names` add constraint `animal_species_names_animal_species_id_foreign` foreign key (`animal_species_id`) references `animal_species` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `plant_species_names` add constraint `plant_species_names_plant_species_id_foreign` foreign key (`plant_species_id`) references `plant_species` (`id`) on update cascade on delete cascade;');

    this.addSql('alter table `tank_plants` add constraint `tank_plants_tank_id_foreign` foreign key (`tank_id`) references `tanks` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `tank_plants` add constraint `tank_plants_plant_species_id_foreign` foreign key (`plant_species_id`) references `plant_species` (`id`) on update cascade;');

    this.addSql('alter table `tank_animals` add constraint `tank_animals_tank_id_foreign` foreign key (`tank_id`) references `tanks` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `tank_animals` add constraint `tank_animals_animal_species_id_foreign` foreign key (`animal_species_id`) references `animal_species` (`id`) on update cascade;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `animal_species_names` drop foreign key `animal_species_names_animal_species_id_foreign`;');

    this.addSql('alter table `tank_animals` drop foreign key `tank_animals_animal_species_id_foreign`;');

    this.addSql('alter table `plant_species_names` drop foreign key `plant_species_names_plant_species_id_foreign`;');

    this.addSql('alter table `tank_plants` drop foreign key `tank_plants_plant_species_id_foreign`;');

    this.addSql('drop table if exists `animal_species`;');

    this.addSql('drop table if exists `animal_species_names`;');

    this.addSql('drop table if exists `plant_species`;');

    this.addSql('drop table if exists `plant_species_names`;');

    this.addSql('drop table if exists `tank_plants`;');

    this.addSql('drop table if exists `tank_animals`;');
  }

}

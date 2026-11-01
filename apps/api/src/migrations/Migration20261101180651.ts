import { Migration } from '@mikro-orm/migrations';

export class Migration20261101180651 extends Migration {

  override async up (): Promise<void> {
    this.addSql('create table `tank_photos` (`id` int unsigned not null auto_increment primary key, `tank_id` int unsigned not null, `storage_key` varchar(255) not null, `content_type` varchar(100) not null, `size_bytes` int unsigned not null, `caption` varchar(200) null, `taken_at` datetime null, `uploaded_by_id` int unsigned not null, `created_at` datetime not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `tank_photos` add index `tank_photos_tank_id_index`(`tank_id`);');
    this.addSql('alter table `tank_photos` add unique `tank_photos_storage_key_unique`(`storage_key`);');
    this.addSql('alter table `tank_photos` add index `tank_photos_uploaded_by_id_index`(`uploaded_by_id`);');

    this.addSql('alter table `tank_photos` add constraint `tank_photos_tank_id_foreign` foreign key (`tank_id`) references `tanks` (`id`) on update cascade on delete cascade;');
    this.addSql('alter table `tank_photos` add constraint `tank_photos_uploaded_by_id_foreign` foreign key (`uploaded_by_id`) references `users` (`id`) on update cascade;');

    this.addSql('alter table `tanks` add `cover_photo_id` int unsigned null;');
    this.addSql('alter table `tanks` add constraint `tanks_cover_photo_id_foreign` foreign key (`cover_photo_id`) references `tank_photos` (`id`) on update cascade on delete set null;');
    this.addSql('alter table `tanks` add index `tanks_cover_photo_id_index`(`cover_photo_id`);');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `tanks` drop foreign key `tanks_cover_photo_id_foreign`;');

    this.addSql('drop table if exists `tank_photos`;');

    this.addSql('alter table `tanks` drop index `tanks_cover_photo_id_index`;');
    this.addSql('alter table `tanks` drop column `cover_photo_id`;');
  }

}

import { Migration } from '@mikro-orm/migrations';

export class Migration20261101192853 extends Migration {

  override async up (): Promise<void> {
    this.addSql('alter table `routine_occurrences` add `notified_at` datetime null;');
  }

  override async down (): Promise<void> {
    this.addSql('alter table `routine_occurrences` drop column `notified_at`;');
  }

}

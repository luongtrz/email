import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnIdToEmailMetadata1766504593000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column_id field to email_metadata
    await queryRunner.query(`
      ALTER TABLE email_metadata
      ADD COLUMN column_id UUID REFERENCES kanban_columns(id)
    `);

    // Create index for column_id
    await queryRunner.query(
      `CREATE INDEX idx_email_metadata_column_id ON email_metadata(column_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_metadata_column_id`);
    await queryRunner.query(`ALTER TABLE email_metadata DROP COLUMN IF EXISTS column_id`);
  }
}

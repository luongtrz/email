import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKanbanColumns1766504592000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create kanban_columns table
    await queryRunner.query(`
      CREATE TABLE kanban_columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        status VARCHAR NOT NULL,
        gmail_label_id VARCHAR,
        gmail_label_name VARCHAR,
        color VARCHAR NOT NULL,
        icon VARCHAR NOT NULL,
        "order" INTEGER NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX idx_kanban_columns_user_id ON kanban_columns(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_kanban_columns_user_order ON kanban_columns(user_id, "order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kanban_columns_user_order`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kanban_columns_user_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS kanban_columns`);
  }
}

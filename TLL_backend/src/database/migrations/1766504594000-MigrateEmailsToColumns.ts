import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateEmailsToColumns1766504594000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // For each user, create default columns if they don't exist
    await queryRunner.query(`
      INSERT INTO kanban_columns (user_id, title, status, color, icon, "order", is_system)
      SELECT DISTINCT
        em.user_id,
        CASE
          WHEN em.status = 'INBOX' THEN 'Inbox'
          WHEN em.status = 'TODO' THEN 'To Do'
          WHEN em.status = 'IN_PROGRESS' THEN 'In Progress'
          WHEN em.status = 'DONE' THEN 'Done'
          WHEN em.status = 'SNOOZED' THEN 'Snoozed'
        END as title,
        em.status,
        CASE
          WHEN em.status = 'INBOX' THEN '#3B82F6'
          WHEN em.status = 'TODO' THEN '#F59E0B'
          WHEN em.status = 'IN_PROGRESS' THEN '#10B981'
          WHEN em.status = 'DONE' THEN '#8B5CF6'
          WHEN em.status = 'SNOOZED' THEN '#6B7280'
        END as color,
        CASE
          WHEN em.status = 'INBOX' THEN 'inbox'
          WHEN em.status = 'TODO' THEN 'clipboard-list'
          WHEN em.status = 'IN_PROGRESS' THEN 'clock'
          WHEN em.status = 'DONE' THEN 'check-circle'
          WHEN em.status = 'SNOOZED' THEN 'moon'
        END as icon,
        CASE
          WHEN em.status = 'INBOX' THEN 0
          WHEN em.status = 'TODO' THEN 1
          WHEN em.status = 'IN_PROGRESS' THEN 2
          WHEN em.status = 'DONE' THEN 3
          WHEN em.status = 'SNOOZED' THEN 4
        END as "order",
        em.status = 'SNOOZED' as is_system
      FROM email_metadata em
      WHERE NOT EXISTS (
        SELECT 1 FROM kanban_columns kc
        WHERE kc.user_id = em.user_id AND kc.status = em.status
      )
    `);

    // Assign emails to their corresponding columns
    await queryRunner.query(`
      UPDATE email_metadata em
      SET column_id = kc.id
      FROM kanban_columns kc
      WHERE em.user_id = kc.user_id
        AND em.status = kc.status
        AND em.column_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE email_metadata SET column_id = NULL`);
    await queryRunner.query(`DELETE FROM kanban_columns`);
  }
}

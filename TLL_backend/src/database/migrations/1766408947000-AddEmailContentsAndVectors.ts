import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailContentsAndVectors1766408947000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Create email_contents table
    await queryRunner.query(`
      CREATE TABLE email_contents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_id VARCHAR NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        body_preview TEXT NOT NULL,
        "from" JSONB,
        "to" TEXT[],
        date TIMESTAMPTZ NOT NULL,
        embedding vector(768),
        embedding_model VARCHAR,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(email_id, user_id)
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX idx_email_contents_email_id ON email_contents(email_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_email_contents_user_id ON email_contents(user_id)`,
    );

    // Create vector index for similarity search (IVFFlat for speed)
    // Note: IVFFlat index requires training data, so we'll create it after some data is inserted
    await queryRunner.query(`
      CREATE INDEX email_contents_embedding_idx
      ON email_contents
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS email_contents_embedding_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_contents_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_contents_email_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_contents`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
  }
}

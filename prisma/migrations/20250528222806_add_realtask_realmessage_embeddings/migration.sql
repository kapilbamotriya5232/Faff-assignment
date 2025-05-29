-- AlterTable
ALTER TABLE "RealMessage" ADD COLUMN     "embedding" vector(384);

-- AlterTable
ALTER TABLE "RealTask" ADD COLUMN     "embedding" vector(384);



-- For RealTask embeddings
CREATE INDEX IF NOT EXISTS idx_realtask_embedding ON "RealTask" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- For RealMessage embeddings
CREATE INDEX IF NOT EXISTS idx_realmessage_embedding ON "RealMessage" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 200);
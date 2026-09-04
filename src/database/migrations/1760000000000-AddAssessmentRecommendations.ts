import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssessmentRecommendations1760000000000 implements MigrationInterface {
  name = 'AddAssessmentRecommendations1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "automatic_recommendation" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_assessments" ADD COLUMN IF NOT EXISTS "doctor_recommendation" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patient_assessments" DROP COLUMN IF EXISTS "doctor_recommendation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_assessments" DROP COLUMN IF EXISTS "automatic_recommendation"`,
    );
  }
}

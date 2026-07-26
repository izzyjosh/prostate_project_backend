import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_JOB_NAMES,
} from '../../common/constants/queue.constant';
import { env } from '../../config/env';
import { MailService } from './mail.service';
import { verifyEmailTemplate } from './templates/verify-email.template';

@Processor(QUEUE_NAMES.EMAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case QUEUE_JOB_NAMES.EMAIL.VERIFY_EMAIL:
        await this.handleVerifyEmail(job.data);
        break;
      default:
        this.logger.warn(`No handler for job name: ${job.name}`);
    }
  }

  async handleVerifyEmail(data: { to: string; token: string }) {
    const { to, token } = data;
    const verificationUrl = new URL('/api/auth/verify-email', env.APP_URL);
    verificationUrl.searchParams.set('token', token);

    await this.mailService.sendEmail({
      to,
      subject: 'Verify Your Email',
      html: verifyEmailTemplate(verificationUrl.toString()),
    });
  }
}

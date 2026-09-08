import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_JOB_NAMES,
} from '../../common/constants/queue.constant';
import { Resend } from 'resend';
import { env } from '../../config/env';
import { SendMail } from './interfaces/mail.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(@InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue) {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async queueVerificationEmail(to: string, token: string) {
    try {
      await this.emailQueue.add(QUEUE_JOB_NAMES.EMAIL.VERIFY_EMAIL, {
        to,
        token,
      });
      this.logger.log('Verification email added to queue successfully');
    } catch (error) {
      this.logger.error('Error adding verification email to queue', error);
      throw error;
    }
  }

  async notifyAdminsOfPendingClinician(user: User) {
    try {
      await this.emailQueue.add(
        QUEUE_JOB_NAMES.EMAIL.NOTIFY_ADMIN_PENDING_CLINICIAN,
        {
          user,
        },
      );
      this.logger.log('Admin notification email sent successfully');
    } catch (error) {
      this.logger.error(
        'Error adding pending clinician notification to queue',
        error,
      );
      throw error;
    }
  }

  async sendEmail(data: SendMail) {
    try {
      const { error } = await this.resend.emails.send({
        from: env.RESEND_FROM,
        ...data,
      });
      if (error) {
        throw new Error(error.message);
      }
      this.logger.log('Email sent successfully');
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  QUEUE_JOB_NAMES,
} from '../../common/constants/queue.constant';
import * as nodemailer from 'nodemailer';
import { nodemailerConfig } from '../../config/nodemailer.config';
import { SendMail } from './interfaces/mail.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(@InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue) {
    this.transporter = nodemailer.createTransport(nodemailerConfig);
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
      await this.transporter.sendMail({
        from: nodemailerConfig.auth.user,
        ...data,
      });
      this.logger.log('Email sent successfully');
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
    }
  }
}

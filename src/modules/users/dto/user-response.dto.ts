import { UserRole } from '../entities/user.entity';

export interface CurrentUserResponse {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  occupation?: string;
  bloodGroup?: string;
  knownConditions?: string[];

  profile?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    gender: string;
    dateOfBirth: Date;
  };

  clinicianProfile?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    specialty: string;
    hospital: string;
    licenseNumber: string;
  };
}

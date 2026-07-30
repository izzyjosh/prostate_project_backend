export interface CurrentUserData {
  sub: string;
  email: string;
  role: 'patient' | 'admin' | 'clinician';
}

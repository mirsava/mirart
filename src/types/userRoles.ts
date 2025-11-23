export enum UserRole {
  BUYER = 'buyer',
  ARTIST = 'artist',
  SITE_ADMIN = 'site_admin',
}

export type UserRoleType = UserRole.BUYER | UserRole.ARTIST | UserRole.SITE_ADMIN;


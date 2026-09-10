import { GetUserDto } from './GetUserDto';

export interface GetUserByIdDto extends GetUserDto {
  profileImage?: string;
  identificationImageFront?: string;
  identificationImageBack?: string;
}
import { PartialType } from '@nestjs/mapped-types';
import { CreatePlantaoDto } from './create-plantao.dto';

export class UpdatePlantaoDto extends PartialType(CreatePlantaoDto) {}

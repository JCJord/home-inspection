import { PartialType } from '@nestjs/mapped-types';
import { CreateFindingDto } from './create-finding.dto';

export class UpdateFindingDto extends PartialType(CreateFindingDto) {}

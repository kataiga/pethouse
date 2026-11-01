import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { CurrentTank } from '@core/tanks/current-tank.decorator';
import { TankScoped } from '@core/tanks/tank-scoped.decorator';
import { User } from '@modules/users/entity/user.entity';
import { PhotoUploadResponseDto } from '../dto/photo-upload-response.dto';
import { RegisterPhotoDto } from '../dto/register-photo.dto';
import { RequestPhotoUploadDto } from '../dto/request-photo-upload.dto';
import { TankPhotoResponseDto } from '../dto/tank-photo-response.dto';
import { UpdatePhotoDto } from '../dto/update-photo.dto';
import { Tank } from '../entity/tank.entity';
import { TankPhotosService } from '../service/tank-photos.service';

@ApiTags('tanks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({
  type: ErrorResponseDto,
  description: 'Unknown tank or photo, or the caller is not a member of the household.',
})
@TankScoped()
@Controller('tanks/:tankId/photos')
export class TankPhotosController {
  constructor (private readonly tankPhotosService: TankPhotosService) {}

  @Post('upload-url')
  @ApiOperation({
    summary: 'Step 1 of 2: get a pre-signed URL to PUT the image to. The image never transits through the API.',
  })
  @ApiCreatedResponse({ type: PhotoUploadResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async prepareUpload (@CurrentTank() tank: Tank, @Body() dto: RequestPhotoUploadDto): Promise<PhotoUploadResponseDto> {
    const prepared = await this.tankPhotosService.prepareUpload(tank, dto);

    return new PhotoUploadResponseDto(prepared.uploadUrl, prepared.storageKey, prepared.expiresAt);
  }

  @Post()
  @ApiOperation({ summary: 'Step 2 of 2: register an uploaded image. Verifies the object is in the bucket.' })
  @ApiCreatedResponse({ type: TankPhotoResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Already registered.',
  })
  async register (
    @CurrentUser() user: User,
    @CurrentTank() tank: Tank,
    @Body() dto: RegisterPhotoDto,
  ): Promise<TankPhotoResponseDto> {
    const photo = await this.tankPhotosService.register(tank, user, dto);

    return new TankPhotoResponseDto(photo, this.tankPhotosService.urlOf(photo));
  }

  @Get()
  @ApiOperation({ summary: 'Photos of a tank, newest first, with their public URLs.' })
  @ApiOkResponse({ type: [TankPhotoResponseDto] })
  async list (@CurrentTank() tank: Tank): Promise<TankPhotoResponseDto[]> {
    const photos = await this.tankPhotosService.list(tank);

    return photos.map((photo) => new TankPhotoResponseDto(photo, this.tankPhotosService.urlOf(photo)));
  }

  @Patch(':photoId')
  @ApiOperation({ summary: 'Change the caption or the date a photo was taken.' })
  @ApiOkResponse({ type: TankPhotoResponseDto })
  async update (
    @CurrentTank() tank: Tank,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Body() dto: UpdatePhotoDto,
  ): Promise<TankPhotoResponseDto> {
    const photo = await this.tankPhotosService.update(tank, photoId, dto);

    return new TankPhotoResponseDto(photo, this.tankPhotosService.urlOf(photo));
  }

  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a photo and its object. A cover photo reference is cleared.' })
  @ApiNoContentResponse()
  async remove (@CurrentTank() tank: Tank, @Param('photoId', ParseIntPipe) photoId: number): Promise<void> {
    await this.tankPhotosService.delete(tank, photoId);
  }
}

import {
  Body, Controller, Get, NotFoundException, Post,
} from '@nestjs/common';
import { ProbeDto } from './probe.dto';

/** Test-only routes exercising the global pipe and filter end to end. */
@Controller('probe')
export class ProbeController {
  @Post()
  echo (@Body() body: ProbeDto): ProbeDto {
    return body;
  }

  @Get('missing')
  missing (): never {
    throw new NotFoundException('Probe not found');
  }

  @Get('crash')
  crash (): never {
    throw new Error('secret internal detail');
  }
}

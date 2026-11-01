import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Page } from '@common/dto/paginated-response.dto';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import {
  HistoryQueryDto, MAX_HISTORY_DAYS,
} from '../dto/history-query.dto';
import { ListMeasurementsQueryDto } from '../dto/list-measurements-query.dto';
import { RecordMeasurementDto } from '../dto/record-measurement.dto';
import { ResolvedParameter } from '../dto/resolved-parameter-response.dto';
import { UpdateMeasurementDto } from '../dto/update-measurement.dto';
import { Measurement } from '../entity/measurement.entity';
import {
  HistoryPoint, MeasurementRepository,
} from '../repository/measurement.repository';
import { TankParametersService } from './tank-parameters.service';

const DEFAULT_HISTORY_DAYS = 30;
const DAY_MS = 86_400_000;

export interface HistorySeries {
  parameter: ResolvedParameter;
  from: Date;
  to: Date;
  points: HistoryPoint[];
}

function assertRange (from: Date, to: Date): void {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestException('Invalid date range');
  }

  if (from > to) {
    throw new BadRequestException('from must be before to');
  }
}

@Injectable()
export class MeasurementsService {
  constructor (
    @InjectRepository(Measurement)
    private readonly measurements: MeasurementRepository,
    private readonly tankParametersService: TankParametersService,
  ) {}

  /** Records a reading for a parameter the tank tracks for this user (400 otherwise). */
  async record (tank: Tank, user: User, dto: RecordMeasurementDto): Promise<Measurement> {
    const parameter = await this.tankParametersService.requireEnabled(tank, user, dto.parameterDefinitionId);
    const measurement = this.measurements.create({
      tank,
      definition: parameter.definition,
      value: dto.value,
      measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
      recordedBy: user,
      note: dto.note ?? null,
    });
    await this.measurements.getEntityManager().persistAndFlush(measurement);

    return measurement;
  }

  async list (tank: Tank, query: ListMeasurementsQueryDto): Promise<Page<Measurement>> {
    const [data, total] = await this.measurements.findAndCount({
      tank,
      ...(query.parameterDefinitionId ? { definition: query.parameterDefinitionId } : {}),
      ...(query.from || query.to
        ? {
          measuredAt: {
            ...(query.from ? { $gte: new Date(query.from) } : {}),
            ...(query.to ? { $lte: new Date(query.to) } : {}),
          },
        }
        : {}),
    }, {
      populate: ['definition', 'recordedBy'],
      orderBy: {
        measuredAt: 'desc',
        id: 'desc',
      },
      offset: query.offset,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** Bucketed series for a chart, with the effective thresholds so the band can be drawn. */
  async history (tank: Tank, user: User, query: HistoryQueryDto): Promise<HistorySeries> {
    const parameter = await this.tankParametersService.requireKnown(tank, user, query.parameterDefinitionId);
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - DEFAULT_HISTORY_DAYS * DAY_MS);
    assertRange(from, to);

    if (to.getTime() - from.getTime() > MAX_HISTORY_DAYS * DAY_MS) {
      throw new BadRequestException(`The range cannot exceed ${MAX_HISTORY_DAYS} days`);
    }

    return {
      parameter,
      from,
      to,
      points: await this.measurements.history(tank.id, parameter.definition.id, from, to, query.bucket),
    };
  }

  async update (tank: Tank, id: number, dto: UpdateMeasurementDto): Promise<Measurement> {
    const measurement = await this.require(tank, id);

    if (dto.value !== undefined) {
      measurement.value = dto.value;
    }

    if (dto.measuredAt !== undefined) {
      measurement.measuredAt = new Date(dto.measuredAt);
    }

    if (dto.note !== undefined) {
      measurement.note = dto.note;
    }

    await this.measurements.getEntityManager().flush();

    return measurement;
  }

  async delete (tank: Tank, id: number): Promise<void> {
    await this.measurements.getEntityManager().removeAndFlush(await this.require(tank, id));
  }

  private async require (tank: Tank, id: number): Promise<Measurement> {
    const measurement = await this.measurements.findOne({
      id,
      tank,
    }, { populate: ['definition', 'recordedBy'] });

    if (!measurement) {
      throw new NotFoundException('Measurement not found');
    }

    return measurement;
  }
}

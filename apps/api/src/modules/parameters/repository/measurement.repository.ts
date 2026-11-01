import { EntityRepository } from '@mikro-orm/mysql';
import type { Measurement } from '../entity/measurement.entity';

export interface LatestReading {
  value: number;
  measuredAt: Date;
}

export type HistoryBucket = 'hour' | 'day' | 'week';

export interface HistoryPoint {
  bucketStart: Date;
  count: number;
  min: number;
  max: number;
  avg: number;
  last: number;
}

interface LatestRow {
  parameter_definition_id: number;
  value: number | string;
  measured_at: Date | string;
}

interface HistoryRow {
  bucket_start: Date | string;
  reading_count: number | string;
  min_reading: number | string;
  max_reading: number | string;
  avg_reading: number | string;
  last_reading: number | string;
}

/** MySQL expression grouping readings into a bucket, returned as a datetime string. */
const BUCKET_EXPRESSION: Record<HistoryBucket, string> = {
  hour: 'DATE_FORMAT(`measured_at`, \'%Y-%m-%d %H:00:00\')',
  day: 'DATE_FORMAT(`measured_at`, \'%Y-%m-%d 00:00:00\')',
  // ISO weeks: WEEKDAY() is 0 on Monday.
  week: 'DATE_FORMAT(DATE_SUB(`measured_at`, INTERVAL WEEKDAY(`measured_at`) DAY), \'%Y-%m-%d 00:00:00\')',
};

/** MySQL returns DATETIME without a zone; the API stores UTC, so read it back as UTC. */
function asUtc (value: Date | string): Date {
  return value instanceof Date ? value : new Date(`${value.replace(' ', 'T')}Z`);
}

export class MeasurementRepository extends EntityRepository<Measurement> {
  /** The most recent reading of every parameter of a tank, keyed by definition id. */
  async latestPerDefinition (tankId: number): Promise<Map<number, LatestReading>> {
    const rows = await this.getEntityManager().getConnection().execute<LatestRow[]>(
      `SELECT m.parameter_definition_id, m.value, m.measured_at
       FROM measurements AS m
       WHERE m.tank_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM measurements AS n
           WHERE n.tank_id = m.tank_id
             AND n.parameter_definition_id = m.parameter_definition_id
             AND (n.measured_at > m.measured_at OR (n.measured_at = m.measured_at AND n.id > m.id))
         )`,
      [tankId],
    );

    return new Map(rows.map((row) => [row.parameter_definition_id, {
      value: Number(row.value),
      measuredAt: asUtc(row.measured_at),
    }]));
  }

  /** Readings of one parameter aggregated per bucket, oldest bucket first. */
  async history (
    tankId: number,
    definitionId: number,
    from: Date,
    to: Date,
    bucket: HistoryBucket,
  ): Promise<HistoryPoint[]> {
    // `last_reading`: GROUP_CONCAT ordered newest first, first element taken; cheaper than a
    // correlated subquery per bucket and exact for our volumes. Aliases avoid MySQL's reserved
    // window-function names (`last_value`).
    const rows = await this.getEntityManager().getConnection().execute<HistoryRow[]>(
      `SELECT bucket_start,
              COUNT(*) AS reading_count,
              MIN(value) AS min_reading,
              MAX(value) AS max_reading,
              AVG(value) AS avg_reading,
              SUBSTRING_INDEX(GROUP_CONCAT(value ORDER BY measured_at DESC, id DESC), ',', 1) AS last_reading
       FROM (
         SELECT ${BUCKET_EXPRESSION[bucket]} AS bucket_start, value, measured_at, id
         FROM measurements
         WHERE tank_id = ? AND parameter_definition_id = ? AND measured_at >= ? AND measured_at <= ?
       ) AS bucketed
       GROUP BY bucket_start
       ORDER BY bucket_start ASC`,
      [tankId, definitionId, from, to],
    );

    return rows.map((row) => ({
      bucketStart: asUtc(row.bucket_start),
      count: Number(row.reading_count),
      min: Number(row.min_reading),
      max: Number(row.max_reading),
      avg: Number(row.avg_reading),
      last: Number(row.last_reading),
    }));
  }
}

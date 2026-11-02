import type { Schemas } from '@pethouse/api-client';
import {
  error, type Fields, json, number, text,
} from './fake-http';

type TankType = Schemas['TankResponseDto']['tankType'];

type AnimalGroup = Schemas['AnimalSpeciesResponseDto']['animalGroup'];

type Kind = 'animals' | 'plants';

const NOW = '2026-11-02T08:00:00.000Z';

const TODAY = '2026-11-02';

const TANK_TYPES: readonly TankType[] = ['AQUARIUM', 'TERRARIUM', 'PALUDARIUM'];

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export const STORAGE_URL = 'http://storage.test/';

export interface FakeTank {
  id: number;
  householdId: number;
  name: string;
  tankType: TankType;
  subtypeId: number | null;
  volumeLiters: number | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  substrate: string | null;
  startedAt: string | null;
  description: string | null;
  coverPhotoId: number | null;
}

interface FakeSubtype {
  id: number;
  tankType: TankType;
  slug: string;
  name: string;
  /** Null for a seeded one. */
  householdId: number | null;
}

export interface FakePhoto {
  id: number;
  tankId: number;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedBy: number;
}

interface PendingUpload {
  tankId: number;
  contentType: string;
  sizeBytes: number;
  received: boolean;
}

export interface FakeEntry {
  id: number;
  tankId: number;
  kind: Kind;
  speciesId: number;
  quantity: number;
  addedAt: string;
  removedAt: string | null;
  notes: string | null;
}

interface FakeSpecies {
  id: number;
  kind: Kind;
  scientificName: string;
  commonName: string;
  animalGroup: AnimalGroup;
}

/** What the tank server needs from the rest of the fake API. */
export interface TankHost {
  isMember (householdId: number, userId: number): boolean;
  displayName (userId: number): string;
  nextId (): number;
}

const SEEDED_SUBTYPES: readonly [TankType, string, string][] = [
  ['AQUARIUM', 'planted', 'Planted'],
  ['AQUARIUM', 'shrimp', 'Shrimp'],
  ['TERRARIUM', 'desert', 'Desert'],
  ['PALUDARIUM', 'riparium', 'Riparium'],
];

const SEEDED_SPECIES: readonly Omit<FakeSpecies, 'id'>[] = [
  {
    kind: 'animals',
    scientificName: 'Betta splendens',
    commonName: 'Combattant',
    animalGroup: 'FISH',
  },
  {
    kind: 'animals',
    scientificName: 'Paracheirodon innesi',
    commonName: 'Néon bleu',
    animalGroup: 'FISH',
  },
  {
    kind: 'animals',
    scientificName: 'Neocaridina davidi',
    commonName: 'Crevette red cherry',
    animalGroup: 'INVERTEBRATE',
  },
  {
    kind: 'plants',
    scientificName: 'Anubias barteri var. nana',
    commonName: 'Anubias nain',
    animalGroup: 'FISH',
  },
  {
    kind: 'plants',
    scientificName: 'Microsorum pteropus',
    commonName: 'Fougère de Java',
    animalGroup: 'FISH',
  },
];

function isTankType (value: unknown): value is TankType {
  return TANK_TYPES.some((type) => type === value);
}

/**
 * The tank half of the fake API: tanks, subtypes, photos with their two-step upload, animals and
 * plants, and the catalogue. Same rules as the real one: 404 outside the caller's households, 400
 * on what the DTOs reject, an upload URL bound to the exact type and size.
 */
export class FakeTanks {
  readonly tanks: FakeTank[] = [];

  readonly subtypes: FakeSubtype[] = [];

  readonly photos: FakePhoto[] = [];

  readonly entries: FakeEntry[] = [];

  readonly species: FakeSpecies[] = [];

  /** Storage keys handed out by upload-url, until the photo is registered. */
  readonly uploads = new Map<string, PendingUpload>();

  constructor (private readonly host: TankHost) {}

  reset (): void {
    this.tanks.length = 0;
    this.subtypes.length = 0;
    this.photos.length = 0;
    this.entries.length = 0;
    this.species.length = 0;
    this.uploads.clear();
    for (const [tankType, slug, name] of SEEDED_SUBTYPES) {
      this.subtypes.push({
        id: this.host.nextId(),
        tankType,
        slug,
        name,
        householdId: null,
      });
    }
    for (const species of SEEDED_SPECIES) {
      this.species.push({
        id: this.host.nextId(),
        ...species,
      });
    }
  }

  hasTanks (householdId: number): boolean {
    return this.tanks.some((tank) => tank.householdId === householdId);
  }

  addTank (householdId: number, fields: Partial<FakeTank> & Pick<FakeTank, 'name'>): FakeTank {
    const tank: FakeTank = {
      id: this.host.nextId(),
      householdId,
      tankType: 'AQUARIUM',
      subtypeId: null,
      volumeLiters: null,
      widthCm: null,
      heightCm: null,
      depthCm: null,
      substrate: null,
      startedAt: null,
      description: null,
      coverPhotoId: null,
      ...fields,
    };
    this.tanks.push(tank);

    return tank;
  }

  addPhoto (tankId: number, uploadedBy: number, caption: string | null = null): FakePhoto {
    const id = this.host.nextId();
    const photo: FakePhoto = {
      id,
      tankId,
      storageKey: `tanks/${tankId}/photo-${id}.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: 1000,
      caption,
      uploadedBy,
    };
    this.photos.push(photo);

    return photo;
  }

  addEntry (tankId: number, kind: Kind, scientificName: string, quantity: number): FakeEntry {
    const species = this.species
      .find((candidate) => candidate.kind === kind && candidate.scientificName === scientificName);

    if (!species) {
      throw new Error(`No ${kind} species ${scientificName}`);
    }

    const entry: FakeEntry = {
      id: this.host.nextId(),
      tankId,
      kind,
      speciesId: species.id,
      quantity,
      addedAt: TODAY,
      removedAt: null,
      notes: null,
    };
    this.entries.push(entry);

    return entry;
  }

  /** The storage side of an upload: the PUT the app sends to the pre-signed URL. */
  receiveUpload (url: string, contentType: string | undefined, sizeBytes: number): number {
    const pending = this.uploads.get(url.replace(STORAGE_URL, ''));

    if (!pending || pending.contentType !== contentType || pending.sizeBytes !== sizeBytes) {
      return 403;
    }
    pending.received = true;

    return 200;
  }

  /** Routes that do not start under a household; null when the path is not a tank one. */
  route (method: string, path: string, query: URLSearchParams, fields: Fields, userId: number): Response | null {
    if (method === 'GET' && path === '/api/tank-subtypes') {
      const tankType = query.get('tankType');

      return json(200, this.subtypes
        .filter((subtype) => tankType === null || subtype.tankType === tankType)
        .filter((subtype) => subtype.householdId === null || this.host.isMember(subtype.householdId, userId))
        .sort((a, b) => Number(b.householdId === null) - Number(a.householdId === null) || a.name.localeCompare(b.name))
        .map((subtype) => this.subtypeView(subtype)));
    }

    const catalogue = /^\/api\/(animal|plant)-species$/.exec(path);

    if (method === 'GET' && catalogue) {
      return this.search(catalogue[1] === 'animal' ? 'animals' : 'plants', query);
    }

    const match = /^\/api\/tanks\/(\d+)(\/.*)?$/.exec(path);

    if (!match) {
      return null;
    }

    const tank = this.tanks.find((candidate) => candidate.id === Number(match[1]));

    if (!tank || !this.host.isMember(tank.householdId, userId)) {
      return error(404, 'Tank not found');
    }

    return this.routeTank(method, tank, match[2] ?? '', query, fields, userId);
  }

  /** `/tanks` and `/subtypes` under a household the caller belongs to; null for anything else. */
  routeHousehold (method: string, householdId: number, rest: string, fields: Fields): Response | null {
    if (rest === '/tanks' && method === 'GET') {
      return json(200, this.tanks
        .filter((tank) => tank.householdId === householdId)
        .map((tank) => this.tankView(tank)));
    }

    if (rest === '/tanks' && method === 'POST') {
      const name = text(fields.name)?.trim() ?? '';

      if (name === '' || name.length > 80 || !isTankType(fields.tankType)) {
        return error(400, 'Invalid tank');
      }

      const subtypeId = number(fields.subtypeId);

      if (subtypeId !== null && !this.subtypeFits(subtypeId, fields.tankType, householdId)) {
        return error(400, 'Unknown subtype for this tank type');
      }

      const tank = this.addTank(householdId, {
        name,
        tankType: fields.tankType,
        subtypeId,
        volumeLiters: number(fields.volumeLiters),
        widthCm: number(fields.widthCm),
        heightCm: number(fields.heightCm),
        depthCm: number(fields.depthCm),
        substrate: text(fields.substrate),
        startedAt: text(fields.startedAt),
        description: text(fields.description),
      });

      return json(201, this.tankView(tank));
    }

    if (rest === '/subtypes' && method === 'POST') {
      const name = text(fields.name)?.trim() ?? '';

      if (name === '' || !isTankType(fields.tankType)) {
        return error(400, 'Invalid subtype');
      }

      const subtype: FakeSubtype = {
        id: this.host.nextId(),
        tankType: fields.tankType,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        householdId,
      };
      this.subtypes.push(subtype);

      return json(201, this.subtypeView(subtype));
    }

    return null;
  }

  private routeTank (
    method: string,
    tank: FakeTank,
    rest: string,
    query: URLSearchParams,
    fields: Fields,
    userId: number,
  ): Response {
    if (rest === '') {
      return this.routeTankItself(method, tank, fields);
    }

    if (rest === '/photos/upload-url' && method === 'POST') {
      const contentType = text(fields.contentType) ?? '';
      const sizeBytes = number(fields.sizeBytes) ?? 0;

      if (!PHOTO_TYPES.includes(contentType) || sizeBytes < 1 || sizeBytes > MAX_PHOTO_BYTES) {
        return error(400, 'Invalid upload');
      }

      const storageKey = `tanks/${tank.id}/upload-${this.host.nextId()}.jpg`;
      this.uploads.set(storageKey, {
        tankId: tank.id,
        contentType,
        sizeBytes,
        received: false,
      });

      return json(201, {
        uploadUrl: `${STORAGE_URL}${storageKey}`,
        method: 'PUT',
        storageKey,
        expiresAt: '2026-11-02T08:05:00.000Z',
      });
    }

    if (rest === '/photos') {
      return method === 'POST' ? this.registerPhoto(tank, fields, userId) : json(200, this.photos
        .filter((photo) => photo.tankId === tank.id)
        .sort((a, b) => b.id - a.id)
        .map((photo) => this.photoView(photo)));
    }

    const photoMatch = /^\/photos\/(\d+)$/.exec(rest);

    if (photoMatch) {
      return this.routePhoto(method, tank, Number(photoMatch[1]), fields);
    }

    const entries = /^\/(animals|plants)(?:\/(\d+))?$/.exec(rest);

    if (entries) {
      const kind: Kind = entries[1] === 'animals' ? 'animals' : 'plants';

      return this.routeEntries(method, tank, kind, entries[2] === undefined ? null : Number(entries[2]), query, fields);
    }

    return error(404, 'Not found');
  }

  private routeTankItself (method: string, tank: FakeTank, fields: Fields): Response {
    if (method === 'DELETE') {
      this.tanks.splice(this.tanks.indexOf(tank), 1);

      return json(204);
    }

    if (method === 'PATCH') {
      if ('name' in fields) {
        const name = text(fields.name)?.trim() ?? '';

        if (name === '' || name.length > 80) {
          return error(400, 'Invalid name');
        }
        tank.name = name;
      }
      if ('subtypeId' in fields) {
        const subtypeId = number(fields.subtypeId);

        if (subtypeId !== null && !this.subtypeFits(subtypeId, tank.tankType, tank.householdId)) {
          return error(400, 'Unknown subtype for this tank type');
        }
        tank.subtypeId = subtypeId;
      }
      if ('coverPhotoId' in fields) {
        const coverPhotoId = number(fields.coverPhotoId);

        const ownPhoto = this.photos.some((photo) => photo.id === coverPhotoId && photo.tankId === tank.id);

        if (coverPhotoId !== null && !ownPhoto) {
          return error(400, 'Not a photo of this tank');
        }
        tank.coverPhotoId = coverPhotoId;
      }
      for (const field of ['volumeLiters', 'widthCm', 'heightCm', 'depthCm'] as const) {
        if (field in fields) {
          tank[field] = number(fields[field]);
        }
      }
      for (const field of ['substrate', 'startedAt', 'description'] as const) {
        if (field in fields) {
          tank[field] = text(fields[field]);
        }
      }
    }

    return json(200, this.tankView(tank));
  }

  private registerPhoto (tank: FakeTank, fields: Fields, userId: number): Response {
    const storageKey = text(fields.storageKey) ?? '';
    const pending = this.uploads.get(storageKey);

    if (!pending || pending.tankId !== tank.id || !pending.received) {
      return error(400, 'No uploaded file under this key');
    }
    this.uploads.delete(storageKey);

    const photo: FakePhoto = {
      id: this.host.nextId(),
      tankId: tank.id,
      storageKey,
      contentType: pending.contentType,
      sizeBytes: pending.sizeBytes,
      caption: text(fields.caption),
      uploadedBy: userId,
    };
    this.photos.push(photo);

    return json(201, this.photoView(photo));
  }

  private routePhoto (method: string, tank: FakeTank, photoId: number, fields: Fields): Response {
    const photo = this.photos.find((candidate) => candidate.id === photoId && candidate.tankId === tank.id);

    if (!photo) {
      return error(404, 'Photo not found');
    }

    if (method === 'DELETE') {
      this.photos.splice(this.photos.indexOf(photo), 1);
      if (tank.coverPhotoId === photo.id) {
        tank.coverPhotoId = null;
      }

      return json(204);
    }

    if (method === 'PATCH' && 'caption' in fields) {
      photo.caption = text(fields.caption);
    }

    return json(200, this.photoView(photo));
  }

  private routeEntries (
    method: string,
    tank: FakeTank,
    kind: Kind,
    entryId: number | null,
    query: URLSearchParams,
    fields: Fields,
  ): Response {
    if (entryId === null && method === 'GET') {
      const includeRemoved = query.get('includeRemoved') === 'true';

      return json(200, this.entries
        .filter((entry) => entry.tankId === tank.id && entry.kind === kind)
        .filter((entry) => includeRemoved || entry.removedAt === null)
        .map((entry) => this.entryView(entry)));
    }

    if (entryId === null && method === 'POST') {
      const speciesId = number(kind === 'animals' ? fields.animalSpeciesId : fields.plantSpeciesId);
      const species = this.species.find((candidate) => candidate.id === speciesId && candidate.kind === kind);
      const quantity = number(fields.quantity) ?? 0;

      if (!species || !Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
        return error(400, 'Invalid entry');
      }

      const entry: FakeEntry = {
        id: this.host.nextId(),
        tankId: tank.id,
        kind,
        speciesId: species.id,
        quantity,
        addedAt: text(fields.addedAt) ?? TODAY,
        removedAt: null,
        notes: text(fields.notes),
      };
      this.entries.push(entry);

      return json(201, this.entryView(entry));
    }

    const entry = this.entries.find((candidate) => candidate.id === entryId && candidate.tankId === tank.id
      && candidate.kind === kind);

    if (!entry) {
      return error(404, 'Entry not found');
    }

    if (method === 'DELETE') {
      this.entries.splice(this.entries.indexOf(entry), 1);

      return json(204);
    }

    if ('quantity' in fields) {
      entry.quantity = number(fields.quantity) ?? entry.quantity;
    }
    if ('removedAt' in fields) {
      entry.removedAt = text(fields.removedAt);
    }

    return json(200, this.entryView(entry));
  }

  private search (kind: Kind, query: URLSearchParams): Response {
    const term = (query.get('search') ?? '').toLowerCase();
    const group = query.get('animalGroup');
    const limit = Number(query.get('limit') ?? 20);
    const matches = this.species
      .filter((species) => species.kind === kind)
      .filter((species) => term === '' || species.scientificName.toLowerCase().includes(term)
        || species.commonName.toLowerCase().includes(term))
      .filter((species) => group === null || species.animalGroup === group)
      .sort((a, b) => a.scientificName.localeCompare(b.scientificName));
    const common = {
      commonNames: {},
      minTemperatureC: null,
      maxTemperatureC: null,
      minPh: null,
      maxPh: null,
      isSystem: true,
    };

    return json(200, {
      data: matches.slice(0, limit).map((species) => (kind === 'animals'
        ? {
          ...common,
          id: species.id,
          scientificName: species.scientificName,
          commonName: species.commonName,
          animalGroup: species.animalGroup,
          adultSizeCm: null,
          minTankVolumeL: null,
          temperament: null,
        }
        : {
          ...common,
          id: species.id,
          scientificName: species.scientificName,
          commonName: species.commonName,
          lightRequirement: null,
          growthRate: null,
          co2Required: null,
          placement: null,
        })),
      total: matches.length,
      page: 1,
      limit,
    });
  }

  private subtypeFits (subtypeId: number, tankType: TankType, householdId: number): boolean {
    return this.subtypes.some((subtype) => subtype.id === subtypeId && subtype.tankType === tankType
      && (subtype.householdId === null || subtype.householdId === householdId));
  }

  private subtypeView (subtype: FakeSubtype): Schemas['TankSubtypeResponseDto'] {
    return {
      id: subtype.id,
      tankType: subtype.tankType,
      slug: subtype.slug,
      name: subtype.name,
      isSystem: subtype.householdId === null,
    };
  }

  private tankView (tank: FakeTank): Schemas['TankResponseDto'] {
    const subtype = this.subtypes.find((candidate) => candidate.id === tank.subtypeId);
    const cover = this.photos.find((photo) => photo.id === tank.coverPhotoId);

    return {
      id: tank.id,
      householdId: tank.householdId,
      name: tank.name,
      tankType: tank.tankType,
      subtype: subtype ? this.subtypeView(subtype) : null,
      volumeLiters: tank.volumeLiters,
      widthCm: tank.widthCm,
      heightCm: tank.heightCm,
      depthCm: tank.depthCm,
      substrate: tank.substrate,
      startedAt: tank.startedAt,
      description: tank.description,
      coverPhoto: cover ? {
        id: cover.id,
        url: `${STORAGE_URL}${cover.storageKey}`,
      } : null,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  private photoView (photo: FakePhoto): Schemas['TankPhotoResponseDto'] {
    return {
      id: photo.id,
      url: `${STORAGE_URL}${photo.storageKey}`,
      contentType: photo.contentType,
      sizeBytes: photo.sizeBytes,
      caption: photo.caption,
      takenAt: null,
      uploadedBy: {
        id: photo.uploadedBy,
        displayName: this.host.displayName(photo.uploadedBy),
      },
      createdAt: NOW,
    };
  }

  private entryView (entry: FakeEntry): Schemas['TankAnimalResponseDto'] | Schemas['TankPlantResponseDto'] {
    const species = this.species.find((candidate) => candidate.id === entry.speciesId);
    const base = {
      id: entry.id,
      quantity: entry.quantity,
      addedAt: entry.addedAt,
      removedAt: entry.removedAt,
      notes: entry.notes,
    };
    const names = {
      id: entry.speciesId,
      scientificName: species?.scientificName ?? '',
      commonName: species?.commonName ?? '',
    };

    return entry.kind === 'animals'
      ? {
        ...base,
        species: {
          ...names,
          animalGroup: species?.animalGroup ?? 'FISH',
        },
      }
      : {
        ...base,
        species: {
          ...names,
          placement: null,
        },
      };
  }
}

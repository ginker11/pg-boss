declare namespace PgBoss {
  interface Db {
    executeSql(text: string, values: any[]): Promise<{ rows: any[]; rowCount: number }>;
  }

  interface DatabaseOptions {
    application_name?: string;
    database?: string;
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    schema?: string;
    ssl?: any;
    connectionString?: string;
    max?: number;
    db?: Db;
  }

  interface QueueOptions {
    uuid?: "v1" | "v4";
    monitorStateIntervalSeconds?: number;
    monitorStateIntervalMinutes?: number;
  }

  interface SchedulingOptions {
    noScheduling?: boolean;

    clockMonitorIntervalSeconds?: number;
    clockMonitorIntervalMinutes?: number;
  }

  interface MaintenanceOptions {
    noSupervisor?: boolean;

    deleteAfterSeconds?: number;
    deleteAfterMinutes?: number;
    deleteAfterHours?: number;
    deleteAfterDays?: number;

    maintenanceIntervalSeconds?: number;
    maintenanceIntervalMinutes?: number;

    archiveCompletedAfterSeconds?: number;
  }

  type ConstructorOptions =
    DatabaseOptions
      & QueueOptions
      & SchedulingOptions
      & MaintenanceOptions
      & ExpirationOptions
      & RetentionOptions
      & RetryOptions
      & JobPollingOptions
      & CompletionOptions

  interface CompletionOptions {
    onComplete?: boolean;
  }

  interface ExpirationOptions {
    expireInSeconds?: number;
    expireInMinutes?: number;
    expireInHours?: number;
  }

  interface RetentionOptions {
    retentionSeconds?: number;
    retentionMinutes?: number;
    retentionHours?: number;
    retentionDays?: number;
  }

  interface RetryOptions {
    retryLimit?: number;
    retryDelay?: number;
    retryBackoff?: boolean;
  }

  interface JobOptions {
    priority?: number;
    startAfter?: number | string | Date;
    singletonKey?: string;
    singletonSeconds?: number;
    singletonMinutes?: number;
    singletonHours?: number;
    singletonNextSlot?: boolean;
  }

  type SendOptions = JobOptions & ExpirationOptions & RetentionOptions & RetryOptions & CompletionOptions

  type ScheduleOptions = SendOptions & { tz?: string }

  interface JobPollingOptions {
    newJobCheckInterval?: number;
    newJobCheckIntervalSeconds?: number;
  }

  interface JobFetchOptions {
    teamSize?: number;
    teamConcurrency?: number;
    batchSize?: number;
    includeMetadata?: boolean;
  }

  type WorkOptions = JobFetchOptions & JobPollingOptions

  type FetchOptions = {
    includeMetadata?: boolean;
  }

  interface WorkHandler<ReqData, ResData> {
    (job: PgBoss.JobWithDoneCallback<ReqData, ResData>): Promise<ResData> | void;
  }

  interface WorkWithMetadataHandler<ReqData, ResData> {
    (job: PgBoss.JobWithMetadataDoneCallback<ReqData, ResData>): Promise<ResData> | void;
  }

  interface Request {
    name: string;
    data?: object;
    options?: SendOptions;
  }

  interface Schedule {
    name: string;
    cron: string;
    data?: object;
    options?: ScheduleOptions;
  }

  interface JobDoneCallback<T> {
    (err?: Error | null, data?: T): void;
  }

  // source (for now): https://github.com/bendrucker/postgres-interval/blob/master/index.d.ts
  interface PostgresInterval {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;

    toPostgres(): string;

    toISO(): string;
    toISOString(): string;
  }

  interface Job<T = object> {
    id: string;
    name: string;
    data: T;
  }

  interface JobWithMetadata<T = object> extends Job<T> {
    priority: number;
    state: 'created' | 'retry' | 'active' | 'completed' | 'expired' | 'cancelled' | 'failed';
    retrylimit: number;
    retrycount: number;
    retrydelay: number;
    retrybackoff: boolean;
    startafter: Date;
    // This is nullable in the schema, but by the time this type is reified,
    // it will have been set.
    startedon: Date;
    singletonkey: string | null;
    singletonon: Date | null;
    expirein: PostgresInterval;
    createdon: Date;
    completedon: Date | null;
    keepuntil: Date;
    oncomplete: boolean,
    output: object
  }

  interface JobInsert<T = object> {
    id?: string,
    name: string;
    data?: T;
    priority?: number;
    retryLimit?: number;
    retryDelay?: number;
    retryBackoff?: boolean;
    startAfter?: Date | string;    
    singletonKey?: string;
    expireInSeconds?: number;
    keepUntil?: Date | string;
    onComplete?: boolean
  }

  interface JobWithDoneCallback<ReqData, ResData> extends Job<ReqData> {
    done: JobDoneCallback<ResData>;
  }

  interface JobWithMetadataDoneCallback<ReqData, ResData> extends JobWithMetadata<ReqData> {
    done: JobDoneCallback<ResData>;
  }

  interface MonitorStates {
    all: number;
    created: number;
    retry: number;
    active: number;
    completed: number;
    expired: number;
    cancelled: number;
    failed: number;
    queues: object;
  }

  interface Worker {
    id: string,
    name: string,
    options: WorkOptions,
    state: 'created' | 'retry' | 'active' | 'completed' | 'expired' | 'cancelled' | 'failed',
    count: number,
    createdOn: Date,
    lastFetchedOn: Date,
    lastJobStartedOn: Date,
    lastJobEndedOn: Date,
    lastJobDuration: number,
    lastError: object,
    lastErrorOn: Date
  }

  interface StopOptions {
    graceful?: boolean,
    timeout?: number
  }

  interface OffWorkOptions {
    id: string
  }

}

declare class PgBoss {
  constructor(connectionString: string);
  constructor(options: PgBoss.ConstructorOptions);

  static getConstructionPlans(schema: string): string;
  static getConstructionPlans(): string;

  static getMigrationPlans(schema: string, version: string): string;
  static getMigrationPlans(schema: string): string;
  static getMigrationPlans(): string;

  static getRollbackPlans(schema: string, version: string): string;
  static getRollbackPlans(schema: string): string;
  static getRollbackPlans(): string;

  on(event: "error", handler: (error: Error) => void): void;
  off(event: "error", handler: (error: Error) => void): void;

  on(event: "maintenance", handler: () => void): void;
  off(event: "maintenance", handler: () => void): void;

  on(event: "monitor-states", handler: (monitorStates: PgBoss.MonitorStates) => void): void;
  off(event: "monitor-states", handler: (monitorStates: PgBoss.MonitorStates) => void): void;

  on(event: "wip", handler: (data: PgBoss.Worker[]) => void): void;
  off(event: "wip", handler: (data: PgBoss.Worker[]) => void): void;

  on(event: "stopped", handler: () => void): void;
  off(event: "stopped", handler: () => void): void;

  start(): Promise<PgBoss>;
  stop(options?: PgBoss.StopOptions): Promise<void>;

  send(request: PgBoss.Request): Promise<string | null>;
  send(name: string, data: object): Promise<string | null>;
  send(name: string, data: object, options: PgBoss.SendOptions): Promise<string | null>;

  sendAfter(name: string, data: object, options: PgBoss.SendOptions, date: Date): Promise<string | null>;
  sendAfter(name: string, data: object, options: PgBoss.SendOptions, dateString: string): Promise<string | null>;
  sendAfter(name: string, data: object, options: PgBoss.SendOptions, seconds: number): Promise<string | null>;

  sendOnce(name: string, data: object, options: PgBoss.SendOptions, key: string): Promise<string | null>;

  sendSingleton(name: string, data: object, options: PgBoss.SendOptions): Promise<string | null>;

  sendThrottled(name: string, data: object, options: PgBoss.SendOptions, seconds: number): Promise<string | null>;
  sendThrottled(name: string, data: object, options: PgBoss.SendOptions, seconds: number, key: string): Promise<string | null>;

  sendDebounced(name: string, data: object, options: PgBoss.SendOptions, seconds: number): Promise<string | null>;
  sendDebounced(name: string, data: object, options: PgBoss.SendOptions, seconds: number, key: string): Promise<string | null>;

  insert(jobs: PgBoss.JobInsert[]): Promise<void>;

  work<ReqData, ResData>(name: string, handler: PgBoss.WorkHandler<ReqData, ResData>): Promise<string>;
  work<ReqData, ResData>(name: string, options: PgBoss.WorkOptions & { includeMetadata: true }, handler: PgBoss.WorkWithMetadataHandler<ReqData, ResData>): Promise<string>;
  work<ReqData, ResData>(name: string, options: PgBoss.WorkOptions, handler: PgBoss.WorkHandler<ReqData, ResData>): Promise<string>;

  onComplete(name: string, handler: Function): Promise<string>;
  onComplete(name: string, options: PgBoss.WorkOptions, handler: Function): Promise<string>;

  offWork(name: string): Promise<void>;
  offWork(options: PgBoss.OffWorkOptions): Promise<void>;

  subscribe(event: string, name: string): Promise<void>;
  unsubscribe(event: string, name: string): Promise<void>;
  publish(request: Resolute.Request): Promise<string[]>;

  offComplete(name: string): Promise<void>;
  offComplete(options: PgBoss.OffWorkOptions): Promise<void>;

  fetch<T>(name: string): Promise<PgBoss.Job<T> | null>;
  fetch<T>(name: string, batchSize: number): Promise<PgBoss.Job<T>[] | null>;
  fetch<T>(name: string, batchSize: number, options: PgBoss.FetchOptions & { includeMetadata: true }): Promise<PgBoss.JobWithMetadata<T>[] | null>;
  fetch<T>(name: string, batchSize: number, options: PgBoss.FetchOptions): Promise<PgBoss.Job<T>[] | null>;

  fetchCompleted<T>(name: string): Promise<PgBoss.Job<T> | null>;
  fetchCompleted<T>(name: string, batchSize: number): Promise<PgBoss.Job<T>[] | null>;
  fetchCompleted<T>(name: string, batchSize: number, options: PgBoss.FetchOptions & { includeMetadata: true }): Promise<PgBoss.JobWithMetadata<T>[] | null>;
  fetchCompleted<T>(name: string, batchSize: number, options: PgBoss.FetchOptions): Promise<PgBoss.Job<T>[] | null>;

  cancel(id: string): Promise<void>;
  cancel(ids: string[]): Promise<void>;

  complete(id: string): Promise<void>;
  complete(id: string, data: object): Promise<void>;
  complete(ids: string[]): Promise<void>;

  fail(id: string): Promise<void>;
  fail(id: string, data: object): Promise<void>;
  fail(ids: string[]): Promise<void>;

  getQueueSize(name: string, options?: object): Promise<number>;
  getJobById(id: string): Promise<PgBoss.JobWithMetadata | null>;

  deleteQueue(name: string): Promise<void>;
  deleteAllQueues(): Promise<void>;
  clearStorage(): Promise<void>;

  archive(): Promise<void>;
  purge(): Promise<void>;
  expire(): Promise<void>;

  schedule(name: string, cron: string, data?: object, options?: PgBoss.ScheduleOptions): Promise<void>;
  unschedule(name: string): Promise<void>;
  getSchedules(): Promise<PgBoss.Schedule[]>;
}

export = PgBoss;

import dotenv from 'dotenv';
import path from 'path';
import { Collection, Db, Document, MongoClient, ObjectId } from 'mongodb';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

type ModelName =
  | 'User' | 'District' | 'AssemblyConstituency' | 'ComplaintCategory'
  | 'Application' | 'FollowUp' | 'AuditLog' | 'SystemSetting' | 'PasswordResetToken' | 'Appointment';

const objectIdModels = new Set<ModelName>([
  'User', 'ComplaintCategory', 'Application', 'FollowUp', 'AuditLog', 'SystemSetting', 'PasswordResetToken', 'Appointment'
]);

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required. Set it in backend/.env locally or in the deployment environment.');

const client = new MongoClient(uri);
let connection: Promise<Db> | null = null;

function getDb(): Promise<Db> {
  if (!connection) connection = client.connect().then(() => client.db());
  return connection;
}

const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function castValue(model: ModelName, field: string, value: any): any {
  const objectIdField =
    (field === 'id' && objectIdModels.has(model)) ||
    (model === 'Application' && ['categoryId', 'createdById'].includes(field)) ||
    (['FollowUp', 'AuditLog'].includes(model) && field === 'applicationId');
  if (!objectIdField) return value;
  if (Array.isArray(value)) return value.map(v => isObjectId(v) ? new ObjectId(v) : v);
  return isObjectId(value) ? new ObjectId(value) : value;
}

function fieldName(model: ModelName, field: string): string {
  return field === 'id' && objectIdModels.has(model) ? '_id' : field;
}

function toMongoWhere(model: ModelName, where: any = {}): any {
  if (!where || typeof where !== 'object') return where;
  const query: any = {};
  for (const [rawField, rawValue] of Object.entries(where)) {
    if (rawField === 'OR' || rawField === 'AND') {
      query[rawField === 'OR' ? '$or' : '$and'] = (rawValue as any[]).map(value => toMongoWhere(model, value));
      continue;
    }
    const field = fieldName(model, rawField);
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && !(rawValue instanceof Date) && !(rawValue instanceof ObjectId)) {
      const condition: any = rawValue;
      if ('equals' in condition) {
        const value = castValue(model, rawField, condition.equals);
        query[field] = condition.mode === 'insensitive' && typeof value === 'string'
          ? new RegExp(`^${escapeRegex(value)}$`, 'i') : value;
      } else if ('contains' in condition) {
        query[field] = new RegExp(escapeRegex(String(condition.contains)), condition.mode === 'insensitive' ? 'i' : '');
      } else if ('startsWith' in condition) {
        query[field] = new RegExp(`^${escapeRegex(String(condition.startsWith))}`, condition.mode === 'insensitive' ? 'i' : '');
      } else {
        const operators: any = {};
        if ('in' in condition) operators.$in = castValue(model, rawField, condition.in);
        if ('notIn' in condition) operators.$nin = castValue(model, rawField, condition.notIn);
        if ('not' in condition) operators.$ne = castValue(model, rawField, condition.not);
        if ('lt' in condition) operators.$lt = condition.lt;
        if ('lte' in condition) operators.$lte = condition.lte;
        if ('gt' in condition) operators.$gt = condition.gt;
        if ('gte' in condition) operators.$gte = condition.gte;
        query[field] = Object.keys(operators).length ? operators : condition;
      }
    } else {
      query[field] = castValue(model, rawField, rawValue);
    }
  }
  return query;
}

function defaults(model: ModelName, data: any): any {
  const now = new Date();
  const modelDefaults: Record<ModelName, any> = {
    User: { role: 'DATA_ENTRY', department: 'E-Sewak Tarapur Administration', isActive: true, createdAt: now, updatedAt: now },
    District: { state: 'Bihar', isActive: true, createdAt: now, updatedAt: now },
    AssemblyConstituency: { reservation: 'GEN', isActive: true, createdAt: now, updatedAt: now },
    ComplaintCategory: { isActive: true, createdAt: now, updatedAt: now },
    Application: { dateReceived: now, isUnverifiedAc: false, priority: 'NORMAL', status: 'PENDING', assignedEmployee: 'Unassigned', createdAt: now, updatedAt: now },
    FollowUp: { createdAt: now },
    AuditLog: { createdAt: now },
    SystemSetting: { key: 'default', maxUploadSizeMb: 200, updatedAt: now },
    PasswordResetToken: { createdAt: now },
    Appointment: { status: 'PENDING', createdAt: now, updatedAt: now }
  };
  const clean = Object.fromEntries(Object.entries(data || {}).filter(([, value]) => value !== undefined));
  const merged = { ...modelDefaults[model], ...clean };
  for (const [key, value] of Object.entries(merged)) merged[key] = castValue(model, key, value);
  return merged;
}

function normalize(model: ModelName, doc: any): any {
  if (!doc) return null;
  const result: any = { ...doc };
  if (objectIdModels.has(model)) {
    result.id = result._id?.toString();
    delete result._id;
  } else if (result._id) {
    result.dbId = result._id.toString();
    delete result._id;
  }
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof ObjectId) result[key] = value.toString();
  }
  return result;
}

function applySelect(value: any, select?: any): any {
  if (!select || !value) return value;
  const picked: any = {};
  for (const [key, enabled] of Object.entries(select)) if (enabled === true) picked[key] = value[key];
  return picked;
}

async function relatedOne(model: ModelName, where: any, select?: any) {
  const repository = new Repository(model);
  return repository.findFirst({ where, select });
}

async function attachIncludes(model: ModelName, item: any, include?: any): Promise<any> {
  if (!include || !item) return item;
  const out = { ...item };
  if (model === 'Application') {
    if (include.district) out.district = await relatedOne('District', { id: item.districtId }, include.district.select);
    if (include.constituency) out.constituency = item.constituencyId == null ? null : await relatedOne('AssemblyConstituency', { id: item.constituencyId }, include.constituency.select);
    if (include.category) out.category = item.categoryId == null ? null : await relatedOne('ComplaintCategory', { id: item.categoryId }, include.category.select);
    if (include.followUps) out.followUps = await new Repository('FollowUp').findMany({ where: { applicationId: item.id }, ...(include.followUps === true ? {} : include.followUps) });
    if (include.auditLogs) out.auditLogs = await new Repository('AuditLog').findMany({ where: { applicationId: item.id }, ...(include.auditLogs === true ? {} : include.auditLogs) });
  }
  if (model === 'AssemblyConstituency' && include.district) {
    out.district = await relatedOne('District', { id: item.districtId }, include.district.select);
  }
  if (model === 'District') {
    if (include.constituencies) out.constituencies = await new Repository('AssemblyConstituency').findMany({ where: { districtId: item.id } });
    if (include.applications) {
      const args = include.applications === true ? {} : include.applications;
      out.applications = await new Repository('Application').findMany({ ...args, where: { districtId: item.id, ...(args.where || {}) } });
    }
    if (include._count) out._count = {
      constituencies: await new Repository('AssemblyConstituency').count({ where: { districtId: item.id } }),
      applications: await new Repository('Application').count({ where: { districtId: item.id } })
    };
  }
  if (model === 'ComplaintCategory') {
    if (include.applications) {
      const args = include.applications === true ? {} : include.applications;
      out.applications = await new Repository('Application').findMany({ ...args, where: { categoryId: item.id, ...(args.where || {}) } });
    }
    if (include._count) out._count = { applications: await new Repository('Application').count({ where: { categoryId: item.id } }) };
  }
  return out;
}

class Repository {
  constructor(private readonly model: ModelName) {}

  private async collection(): Promise<Collection<Document>> {
    return (await getDb()).collection(this.model);
  }

  async findMany(args: any = {}): Promise<any[]> {
    const collection = await this.collection();
    let cursor = collection.find(toMongoWhere(this.model, args.where));
    const order = Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : [];
    if (order.length) {
      const sort: any = {};
      for (const part of order) for (const [key, direction] of Object.entries(part)) sort[fieldName(this.model, key)] = direction === 'desc' ? -1 : 1;
      cursor = cursor.sort(sort);
    }
    if (args.skip) cursor = cursor.skip(args.skip);
    if (args.take) cursor = cursor.limit(args.take);
    const rows = await cursor.toArray();
    return Promise.all(rows.map(async row => applySelect(await attachIncludes(this.model, normalize(this.model, row), args.include), args.select)));
  }

  async findFirst(args: any = {}): Promise<any> {
    return (await this.findMany({ ...args, take: 1 }))[0] || null;
  }

  async findUnique(args: any): Promise<any> {
    return this.findFirst(args);
  }

  async count(args: any = {}): Promise<number> {
    return (await this.collection()).countDocuments(toMongoWhere(this.model, args.where));
  }

  async create(args: any): Promise<any> {
    const collection = await this.collection();
    const data = defaults(this.model, args.data);
    const inserted = await collection.insertOne(data);
    const row = normalize(this.model, { ...data, _id: inserted.insertedId });
    return applySelect(await attachIncludes(this.model, row, args.include), args.select);
  }

  async update(args: any): Promise<any> {
    const collection = await this.collection();
    const data = { ...args.data };
    if (['User', 'District', 'AssemblyConstituency', 'ComplaintCategory', 'Application', 'SystemSetting', 'Appointment'].includes(this.model)) data.updatedAt = new Date();
    for (const [key, value] of Object.entries(data)) data[key] = castValue(this.model, key, value);
    const result = await collection.findOneAndUpdate(toMongoWhere(this.model, args.where), { $set: data }, { returnDocument: 'after' });
    if (!result) throw new Error(`${this.model} record not found`);
    const row = normalize(this.model, result);
    return applySelect(await attachIncludes(this.model, row, args.include), args.select);
  }

  async upsert(args: any): Promise<any> {
    const existing = await this.findFirst({ where: args.where });
    return existing ? this.update({ where: args.where, data: args.update, include: args.include }) : this.create({ data: args.create, include: args.include });
  }

  async delete(args: any): Promise<any> {
    const collection = await this.collection();
    const result = await collection.findOneAndDelete(toMongoWhere(this.model, args.where));
    if (!result) throw new Error(`${this.model} record not found`);
    return normalize(this.model, result);
  }

  async deleteMany(args: any = {}): Promise<{ count: number }> {
    const result = await (await this.collection()).deleteMany(toMongoWhere(this.model, args.where));
    return { count: result.deletedCount };
  }
}

export const database = {
  user: new Repository('User'),
  district: new Repository('District'),
  assemblyConstituency: new Repository('AssemblyConstituency'),
  complaintCategory: new Repository('ComplaintCategory'),
  application: new Repository('Application'),
  followUp: new Repository('FollowUp'),
  auditLog: new Repository('AuditLog'),
  systemSetting: new Repository('SystemSetting'),
  passwordResetToken: new Repository('PasswordResetToken'),
  appointment: new Repository('Appointment'),
  connect: () => getDb(),
  disconnect: () => client.close(),
  async createIndexes() {
    const db = await getDb();
    await Promise.all([
      db.collection('User').createIndex({ email: 1 }, { unique: true, name: 'User_email_key' }),
      db.collection('District').createIndex({ id: 1 }, { unique: true, name: 'District_id_key' }),
      db.collection('District').createIndex({ code: 1 }, { unique: true, name: 'District_code_key' }),
      db.collection('District').createIndex({ name: 1 }, { unique: true, name: 'District_name_key' }),
      db.collection('AssemblyConstituency').createIndex({ id: 1 }, { unique: true, name: 'AssemblyConstituency_id_key' }),
      db.collection('AssemblyConstituency').createIndex({ acNumber: 1 }, { unique: true, name: 'AssemblyConstituency_acNumber_key' }),
      db.collection('AssemblyConstituency').createIndex({ acCode: 1 }, { unique: true, name: 'AssemblyConstituency_acCode_key' }),
      db.collection('ComplaintCategory').createIndex({ name: 1 }, { unique: true, name: 'ComplaintCategory_name_key' }),
      db.collection('ComplaintCategory').createIndex({ code: 1 }, { unique: true, name: 'ComplaintCategory_code_key' }),
      db.collection('Application').createIndex({ applicationId: 1 }, { unique: true, name: 'Application_applicationId_key' }),
      db.collection('Application').createIndex({ createdById: 1, dateReceived: -1 }, { name: 'Application_operator_date_idx' }),
      db.collection('Application').createIndex({ blockLgdCode: 1, dateReceived: -1 }, { name: 'Application_block_date_idx' }),
      db.collection('SystemSetting').createIndex({ key: 1 }, { unique: true, name: 'SystemSetting_key_key' }),
      db.collection('PasswordResetToken').createIndex({ token: 1 }, { unique: true, name: 'PasswordResetToken_token_key' }),
      db.collection('PasswordResetToken').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'PasswordResetToken_expiry_ttl' }),
      db.collection('Appointment').createIndex({ operatorId: 1, createdAt: -1 }, { name: 'Appointment_operator_date_idx' }),
      db.collection('Appointment').createIndex({ status: 1, createdAt: -1 }, { name: 'Appointment_status_date_idx' })
    ]);
  }
};

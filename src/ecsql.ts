type Reference = `REFERENCE`
export type Data = "INTEGER" | "REAL" | "TEXT" | Reference;
type TypeMap = {
    INTEGER: number,
    REAL: number,
    TEXT: string,
    REFERENCE: number
};

const DEBUG_MODE = true;
export const DB_PATH = "database.sqlite3"

async function init_ecsql() {
    let existingTables: string[] = []
    const { SQLocal } = await import("sqlocal");
    let ret = new SQLocal({
        databasePath: DB_PATH,
        onInit: (sql) => { return [sql`PRAGMA foreign_keys = true`] },
    });
    let tables = await ret.sql<{ name: string }>`SELECT name FROM sqlite_master WHERE type = 'table' AND name='__entities'`
    for (let table of tables) {
        existingTables.push(table["name"])
    }
    return { existingTables, ...ret }
}

// TODO: This is a weird pattern, there's a better way to handle this
let { sql: _sql, deleteDatabaseFile: deleteDb, existingTables } = await init_ecsql()
export let deleteDatabaseFile = deleteDb;

export function sql<T extends Record<string, any>>(input: string) {
    if (DEBUG_MODE) {
        console.log(`attempting: ${input}`)
    }
    return _sql<T>(input);
}

export let tableExists = (await _sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name='__entities'`).length > 0
if (!tableExists) {
    console.log("Creating table...")
    await _sql`CREATE TABLE IF NOT EXISTS __entities (id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT)`
}

let entity_count: number = (await _sql`SELECT COUNT(*) as count FROM __entities`)[0]["count"]

export async function createEntity() {
    await _sql`INSERT INTO __entities(id) VALUES (${entity_count})`
    entity_count += 1;
    return entity_count - 1;
}

export type ComponentDataTypes = {
    [type_name: string]: Data
}

export type ComponentData<T extends ComponentDataTypes> = {
    [data_name in keyof T]: TypeMap[T[data_name]]
}

type DefaultSqLocalReturnType = Record<string, any>[];

export type Component<T extends ComponentDataTypes> = {
    init: (entity: number, data: Partial<ComponentData<T>>) => Promise<DefaultSqLocalReturnType>
    update: (entity: number, data: Partial<ComponentData<T>>) => Promise<DefaultSqLocalReturnType>
    component: string,
}

export async function createComponent<T extends ComponentDataTypes>(componentName: string, dataTypes: T): Promise<Component<T>> {
    // TODO: Skip this part if already created
    if (existingTables.includes(componentName)) {
        return { ...getComponent<T>(componentName) }
    }
    let dataInput = ""
    let foreignKeys = ""
    let references: string[] = []
    for (let name of Object.keys(dataTypes)) {
        let type = dataTypes[name]
        if (type.startsWith("REFERENCE")) {
            references.push(name)
            type = "INTEGER"
        }
        dataInput += `${name} ${type}, `
    }
    if (Object.keys(references).length != 0) {
        foreignKeys = ","
    }
    for (let ref of references) {
        foreignKeys += `FOREIGN KEY(${ref}) REFERENCES __entities(id) ON DELETE CASCADE`
    }
    let input = `CREATE TABLE IF NOT EXISTS ${componentName} (
    entity INTEGER UNIQUE PRIMARY KEY,
    ${dataInput}
    FOREIGN KEY(entity) REFERENCES __entities(id) ON DELETE CASCADE
    ${foreignKeys}
    )`
    await sql(input)

    return { ...getComponent(componentName) };
}

export function getComponent<T extends ComponentDataTypes = Record<string, Data>>(componentName: string) {
    return {
        init: async (entity: number, data: Partial<ComponentData<T>>) => {
            let keys = ""
            let values = ""
            for (let key of Object.keys(data)) {
                keys += "," + key
                let input: number | string = data[key]!;
                if (typeof data[key] === "string") {
                    input = "'" + input + "'"
                }
                values += "," + input
            }
            let input = `INSERT INTO ${componentName} (entity ${keys}) VALUES (${entity} ${values})`
            if (DEBUG_MODE) {
                console.log("SET:", input)
            }
            return await sql(input)
        },
        update: async (entity: number, data: Partial<ComponentData<T>>) => {
            let updates = ""
            for (let key of Object.keys(data)) {
                if (updates !== "") {
                    updates += "," + key
                }
                let input: number | string = data[key]!;
                if (typeof data[key] === "string") {
                    input = "'" + input + "'"
                }
                updates += `${key} = ${input}`;
            }
            let input = `UPDATE ${componentName} SET ${updates} WHERE entity = ${entity}`
            if (DEBUG_MODE) {
                console.log("UPDATE:", input)
            }
            return await sql(input)
        },
        component: componentName,
    }
}

// TODO: Take the component objects instead of strings?
export async function query(...components: string[]) {
    let base = components[0]
    let joins = ""
    for (let component of components) {
        if (component == base) {
            continue
        }
        joins += `INNER JOIN ${component} ON ${base}.entity = ${component}.entity `
    }
    let statement = `SELECT * FROM ${components[0]} ${joins}`
    return await sql(statement)
}

export async function queryEntity(component: string, entityId: number) {
    let input = `SELECT * FROM "${component}" WHERE entity = ${entityId}`
    let result = await sql(input);
    if (result.length !== 1) {
        if (result.length !== 0) {
            console.error(`ERROR: MULTIPLE ROWS FOUND IN ${component} WITH ID ${entityId}`)
        }
        return null
    }
    return result[0];
}

export async function getDataTypes<T extends Record<string, Data>>(component: string): Promise<T> {
    let types: Record<string, Data> = {};
    let input = `pragma table_info(${component})`;
    let [table_info, foreignKeys] = await Promise.all([await sql<{ name: string, type: Data }>(input), await getForeignKeys(component)]);
    let fkSet = new Set(Object.keys(foreignKeys));
    console.log(table_info)
    for (let column of table_info) {
        if (fkSet.has(column.name)) {
            types[column.name] = `REFERENCE`;
        } else {
            types[column.name] = column.type;
        }
    }
    return types as T
}

async function getForeignKeys(component: string) {
    let keys = await sql<{ table: string, from: string, to: string }>(`pragma foreign_key_list(${component})`)
    let ret: Record<string, { table: string, to: string }> = {}
    for (let key of keys) {
        ret[key.from] = { table: key.table, to: key.to }
    }
    return ret
}

export async function listComponents() {
    let components = await _sql<{ name: string, [key: string]: any }>`SELECT name FROM sqlite_master WHERE type = 'table'`
    return components.filter(component => !component.name.startsWith("__") && component.name !== "sqlite_sequence");
}

export async function removeComponent(componentName: string) {
    return await _sql`DROP TABLE ${componentName}`
}

export async function removeEntity(entityId: number) {
    await _sql`DELETE FROM __entities WHERE id = ${entityId}`
}

declare global {
    interface Window {
        createComponent: typeof createComponent
    }
}

if (DEBUG_MODE) {
    window.createComponent = createComponent
}
